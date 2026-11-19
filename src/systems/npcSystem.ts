import type { CatState } from './parkour';
import type { DifficultyModifiers } from '../data/tuning';

export interface Waypoint {
  x: number;
  y: number;
  z: number;
  pauseSec?: number;
}

export type PersonRole = 'fisherman' | 'vendor' | 'stroller';

export interface PersonNpcState {
  id: string;
  role: PersonRole;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  gaitPhase: number;
  idleTimer: number;
  lookAtCatTimer: number;
  coatColor: string;
  waypoints: Waypoint[];
  wpIndex: number;
  walking: boolean;
  holdingRod: boolean;
}

export type DogBehavior = 'patrol' | 'sniff' | 'alert' | 'chase';

export interface PatrolBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DogNpcState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  chaseSpeed: number;
  gaitPhase: number;
  tailPhase: number;
  behavior: DogBehavior;
  pauseTimer: number;
  barkCooldown: number;
  chaseTimer: number;
  chaseElapsed: number;
  chaseCooldown: number;
  caughtCooldown: number;
  distractedTimer: number;
  distractedX: number;
  distractedZ: number;
  coatColor: string;
  waypoints: Waypoint[];
  wpIndex: number;
  bounds?: PatrolBounds;
}

export type BirdMode = 'perched' | 'flying' | 'soaring';

export interface BirdNpcState {
  id: string;
  species: 'gull' | 'pigeon';
  mode: BirdMode;
  homeX: number;
  homeY: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  wingPhase: number;
  peckPhase: number;
  flightTimer: number;
  orbitRadius: number;
  orbitHeight: number;
  orbitSpeed: number;
  orbitAngle: number;
  headTurn?: number;
}

export interface NpcWorldState {
  people: PersonNpcState[];
  dogs: DogNpcState[];
  birds: BirdNpcState[];
}

export interface NpcStepEvents {
  barked: boolean;
  chirped: boolean;
  chasingDogs: number;
  caughtCat: boolean;
  escapedChase: boolean;
  dogGaveUp: boolean;
  distractedDog: boolean;
  stalkedGullPos: { x: number; y: number; z: number } | null;
}

function wrapAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function turnTowards(current: number, target: number, rate: number, dt: number): number {
  const diff = wrapAngle(target - current);
  return current + diff * Math.min(1, rate * dt);
}

export function createPersonNpc(
  id: string,
  role: PersonRole,
  coatColor: string,
  waypoints: Waypoint[],
  holdingRod = false,
  initialYaw = 0
): PersonNpcState {
  const start = waypoints[0];
  return {
    id,
    role,
    x: start.x,
    y: start.y,
    z: start.z,
    yaw: initialYaw,
    speed: role === 'stroller' ? 1.15 : 0.9,
    gaitPhase: 0,
    idleTimer: start.pauseSec ?? 0,
    lookAtCatTimer: 0,
    coatColor,
    waypoints,
    wpIndex: waypoints.length > 1 ? 1 : 0,
    walking: false,
    holdingRod,
  };
}

export function createDogNpc(
  id: string,
  coatColor: string,
  waypoints: Waypoint[],
  bounds?: PatrolBounds
): DogNpcState {
  const start = waypoints[0];
  return {
    id,
    x: start.x,
    y: start.y,
    z: start.z,
    yaw: 0,
    speed: 1.65,
    chaseSpeed: 3.45,
    gaitPhase: 0,
    tailPhase: 0,
    behavior: 'patrol',
    pauseTimer: 0,
    barkCooldown: 0,
    chaseTimer: 0,
    chaseElapsed: 0,
    chaseCooldown: 0,
    caughtCooldown: 0,
    distractedTimer: 0,
    distractedX: start.x,
    distractedZ: start.z,
    coatColor,
    waypoints,
    wpIndex: waypoints.length > 1 ? 1 : 0,
    bounds,
  };
}

export function createPerchedBirdNpc(
  id: string,
  species: 'gull' | 'pigeon',
  x: number,
  y: number,
  z: number,
  yaw = 0
): BirdNpcState {
  return {
    id,
    species,
    mode: 'perched',
    homeX: x,
    homeY: y,
    homeZ: z,
    x,
    y,
    z,
    yaw,
    pitch: 0,
    wingPhase: 0,
    peckPhase: (x * 1.7 + z * 0.9) % (Math.PI * 2),
    flightTimer: 0,
    orbitRadius: 4.5,
    orbitHeight: y + 4.8,
    orbitSpeed: species === 'gull' ? 1.05 : 1.35,
    orbitAngle: yaw,
    headTurn: 0,
  };
}

export function createSoaringBirdNpc(
  id: string,
  centerX: number,
  centerZ: number,
  height: number,
  radius: number,
  speed: number,
  startAngle: number
): BirdNpcState {
  const x = centerX + Math.cos(startAngle) * radius;
  const z = centerZ + Math.sin(startAngle) * radius;
  return {
    id,
    species: 'gull',
    mode: 'soaring',
    homeX: centerX,
    homeY: height,
    homeZ: centerZ,
    x,
    y: height,
    z,
    yaw: -startAngle,
    pitch: 0,
    wingPhase: startAngle * 2,
    peckPhase: 0,
    flightTimer: 0,
    orbitRadius: radius,
    orbitHeight: height,
    orbitSpeed: speed,
    orbitAngle: startAngle,
    headTurn: 0,
  };
}

export interface NpcStepOptions {
  difficulty?: DifficultyModifiers;
  sonicClawImpact?: { x: number; y: number; z: number; yaw: number } | null;
  flareSpots?: ReadonlyArray<{ x: number; y: number; z: number }>;
}

export function stepNpcs(
  state: NpcWorldState,
  cat: CatState,
  chimedThisStep: boolean,
  dt: number,
  fishStolenThisStep = false,
  baitSpots: ReadonlyArray<{ x: number; y: number; z: number }> = [],
  forceSpookBirdId: string | null = null,
  options: NpcStepOptions = {}
): NpcStepEvents {
  const maxChaseSec = options.difficulty?.dogMaxChaseSec ?? 7.5;
  const dogCooldownSec = options.difficulty?.dogCooldownSec ?? 10.5;
  const chaseSpeedMult = options.difficulty?.dogChaseSpeedMult ?? 1.0;
  const claw = options.sonicClawImpact ?? null;
  const flares = options.flareSpots ?? [];

  const events: NpcStepEvents = {
    barked: false,
    chirped: false,
    chasingDogs: 0,
    caughtCat: false,
    escapedChase: false,
    dogGaveUp: false,
    distractedDog: false,
    stalkedGullPos: null,
  };

  // 1. People NPCs: patrol quays/piers or tend fishing rods/stalls, turn head/body when Pip chimes or purrs/rubs nearby
  for (const p of state.people) {
    const distToCat = Math.hypot(cat.x - p.x, cat.z - p.z);
    if ((chimedThisStep && distToCat < 12.0) || ((cat.purring || cat.rubTimer > 0) && distToCat < 2.8)) {
      p.lookAtCatTimer = 2.6;
    } else if (p.lookAtCatTimer > 0) {
      p.lookAtCatTimer = Math.max(0, p.lookAtCatTimer - dt);
    }

    if (p.lookAtCatTimer > 0 || (distToCat < 2.2 && p.waypoints.length === 1)) {
      p.walking = false;
      const targetYaw = Math.atan2(cat.x - p.x, cat.z - p.z);
      p.yaw = turnTowards(p.yaw, targetYaw, 5.5, dt);
      p.idleTimer = Math.max(p.idleTimer, 0.25);
    } else if (p.waypoints.length <= 1) {
      p.walking = false;
      p.idleTimer += dt;
    } else if (p.idleTimer > 0) {
      p.walking = false;
      p.idleTimer = Math.max(0, p.idleTimer - dt);
    } else if (distToCat < 0.72 && Math.abs(cat.y - p.y) < 1.3) {
      p.walking = false;
      const targetYaw = Math.atan2(cat.x - p.x, cat.z - p.z);
      p.yaw = turnTowards(p.yaw, targetYaw, 5.5, dt);
    } else {
      const target = p.waypoints[p.wpIndex];
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.14) {
        p.x = target.x;
        p.y = target.y;
        p.z = target.z;
        p.walking = false;
        p.idleTimer = target.pauseSec ?? 1.8;
        p.wpIndex = (p.wpIndex + 1) % p.waypoints.length;
      } else {
        p.walking = true;
        const step = Math.min(dist, p.speed * dt);
        p.x += (dx / dist) * step;
        p.z += (dz / dist) * step;
        p.y += (target.y - p.y) * Math.min(1, 8 * dt);
        p.yaw = turnTowards(p.yaw, Math.atan2(dx, dz), 6.5, dt);
        p.gaitPhase += dt * (p.speed * 4.8);
      }
    }

    const postDistToCat = Math.hypot(cat.x - p.x, cat.z - p.z);
    if (!cat.hopActive && cat.rubTimer <= 0 && Math.abs(cat.y - p.y) < 1.3 && postDistToCat > 1e-4 && postDistToCat < 0.48) {
      const push = 0.48 - postDistToCat;
      cat.x += ((cat.x - p.x) / postDistToCat) * push;
      cat.z += ((cat.z - p.z) / postDistToCat) * push;
    }
  }

  // 2. Harbor Dogs: patrol docks, chase Pip (up to maxChaseSec, then lose interest with cooldown!), or react to lures/claw/flare
  for (const d of state.dogs) {
    if (d.barkCooldown > 0) d.barkCooldown = Math.max(0, d.barkCooldown - dt);
    if (d.caughtCooldown > 0) d.caughtCooldown = Math.max(0, d.caughtCooldown - dt);
    if (d.chaseCooldown > 0) d.chaseCooldown = Math.max(0, d.chaseCooldown - dt);

    // Sonic Claw shockwave pushback + stun cooldown
    if (claw && Math.abs(d.y - claw.y) < 1.8) {
      const cdx = d.x - claw.x;
      const cdz = d.z - claw.z;
      const cdist = Math.hypot(cdx, cdz);
      if (cdist < 6.5) {
        if (d.behavior === 'chase') {
          events.escapedChase = true;
        }
        d.behavior = 'patrol';
        d.chaseTimer = 0;
        d.chaseElapsed = 0;
        d.chaseCooldown = Math.max(d.chaseCooldown, dogCooldownSec + 3.0);
        d.pauseTimer = 2.6;
        const pushLen = cdist > 0.05 ? cdist : 1;
        let nx = d.x + (cdx / pushLen) * 1.45;
        let nz = d.z + (cdz / pushLen) * 1.45;
        if (d.bounds) {
          nx = Math.max(d.bounds.minX, Math.min(d.bounds.maxX, nx));
          nz = Math.max(d.bounds.minZ, Math.min(d.bounds.maxZ, nz));
        }
        d.x = nx;
        d.z = nz;
      }
    }

    // Dawn Flare calms aggressive dogs within radiant halo
    let calmedByFlare = false;
    for (const fl of flares) {
      if (Math.hypot(fl.x - d.x, fl.z - d.z) < 8.0 && Math.abs(fl.y - d.y) < 2.2) {
        calmedByFlare = true;
        break;
      }
    }
    if (calmedByFlare) {
      if (d.behavior === 'chase') {
        events.escapedChase = true;
      }
      d.behavior = 'sniff';
      d.chaseTimer = 0;
      d.chaseElapsed = 0;
      d.chaseCooldown = Math.max(d.chaseCooldown, 8.0);
      d.pauseTimer = Math.max(d.pauseTimer, 1.5);
    }

    const dxCat = cat.x - d.x;
    const dzCat = cat.z - d.z;
    const distToCat = Math.hypot(dxCat, dzCat);
    const heightDiff = Math.abs(cat.y - d.y);

    if (!cat.hopActive && heightDiff < 1.0 && distToCat > 1e-4 && distToCat < 0.54) {
      const push = 0.54 - distToCat;
      cat.x += (dxCat / distToCat) * push;
      cat.z += (dzCat / distToCat) * push;
    }

    // Check dropped fish / tipped bait pails distracting this dog!
    let nearestBait: { x: number; z: number; dist: number } | null = null;
    for (const b of baitSpots) {
      if (Math.abs(b.y - d.y) > 1.2) continue;
      const bd = Math.hypot(b.x - d.x, b.z - d.z);
      if (bd < 11.0 && (!nearestBait || bd < nearestBait.dist)) {
        nearestBait = { x: b.x, z: b.z, dist: bd };
      }
    }
    if (nearestBait) {
      if (d.behavior === 'chase' || d.distractedTimer <= 0) {
        events.distractedDog = true;
      }
      d.behavior = 'sniff';
      d.chaseTimer = 0;
      d.chaseElapsed = 0;
      d.chaseCooldown = Math.max(d.chaseCooldown, 11.0);
      d.distractedTimer = Math.max(d.distractedTimer, 6.5);
      d.distractedX = nearestBait.x;
      d.distractedZ = nearestBait.z;
    }

    if (d.distractedTimer > 0) {
      d.distractedTimer = Math.max(0, d.distractedTimer - dt);
      const bdx = d.distractedX - d.x;
      const bdz = d.distractedZ - d.z;
      const bdist = Math.hypot(bdx, bdz);
      d.tailPhase += dt * 11.0;
      if (bdist > 0.55) {
        d.behavior = 'patrol';
        const step = Math.min(bdist - 0.45, d.speed * 1.4 * dt);
        let nx = d.x + (bdx / bdist) * step;
        let nz = d.z + (bdz / bdist) * step;
        if (d.bounds) {
          nx = Math.max(d.bounds.minX, Math.min(d.bounds.maxX, nx));
          nz = Math.max(d.bounds.minZ, Math.min(d.bounds.maxZ, nz));
        }
        if (Math.hypot(nx - d.x, nz - d.z) > 0.004) {
          d.gaitPhase += dt * (d.speed * 5.8);
        }
        d.x = nx;
        d.z = nz;
        d.yaw = turnTowards(d.yaw, Math.atan2(bdx, bdz), 8.0, dt);
      } else {
        d.behavior = 'sniff';
      }
      continue;
    }

    const onSameDeck = !cat.swimming && !cat.sleeping && cat.y < d.y + 0.65 && heightDiff < 1.1;
    const chaseTriggerDist = cat.carryingFish ? 6.5 : 4.1;
    const canStartChase = d.chaseCooldown <= 0 || (fishStolenThisStep && distToCat < 7.5);
    const heardTrouble =
      (fishStolenThisStep && distToCat < 12.0) ||
      (chimedThisStep && distToCat < 9.5) ||
      (onSameDeck && distToCat < chaseTriggerDist);

    const prevBehavior = d.behavior;
    if (d.behavior !== 'chase') {
      if (heardTrouble && onSameDeck && canStartChase) {
        d.behavior = 'chase';
        d.chaseTimer = fishStolenThisStep ? 6.2 : 5.0;
        d.chaseElapsed = 0;
      }
    } else {
      d.chaseElapsed += dt;
      // Give only small time refresh when very close, capped strictly at maxChaseSec so dogs always stop eventually!
      if (onSameDeck && distToCat < 3.6 && d.chaseElapsed < maxChaseSec - 1.5) {
        d.chaseTimer = Math.max(d.chaseTimer, 2.0);
      } else {
        d.chaseTimer = Math.max(0, d.chaseTimer - (onSameDeck ? dt : dt * 2.4));
      }

      if (d.chaseElapsed >= maxChaseSec || d.chaseTimer <= 0) {
        if (prevBehavior === 'chase') {
          events.escapedChase = true;
          if (d.chaseElapsed >= maxChaseSec) {
            events.dogGaveUp = true;
          }
        }
        d.behavior = 'patrol';
        d.chaseTimer = 0;
        d.chaseElapsed = 0;
        d.chaseCooldown = dogCooldownSec;
        d.pauseTimer = 2.0;
      }
    }

    if (d.behavior === 'chase') {
      events.chasingDogs++;
      d.yaw = turnTowards(d.yaw, Math.atan2(dxCat, dzCat), 10.5, dt);
      d.tailPhase += dt * 16.0;

      if (d.barkCooldown <= 0) {
        d.barkCooldown = 2.1;
        events.barked = true;
      }

      if (onSameDeck && distToCat > 0.42) {
        const effChaseSpeed = d.chaseSpeed * chaseSpeedMult;
        const step = Math.min(distToCat - 0.36, effChaseSpeed * dt);
        let nx = d.x + (dxCat / distToCat) * step;
        let nz = d.z + (dzCat / distToCat) * step;
        if (d.bounds) {
          nx = Math.max(d.bounds.minX, Math.min(d.bounds.maxX, nx));
          nz = Math.max(d.bounds.minZ, Math.min(d.bounds.maxZ, nz));
        }
        const moved = Math.hypot(nx - d.x, nz - d.z);
        d.x = nx;
        d.z = nz;
        if (moved > 0.005) {
          d.gaitPhase += dt * (effChaseSpeed * 4.4);
        }
      }

      // Catch Pip if close on the ground (unless hopping or Shadow Dashing with i-frames!)
      if (
        onSameDeck &&
        !cat.hopActive &&
        cat.dashTimer <= 0 &&
        d.caughtCooldown <= 0 &&
        distToCat < 0.72
      ) {
        d.caughtCooldown = 2.4;
        events.caughtCat = true;
        events.barked = true;
        cat.frightTimer = 1.15;
        cat.grounded = false;
        cat.vy = 3.1;
        const pushX = distToCat > 1e-3 ? dxCat / distToCat : Math.sin(d.yaw);
        const pushZ = distToCat > 1e-3 ? dzCat / distToCat : Math.cos(d.yaw);
        cat.vx = pushX * 5.2;
        cat.vz = pushZ * 5.2;
      }
      continue;
    }

    if ((distToCat < 5.0 && !onSameDeck && d.chaseCooldown <= 0) || (chimedThisStep && distToCat < 10.5 && d.chaseCooldown <= 0)) {
      d.behavior = 'alert';
      d.yaw = turnTowards(d.yaw, Math.atan2(dxCat, dzCat), 8.5, dt);
      d.tailPhase += dt * 13.0;
      if (d.barkCooldown <= 0) {
        d.barkCooldown = 2.8;
        events.barked = true;
      }
      continue;
    }

    if (d.pauseTimer > 0) {
      d.behavior = 'sniff';
      d.pauseTimer = Math.max(0, d.pauseTimer - dt);
      d.tailPhase += dt * 6.5;
      continue;
    }

    if (d.waypoints.length <= 1) {
      d.behavior = 'sniff';
      d.tailPhase += dt * 5.0;
      continue;
    }

    const target = d.waypoints[d.wpIndex];
    const dx = target.x - d.x;
    const dz = target.z - d.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.16) {
      d.x = target.x;
      d.y = target.y;
      d.z = target.z;
      d.behavior = 'sniff';
      d.pauseTimer = target.pauseSec ?? 2.4;
      d.wpIndex = (d.wpIndex + 1) % d.waypoints.length;
    } else {
      d.behavior = 'patrol';
      const step = Math.min(dist, d.speed * dt);
      d.x += (dx / dist) * step;
      d.z += (dz / dist) * step;
      d.y += (target.y - d.y) * Math.min(1, 10 * dt);
      d.yaw = turnTowards(d.yaw, Math.atan2(dx, dz), 7.5, dt);
      d.gaitPhase += dt * (d.speed * 5.2);
      d.tailPhase += dt * 8.5;
    }
  }

  // 3. Birds: perched gulls/pigeons peck, tolerate stealth crouch, & scatter on pounce/chime; soaring gulls circle overhead
  for (const b of state.birds) {
    if (b.mode === 'soaring') {
      b.orbitAngle += b.orbitSpeed * dt;
      const nx = b.homeX + Math.cos(b.orbitAngle) * b.orbitRadius;
      const nz = b.homeZ + Math.sin(b.orbitAngle) * b.orbitRadius;
      const dx = nx - b.x;
      const dz = nz - b.z;
      b.x = nx;
      b.z = nz;
      b.y = b.orbitHeight + Math.sin(b.orbitAngle * 2.0) * 0.9;
      if (Math.hypot(dx, dz) > 1e-4) {
        b.yaw = Math.atan2(dx, dz);
      }
      b.pitch = Math.cos(b.orbitAngle * 2.0) * 0.1;
      b.wingPhase += dt * 5.8;
      continue;
    }

    const dist3d = Math.hypot(cat.x - b.x, cat.y - b.y, cat.z - b.z);
    const spookRadius = cat.crouching ? 0.62 : cat.sprinting ? 3.2 : 2.1;

    if (b.mode === 'perched') {
      b.peckPhase += dt * 3.4;
      if (dist3d < 4.5 && (cat.purring || cat.crouching)) {
        const toCatYaw = Math.atan2(cat.x - b.x, cat.z - b.z);
        const relYaw = wrapAngle(toCatYaw - b.yaw);
        const targetTurn = Math.max(-0.65, Math.min(0.65, relYaw));
        const curTurn = b.headTurn ?? 0;
        b.headTurn = curTurn + (targetTurn - curTurn) * Math.min(1, 8.0 * dt);
      } else {
        const curTurn = b.headTurn ?? 0;
        b.headTurn = Math.abs(curTurn) < 0.005 ? 0 : curTurn * Math.max(0, 1 - Math.min(1, 6.0 * dt));
      }
      const clawHit = claw !== null && Math.hypot(b.x - claw.x, b.z - claw.z) < 8.0;
      const pounced = forceSpookBirdId === b.id || (cat.sprinting && dist3d < 1.35);
      if (pounced || clawHit || dist3d < spookRadius || (chimedThisStep && dist3d < 9.5)) {
        b.mode = 'flying';
        b.flightTimer = 4.5;
        b.headTurn = 0;
        b.orbitAngle = Math.atan2(b.z - b.homeZ, b.x - b.homeX);
        events.chirped = true;
        if (pounced) {
          events.stalkedGullPos = { x: b.x, y: b.y + 0.25, z: b.z };
        }
      }
    } else {
      // 'flying': circle smoothly above perch then descend cleanly back onto perch
      b.flightTimer -= dt;
      b.orbitAngle += b.orbitSpeed * 1.45 * dt;
      b.wingPhase += dt * 13.5;

      const total = 4.5;
      const elapsedFlight = total - b.flightTimer;
      const arc = Math.sin(Math.min(1, elapsedFlight / total) * Math.PI);
      const radius = arc * b.orbitRadius;
      const nx = b.homeX + Math.cos(b.orbitAngle) * radius;
      const nz = b.homeZ + Math.sin(b.orbitAngle) * radius;
      const ny = b.homeY + arc * (b.orbitHeight - b.homeY);

      const dx = nx - b.x;
      const dz = nz - b.z;
      b.x = nx;
      b.y = ny;
      b.z = nz;
      if (Math.hypot(dx, dz) > 1e-4) {
        b.yaw = Math.atan2(dx, dz);
      }
      b.pitch = b.flightTimer > 2.2 ? -0.22 : 0.18;

      if (b.flightTimer <= 0) {
        b.mode = 'perched';
        b.x = b.homeX;
        b.y = b.homeY;
        b.z = b.homeZ;
        b.pitch = 0;
      }
    }
  }

  return events;
}
