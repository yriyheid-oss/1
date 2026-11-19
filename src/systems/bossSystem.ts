import type { ActSpec, BossId } from '../data/acts';
import type { DifficultyLevel } from '../data/tuning';
import type { ToolId } from '../data/tools';
import type { CatState } from './parkour';

export type BossPhase =
  | 'dormant'
  | 'patrol'
  | 'telegraph'
  | 'attack'
  | 'vulnerable'
  | 'defeated';

export interface BossAnchorState {
  id: string;
  x: number;
  y: number;
  z: number;
  cooldown: number;
}

export interface BossState {
  id: BossId;
  active: boolean;
  phase: BossPhase;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeY: number;
  homeZ: number;
  yaw: number;
  hp: number;
  maxHp: number;
  arenaRadius: number;
  phaseTimer: number;
  attackCooldown: number;
  targetX: number;
  targetZ: number;
  orbitAngle: number;
  hitFlashTimer: number;
  anchors: BossAnchorState[];
}

export interface VitalityState {
  hp: number;
  maxHp: number;
  invulnTimer: number;
  defeated: boolean;
}

export interface BossStepEvents {
  engagedNow: boolean;
  telegraphStarted: boolean;
  attackTriggered: boolean;
  staggeredNow: boolean;
  damagedBossNow: boolean;
  bossDefeatedNow: boolean;
  damagedPlayerNow: boolean;
  playerDefeatedNow: boolean;
  hitstopSec: number;
}

export function getMaxHpForDifficulty(level: DifficultyLevel): number {
  switch (level) {
    case 'relaxed':
      return 5;
    case 'challenger':
      return 3;
    case 'standard':
    default:
      return 4;
  }
}

export function createVitalityState(level: DifficultyLevel): VitalityState {
  const maxHp = getMaxHpForDifficulty(level);
  return {
    hp: maxHp,
    maxHp,
    invulnTimer: 0,
    defeated: false,
  };
}

export function applyDamageToPlayer(vitality: VitalityState, amount = 1): boolean {
  if (vitality.defeated || vitality.invulnTimer > 0) return false;
  vitality.hp = Math.max(0, vitality.hp - amount);
  vitality.invulnTimer = 1.65;
  if (vitality.hp <= 0) {
    vitality.defeated = true;
  }
  return true;
}

export function healPlayer(vitality: VitalityState, amount = 1): boolean {
  if (vitality.defeated || vitality.hp >= vitality.maxHp) return false;
  vitality.hp = Math.min(vitality.maxHp, vitality.hp + amount);
  return true;
}

export function createBossState(act: ActSpec): BossState {
  return {
    id: act.boss.id,
    active: false,
    phase: 'dormant',
    x: act.boss.x,
    y: act.boss.y,
    z: act.boss.z,
    homeX: act.boss.x,
    homeY: act.boss.y,
    homeZ: act.boss.z,
    yaw: 0,
    hp: act.boss.maxHp,
    maxHp: act.boss.maxHp,
    arenaRadius: act.boss.arenaRadius,
    phaseTimer: 0,
    attackCooldown: 2.2,
    targetX: act.boss.x,
    targetZ: act.boss.z,
    orbitAngle: 0,
    hitFlashTimer: 0,
    anchors: act.boss.anchors.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      z: a.z,
      cooldown: 0,
    })),
  };
}

export function stepBossSystem(
  boss: BossState,
  vitality: VitalityState,
  cat: CatState,
  options: {
    activeToolFired: ToolId | null;
    chimeRadius: number;
    difficulty: DifficultyLevel;
    forceEngage?: boolean;
  },
  dt: number
): BossStepEvents {
  const ev: BossStepEvents = {
    engagedNow: false,
    telegraphStarted: false,
    attackTriggered: false,
    staggeredNow: false,
    damagedBossNow: false,
    bossDefeatedNow: false,
    damagedPlayerNow: false,
    playerDefeatedNow: false,
    hitstopSec: 0,
  };

  if (vitality.invulnTimer > 0) {
    vitality.invulnTimer = Math.max(0, vitality.invulnTimer - dt);
  }
  if (boss.hitFlashTimer > 0) {
    boss.hitFlashTimer = Math.max(0, boss.hitFlashTimer - dt);
  }
  for (const a of boss.anchors) {
    if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt);
  }

  if (boss.phase === 'defeated' || vitality.defeated) {
    return ev;
  }

  const distHome = Math.hypot(cat.x - boss.homeX, cat.z - boss.homeZ);
  const distBoss = Math.hypot(cat.x - boss.x, cat.z - boss.z);
  const heightDiff = Math.abs(cat.y - boss.y);

  if (boss.phase === 'dormant') {
    if (options.forceEngage || (distHome <= boss.arenaRadius && heightDiff < 4.5)) {
      boss.active = true;
      boss.phase = 'patrol';
      boss.attackCooldown = 2.0;
      ev.engagedNow = true;
    } else {
      return ev;
    }
  }

  // Tool synergy: Stagger & strike Boss via Resonance Anchors or direct tools
  const tool = options.activeToolFired;
  const isOffensiveTool = tool === 'bell' || tool === 'sonic_claw' || tool === 'lantern_flare';
  let struckVulnerableBoss = false;

  if (boss.phase === 'vulnerable') {
    const canHitVulnerable =
      (isOffensiveTool && distBoss <= Math.max(6.8, options.chimeRadius * 0.72) && heightDiff < 4.0) ||
      (!cat.grounded && cat.vy < -0.5 && distBoss < 1.8 && Math.abs(cat.y - boss.y) < 1.9);

    if (canHitVulnerable) {
      struckVulnerableBoss = true;
    }
  } else if (isOffensiveTool && distHome <= boss.arenaRadius + 3.0) {
    // Trigger any nearby Arena Resonance Anchor (cooldown 3.5s) to stagger the Boss!
    let anchorTriggered = false;
    for (const a of boss.anchors) {
      if (a.cooldown > 0) continue;
      if (Math.hypot(cat.x - a.x, cat.z - a.z) <= 5.8 && Math.abs(cat.y - a.y) < 3.5) {
        a.cooldown = 4.0;
        anchorTriggered = true;
        break;
      }
    }
    const directClawHit =
      boss.id !== 'gufo_oro' && tool === 'sonic_claw' && distBoss <= 5.6 && heightDiff < 2.8;
    const directFlareBlind =
      boss.id === 'gufo_oro' && tool === 'lantern_flare' && distBoss <= 8.5;

    if (anchorTriggered || directClawHit || directFlareBlind) {
      boss.phase = 'vulnerable';
      boss.phaseTimer = 4.6;
      boss.hitFlashTimer = 0.25;
      ev.staggeredNow = true;
      ev.hitstopSec = 0.04;
      return ev;
    }
  }

  if (struckVulnerableBoss) {
    boss.hp = Math.max(0, boss.hp - 1);
    boss.hitFlashTimer = 0.45;
    ev.damagedBossNow = true;
    ev.hitstopSec = 0.065;
    if (boss.hp <= 0) {
      boss.phase = 'defeated';
      boss.active = false;
      ev.bossDefeatedNow = true;
    } else {
      boss.phase = 'patrol';
      boss.attackCooldown = options.difficulty === 'challenger' ? 1.5 : 2.3;
    }
    return ev;
  }

  const speedScale =
    options.difficulty === 'challenger' ? 1.24 : options.difficulty === 'relaxed' ? 0.8 : 1.0;

  // Phase updates
  if (boss.phase === 'patrol') {
    boss.orbitAngle += dt * 0.72 * speedScale;
    const patrolR = boss.id === 'gufo_oro' ? 4.8 : 4.2;
    const tx = boss.homeX + Math.cos(boss.orbitAngle) * patrolR;
    const tz = boss.homeZ + Math.sin(boss.orbitAngle) * patrolR;
    const dx = tx - boss.x;
    const dz = tz - boss.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const step = Math.min(d, 2.9 * speedScale * dt);
      boss.x += (dx / d) * step;
      boss.z += (dz / d) * step;
      boss.yaw = Math.atan2(dx, dz);
    }

    boss.attackCooldown -= dt;
    if (boss.attackCooldown <= 0 && distHome <= boss.arenaRadius + 4.0) {
      boss.phase = 'telegraph';
      boss.phaseTimer = options.difficulty === 'challenger' ? 0.72 : 0.92;
      boss.targetX = cat.x;
      boss.targetZ = cat.z;
      boss.yaw = Math.atan2(cat.x - boss.x, cat.z - boss.z);
      ev.telegraphStarted = true;
    }
  } else if (boss.phase === 'telegraph') {
    boss.phaseTimer -= dt;
    if (boss.phaseTimer <= 0) {
      boss.phase = 'attack';
      boss.phaseTimer = boss.id === 'gufo_oro' ? 1.45 : 0.95;
      ev.attackTriggered = true;
    }
  } else if (boss.phase === 'attack') {
    boss.phaseTimer -= dt;
    if (boss.id === 'gufo_oro') {
      // Swooping solar beam pulse across target point
      boss.orbitAngle += dt * 2.2 * speedScale;
      boss.x = boss.homeX + Math.cos(boss.orbitAngle) * 5.2;
      boss.z = boss.homeZ + Math.sin(boss.orbitAngle) * 5.2;
      boss.yaw = Math.atan2(cat.x - boss.x, cat.z - boss.z);
      const beamDist = Math.hypot(cat.x - boss.targetX, cat.z - boss.targetZ);
      if (beamDist < 2.2 && !cat.purring && cat.dashTimer <= 0 && heightDiff < 3.5) {
        if (applyDamageToPlayer(vitality, 1)) {
          ev.damagedPlayerNow = true;
          ev.hitstopSec = 0.05;
          if (vitality.defeated) ev.playerDefeatedNow = true;
        }
      }
    } else {
      // Bosun Bulldog / Captain Ironsnout lunges toward locked telegraph point
      const dx = boss.targetX - boss.x;
      const dz = boss.targetZ - boss.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.12) {
        const chargeStep = Math.min(d, 9.2 * speedScale * dt);
        boss.x += (dx / d) * chargeStep;
        boss.z += (dz / d) * chargeStep;
        boss.yaw = Math.atan2(dx, dz);
      }
      if (
        cat.dashTimer <= 0 &&
        Math.hypot(cat.x - boss.x, cat.z - boss.z) < 1.45 &&
        Math.abs(cat.y - boss.y) < 1.35
      ) {
        if (applyDamageToPlayer(vitality, 1)) {
          ev.damagedPlayerNow = true;
          ev.hitstopSec = 0.055;
          cat.grounded = false;
          cat.vy = 3.8;
          const pDist = Math.max(0.05, Math.hypot(cat.x - boss.x, cat.z - boss.z));
          cat.vx = ((cat.x - boss.x) / pDist) * 6.5;
          cat.vz = ((cat.z - boss.z) / pDist) * 6.5;
          if (vitality.defeated) ev.playerDefeatedNow = true;
        }
      }
    }

    if (boss.phaseTimer <= 0) {
      boss.phase = 'patrol';
      boss.attackCooldown = options.difficulty === 'challenger' ? 1.85 : 2.6;
    }
  } else if (boss.phase === 'vulnerable') {
    boss.phaseTimer -= dt;
    if (boss.phaseTimer <= 0) {
      boss.phase = 'patrol';
      boss.attackCooldown = 2.0;
    }
  }

  return ev;
}
