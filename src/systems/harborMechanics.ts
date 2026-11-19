import type { CatState, WalkSurface } from './parkour';
import type { ToolId } from '../data/tools';
import type { DifficultyModifiers } from '../data/tuning';
import type { MusicZone } from '../data/i18n';

export interface EchoLedgeState {
  id: string;
  surfaceId: string;
  x: number;
  y: number;
  z: number;
  revealTimer: number;
}

export interface WheelPaddleRef {
  surfaceId: string;
  angleOffset: number;
}

export interface WaterwheelState {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  padHalfW: number;
  padHalfD: number;
  angle: number;
  speed: number;
  dir: -1 | 1;
  reverseTimer: number;
  paddles: WheelPaddleRef[];
}

export interface OwlSentinelState {
  id: string;
  pivotX: number;
  pivotY: number;
  pivotZ: number;
  baseYaw: number;
  sweepAngle: number;
  sweepSpan: number;
  sweepSpeed: number;
  phase: number;
  groundY: number;
  spotDist: number;
  spotRadius: number;
  spotX: number;
  spotZ: number;
  suspicion: number;
  catInBeam: boolean;
  stealthSynced: boolean;
}

export interface BaitPailState {
  id: string;
  x: number;
  y: number;
  z: number;
  tipped: boolean;
  respawnTimer: number;
}

export interface DecoyFishState {
  id: string;
  x: number;
  y: number;
  z: number;
  timer: number;
  fromPail: boolean;
}

export interface MarcoLetterState {
  id: string;
  title: string;
  text: string;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface CozyNestState {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
}

export interface FlareSpotState {
  id: string;
  x: number;
  y: number;
  z: number;
  timer: number;
}

export interface HarborMechanicsState {
  echoLedges: EchoLedgeState[];
  waterwheels: WaterwheelState[];
  owls: OwlSentinelState[];
  baitPails: BaitPailState[];
  decoyFish: DecoyFishState[];
  flareSpots: FlareSpotState[];
  letters: MarcoLetterState[];
  nests: CozyNestState[];
  stealthGraceTimer: number;
  nextDecoySeq: number;
}

export interface HarborMechanicsEvents {
  echoRevealedCount: number;
  reversedWheelId: string | null;
  owlAlarmFired: boolean;
  owlSuspicionMax: number;
  owlInBeam: boolean;
  owlStealthSynced: boolean;
  stealthAvoidedTick: boolean;
  collectedLetter: MarcoLetterState | null;
  droppedDecoyBait: DecoyFishState | null;
  sonicClawImpact: { x: number; y: number; z: number; yaw: number } | null;
  flareSpawned: FlareSpotState | null;
}

export function determineMusicZone(opts: {
  mode: 'title' | 'playing' | 'paused' | 'gameover';
  chasingDogs: number;
  owlInBeam: boolean;
  swimming: boolean;
  catY: number;
  catZ: number;
}): MusicZone {
  if (opts.mode === 'title') return 'title';
  if (opts.chasingDogs > 0) return 'chase';
  if (opts.owlInBeam) return 'stealth';
  if (opts.swimming) return 'swimming';
  if (opts.catY >= 6.8 || opts.catZ <= -22.5) return 'dam_summit';
  if (opts.catY <= 1.15) return 'waterfront';
  return 'rooftops';
}

export function createHarborMechanicsState(): HarborMechanicsState {
  return {
    echoLedges: [
      { id: 'echo_east_gap', surfaceId: 'echo_east_gap', x: 6.4, y: 3.4, z: 0.6, revealTimer: 0 },
      { id: 'echo_west_belfry', surfaceId: 'echo_west_belfry', x: -6.4, y: 3.3, z: -8.5, revealTimer: 0 },
      { id: 'echo_east_belfry', surfaceId: 'echo_east_belfry', x: 6.4, y: 4.0, z: -13.0, revealTimer: 0 },
      { id: 'echo_dam_crest', surfaceId: 'echo_dam_crest', x: 0.0, y: 7.4, z: -21.2, revealTimer: 0 },
      { id: 'echo_arsenal_span', surfaceId: 'echo_arsenal_span', x: 34.0, y: 4.6, z: 2.0, revealTimer: 0 },
      { id: 'echo_lagoon_span', surfaceId: 'echo_lagoon_span', x: -34.0, y: 4.3, z: -4.0, revealTimer: 0 },
      { id: 'echo_south_bay', surfaceId: 'echo_south_bay', x: 0.0, y: 2.2, z: 36.0, revealTimer: 0 },
      { id: 'echo_foundry_span', surfaceId: 'echo_foundry_span', x: 58.5, y: 4.8, z: -3.5, revealTimer: 0 },
      { id: 'echo_cloister_span', surfaceId: 'echo_cloister_span', x: -58.5, y: 4.7, z: 2.0, revealTimer: 0 },
      { id: 'echo_south_bastion', surfaceId: 'echo_south_bastion', x: 0.0, y: 3.6, z: 62.0, revealTimer: 0 },
      { id: 'echo_north_viaduct', surfaceId: 'echo_north_viaduct', x: 0.0, y: 5.2, z: -62.0, revealTimer: 0 },
    ],
    waterwheels: [
      {
        id: 'mill_wheel_w',
        cx: -3.2,
        cy: 5.9,
        cz: -18.5,
        radius: 2.35,
        padHalfW: 0.85,
        padHalfD: 0.72,
        angle: 0.35,
        speed: 0.58,
        dir: -1,
        reverseTimer: 0,
        paddles: [
          { surfaceId: 'wheel_pad_w_0', angleOffset: 0 },
          { surfaceId: 'wheel_pad_w_1', angleOffset: Math.PI * 0.5 },
          { surfaceId: 'wheel_pad_w_2', angleOffset: Math.PI },
          { surfaceId: 'wheel_pad_w_3', angleOffset: Math.PI * 1.5 },
        ],
      },
      {
        id: 'mill_wheel_e',
        cx: 3.2,
        cy: 5.9,
        cz: -18.5,
        radius: 2.35,
        padHalfW: 0.85,
        padHalfD: 0.72,
        angle: 1.1,
        speed: 0.58,
        dir: -1,
        reverseTimer: 0,
        paddles: [
          { surfaceId: 'wheel_pad_e_0', angleOffset: 0 },
          { surfaceId: 'wheel_pad_e_1', angleOffset: Math.PI * 0.5 },
          { surfaceId: 'wheel_pad_e_2', angleOffset: Math.PI },
          { surfaceId: 'wheel_pad_e_3', angleOffset: Math.PI * 1.5 },
        ],
      },
    ],
    owls: [
      {
        id: 'owl_belfry',
        pivotX: 0,
        pivotY: 6.8,
        pivotZ: -13.2,
        baseYaw: 0,
        sweepAngle: 0,
        sweepSpan: 0.85,
        sweepSpeed: 0.75,
        phase: 0,
        groundY: 3.6,
        spotDist: 3.0,
        spotRadius: 1.95,
        spotX: 0,
        spotZ: -10.2,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
      {
        id: 'owl_bridge_w',
        pivotX: -8.5,
        pivotY: 5.4,
        pivotZ: -4.4,
        baseYaw: Math.PI * 0.5,
        sweepAngle: 0,
        sweepSpan: 0.75,
        sweepSpeed: 0.88,
        phase: 1.8,
        groundY: 2.02,
        spotDist: 2.8,
        spotRadius: 1.85,
        spotX: -5.7,
        spotZ: -4.4,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
      {
        id: 'owl_bridge_e',
        pivotX: 8.5,
        pivotY: 5.6,
        pivotZ: -11.8,
        baseYaw: -Math.PI * 0.5,
        sweepAngle: 0,
        sweepSpan: 0.75,
        sweepSpeed: 0.82,
        phase: 3.4,
        groundY: 2.22,
        spotDist: 2.8,
        spotRadius: 1.85,
        spotX: 5.7,
        spotZ: -11.8,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
      {
        id: 'owl_arsenal_e',
        pivotX: 39.0,
        pivotY: 5.4,
        pivotZ: -3.5,
        baseYaw: 0,
        sweepAngle: 0,
        sweepSpan: 0.85,
        sweepSpeed: 0.78,
        phase: 0.9,
        groundY: 0.5,
        spotDist: 3.4,
        spotRadius: 2.1,
        spotX: 39.0,
        spotZ: -0.1,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
      {
        id: 'owl_lagoon_w',
        pivotX: -40.5,
        pivotY: 5.2,
        pivotZ: -6.0,
        baseYaw: 0,
        sweepAngle: 0,
        sweepSpan: 0.82,
        sweepSpeed: 0.8,
        phase: 2.5,
        groundY: 0.5,
        spotDist: 3.4,
        spotRadius: 2.1,
        spotX: -40.5,
        spotZ: -2.6,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
      {
        id: 'owl_east_foundry',
        pivotX: 78.5,
        pivotY: 5.4,
        pivotZ: 2.0,
        baseYaw: 0,
        sweepAngle: 0,
        sweepSpan: 0.84,
        sweepSpeed: 0.76,
        phase: 1.1,
        groundY: 0.5,
        spotDist: 3.4,
        spotRadius: 2.1,
        spotX: 78.5,
        spotZ: 5.4,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
      {
        id: 'owl_west_cloister',
        pivotX: -78.5,
        pivotY: 5.4,
        pivotZ: 4.0,
        baseYaw: 0,
        sweepAngle: 0,
        sweepSpan: 0.84,
        sweepSpeed: 0.79,
        phase: 3.1,
        groundY: 0.5,
        spotDist: 3.4,
        spotRadius: 2.1,
        spotX: -78.5,
        spotZ: 7.4,
        suspicion: 0,
        catInBeam: false,
        stealthSynced: false,
      },
    ],
    baitPails: [
      { id: 'pail_quay_r', x: 9.2, y: 0.5, z: 5.4, tipped: false, respawnTimer: 0 },
      { id: 'pail_market_e', x: 14.8, y: 0.5, z: 13.8, tipped: false, respawnTimer: 0 },
      { id: 'pail_quay_l', x: -7.8, y: 0.5, z: 3.2, tipped: false, respawnTimer: 0 },
      { id: 'pail_market_w', x: -13.8, y: 0.5, z: 11.4, tipped: false, respawnTimer: 0 },
      { id: 'pail_arsenal_e', x: 37.5, y: 0.5, z: 10.2, tipped: false, respawnTimer: 0 },
      { id: 'pail_lagoon_w', x: -38.0, y: 0.5, z: 9.5, tipped: false, respawnTimer: 0 },
      { id: 'pail_south_pier', x: 3.8, y: 0.5, z: 46.5, tipped: false, respawnTimer: 0 },
      { id: 'pail_foundry_e', x: 75.0, y: 0.5, z: 11.2, tipped: false, respawnTimer: 0 },
      { id: 'pail_cloister_w', x: -74.5, y: 0.5, z: 10.5, tipped: false, respawnTimer: 0 },
      { id: 'pail_south_bastion', x: -5.0, y: 0.5, z: 74.5, tipped: false, respawnTimer: 0 },
      { id: 'pail_north_viaduct', x: -10.0, y: 4.8, z: -72.0, tipped: false, respawnTimer: 0 },
    ],
    decoyFish: [],
    flareSpots: [],
    letters: [
      {
        id: 'letter_1',
        title: 'Записка Марко №1 · О наводнении',
        text: '«Когда осенний прилив залил нижние арки Венеции, город замолк. Но мой медный маятник ещё помнит ритм латунного колокольчика…»',
        x: 1.8,
        y: 3.6,
        z: -11.4,
        collected: false,
      },
      {
        id: 'letter_2',
        title: 'Записка Марко №2 · Резонанс мостов',
        text: '«Звук колокольчика [E] пробуждает стеклянные уступы-эхо в тумане и разворачивает водяные мельницы вспять!»',
        x: 5.4,
        y: 0.28,
        z: -3.8,
        collected: false,
      },
      {
        id: 'letter_3',
        title: 'Записка Марко №3 · Хитрость против сов',
        text: '«Часовые фонари-совы на крышах чутко ловят движение. Но если тихо замурлыкать [F], голос кота сливается с гулом шестерён!»',
        x: -38.5,
        y: 4.5,
        z: -12.0,
        collected: false,
      },
      {
        id: 'letter_4',
        title: 'Записка Марко №4 · Портовые псы',
        text: '«Сторожевые псы горазды порычать, но быстро устают и обожают дармовую рыбку. Брось улов [G] или опрокинь ведро [Q]!»',
        x: 41.0,
        y: 0.5,
        z: 11.2,
        collected: false,
      },
      {
        id: 'letter_5',
        title: 'Записка Марко №5 · Сердце плотины',
        text: '«Ты добрался до вершины Затопленных Курантов, рыжий хранитель! Теперь весь порт слышит твой рассветный перезвон.»',
        x: -1.0,
        y: 9.5,
        z: -26.2,
        collected: false,
      },
    ],
    nests: [
      { id: 'nest_start', label: 'Тёплая подушка у трубы', x: 2.1, y: 3.0, z: -2.1 },
      { id: 'nest_west', label: 'Уютное гнездо на черепице', x: -11.2, y: 2.8, z: -8.8 },
      { id: 'nest_east', label: 'Тёплый коврик над каналом', x: 11.4, y: 3.8, z: 3.5 },
      { id: 'nest_dam', label: 'Лежанка мастера на плотине', x: 5.5, y: 9.5, z: -26.0 },
      { id: 'nest_arsenal', label: 'Морской плед на верфи', x: 48.0, y: 5.2, z: -4.0 },
      { id: 'nest_lagoon', label: 'Подушка художников лагуны', x: -46.0, y: 4.6, z: 8.5 },
      { id: 'nest_lighthouse', label: 'Коврик смотрителя маяка', x: 0.0, y: 2.58, z: 54.0 },
      { id: 'nest_foundry', label: 'Тёплый войлок литейной', x: 82.0, y: 6.4, z: -10.0 },
      { id: 'nest_cloister', label: 'Гнездо звонарей базилики', x: -83.0, y: 6.6, z: -8.0 },
      { id: 'nest_bastion', label: 'Плед южного бастиона', x: -16.0, y: 5.8, z: 82.0 },
      { id: 'nest_viaduct', label: 'Подстилка северного шлюза', x: 0.0, y: 9.8, z: -86.0 },
    ],
    stealthGraceTimer: 0,
    nextDecoySeq: 1,
  };
}

export function spawnDecoyFish(
  state: HarborMechanicsState,
  x: number,
  y: number,
  z: number,
  ttl = 9.0,
  fromPail = false
): DecoyFishState {
  const bait: DecoyFishState = {
    id: `decoy_${state.nextDecoySeq++}`,
    x,
    y,
    z,
    timer: ttl,
    fromPail,
  };
  state.decoyFish.push(bait);
  return bait;
}

export function tipBaitPail(state: HarborMechanicsState, pailId: string): DecoyFishState | null {
  const pail = state.baitPails.find((p) => p.id === pailId);
  if (!pail || pail.tipped) return null;
  pail.tipped = true;
  pail.respawnTimer = 22.0;
  return spawnDecoyFish(state, pail.x + 0.45, pail.y, pail.z + 0.35, 9.5, true);
}

export function stepHarborMechanics(
  state: HarborMechanicsState,
  cat: CatState,
  surfaces: WalkSurface[],
  options: {
    chimedThisStep: boolean;
    dropBaitPressed: boolean;
    activeToolFired?: ToolId | null;
    difficulty?: DifficultyModifiers;
  },
  dt: number
): HarborMechanicsEvents {
  const suspicionFillMult = options.difficulty?.owlSuspicionFillMult ?? 1.0;
  const bellTriggered = options.chimedThisStep || options.activeToolFired === 'bell';

  const events: HarborMechanicsEvents = {
    echoRevealedCount: 0,
    reversedWheelId: null,
    owlAlarmFired: false,
    owlSuspicionMax: 0,
    owlInBeam: false,
    owlStealthSynced: false,
    stealthAvoidedTick: false,
    collectedLetter: null,
    droppedDecoyBait: null,
    sonicClawImpact: null,
    flareSpawned: null,
  };

  if (state.stealthGraceTimer > 0) {
    state.stealthGraceTimer = Math.max(0, state.stealthGraceTimer - dt);
  }

  // Decay active Dawn Flares
  for (let i = state.flareSpots.length - 1; i >= 0; i--) {
    state.flareSpots[i].timer -= dt;
    if (state.flareSpots[i].timer <= 0) {
      state.flareSpots.splice(i, 1);
    }
  }

  // Handle secondary active tool triggers
  if (options.activeToolFired === 'fish_sling') {
    const dropX = cat.x + Math.sin(cat.yaw) * 3.1;
    const dropZ = cat.z + Math.cos(cat.yaw) * 3.1;
    events.droppedDecoyBait = spawnDecoyFish(state, dropX, Math.max(0.25, cat.y), dropZ, 10.5, false);
  } else if (options.activeToolFired === 'sonic_claw') {
    const impact = {
      x: cat.x + Math.sin(cat.yaw) * 1.15,
      y: cat.y,
      z: cat.z + Math.cos(cat.yaw) * 1.15,
      yaw: cat.yaw,
    };
    events.sonicClawImpact = impact;
  } else if (options.activeToolFired === 'lantern_flare') {
    const fx = cat.x + Math.sin(cat.yaw) * 2.0;
    const fy = cat.y + 0.55;
    const fz = cat.z + Math.cos(cat.yaw) * 2.0;
    const flare: FlareSpotState = {
      id: `flare_${state.nextDecoySeq++}`,
      x: fx,
      y: fy,
      z: fz,
      timer: 7.0,
    };
    state.flareSpots.push(flare);
    events.flareSpawned = flare;
    state.stealthGraceTimer = Math.max(state.stealthGraceTimer, 3.0);
  }

  // 1. Harmonic Echo Ledges: chime [E] reveals spectral sky-bridges within 11.5m
  for (const echo of state.echoLedges) {
    const surf = surfaces.find((s) => s.id === echo.surfaceId);
    if (bellTriggered) {
      const d = Math.hypot(cat.x - echo.x, cat.y - echo.y, cat.z - echo.z);
      if (d <= 12.0) {
        if (echo.revealTimer <= 0.1) {
          events.echoRevealedCount++;
        }
        echo.revealTimer = 9.5;
      }
    }
    if (echo.revealTimer > 0) {
      echo.revealTimer = Math.max(0, echo.revealTimer - dt);
    }
    if (surf) {
      surf.visible = echo.revealTimer > 0;
    }
  }

  // 2. Clockwork Waterwheels: chime [E] reverses wheel dir to +1 (upward lift) for 15s & updates paddle platforms
  for (const w of state.waterwheels) {
    if (bellTriggered) {
      const d = Math.hypot(cat.x - w.cx, cat.y - w.cy, cat.z - w.cz);
      if (d <= 11.5) {
        if (w.dir !== 1) {
          events.reversedWheelId = w.id;
        }
        w.dir = 1;
        w.reverseTimer = 15.0;
      }
    }

    if (w.reverseTimer > 0) {
      w.reverseTimer = Math.max(0, w.reverseTimer - dt);
      if (w.reverseTimer <= 0) {
        w.dir = -1;
      }
    }

    const prevAngle = w.angle;
    w.angle += w.dir * w.speed * dt;

    for (const pad of w.paddles) {
      const surf = surfaces.find((s) => s.id === pad.surfaceId);
      if (!surf) continue;
      // Rotate wheel in Z-Y plane so front edge lifts smoothly from roof_perch/belfry (z ~ -16.5) up to Clockwork Dam (z ~ -21..-24)!
      const a0 = prevAngle + pad.angleOffset;
      const a1 = w.angle + pad.angleOffset;
      const oldZ = w.cz + Math.cos(a0) * w.radius;
      const newZ = w.cz + Math.cos(a1) * w.radius;
      const newY = w.cy + Math.sin(a1) * w.radius;

      surf.minX = w.cx - w.padHalfW;
      surf.maxX = w.cx + w.padHalfW;
      surf.minZ = newZ - w.padHalfD;
      surf.maxZ = newZ + w.padHalfD;
      surf.topY = newY;
      surf.carryDx = 0;
      surf.carryDz = newZ - oldZ;
      surf.visible = newY > 0.3;
    }
  }

  // 3. Owl Watch-Lantern Searchlights: purring [F] syncs Pip's resonance under beam!
  for (const owl of state.owls) {
    owl.sweepAngle = Math.sin(owl.phase + 0.001) * owl.sweepSpan;
    owl.phase += owl.sweepSpeed * dt;
    const worldAngle = owl.baseYaw + Math.sin(owl.phase) * owl.sweepSpan;
    owl.sweepAngle = worldAngle;
    owl.spotX = owl.pivotX + Math.sin(worldAngle) * owl.spotDist;
    owl.spotZ = owl.pivotZ + Math.cos(worldAngle) * owl.spotDist;

    let blindedByFlare = false;
    for (const fl of state.flareSpots) {
      if (Math.hypot(fl.x - owl.spotX, fl.z - owl.spotZ) < 10.0) {
        blindedByFlare = true;
        break;
      }
    }

    const distSpot = Math.hypot(cat.x - owl.spotX, cat.z - owl.spotZ);
    const sameHeightBand = Math.abs(cat.y - owl.groundY) < 1.35 && !cat.swimming;
    owl.catInBeam =
      sameHeightBand &&
      distSpot < owl.spotRadius &&
      state.stealthGraceTimer <= 0 &&
      !blindedByFlare;

    if (blindedByFlare) {
      owl.stealthSynced = true;
      owl.suspicion = Math.max(0, owl.suspicion - dt * 2.5);
    } else if (owl.catInBeam) {
      events.owlInBeam = true;
      if (cat.purring || cat.sleeping) {
        owl.stealthSynced = true;
        events.owlStealthSynced = true;
        if (owl.suspicion > 0.05) {
          events.stealthAvoidedTick = true;
        }
        owl.suspicion = Math.max(0, owl.suspicion - dt * 1.4);
      } else {
        owl.stealthSynced = false;
        owl.suspicion = Math.min(1.0, owl.suspicion + dt * 0.72 * suspicionFillMult);
        if (owl.suspicion >= 1.0) {
          owl.suspicion = 0;
          state.stealthGraceTimer = 2.6;
          events.owlAlarmFired = true;
          cat.frightTimer = 0.9;
        }
      }
    } else {
      owl.stealthSynced = false;
      owl.suspicion = Math.max(0, owl.suspicion - dt * 0.9);
    }

    if (owl.suspicion > events.owlSuspicionMax) {
      events.owlSuspicionMax = owl.suspicion;
    }
  }

  // 4. Bait Pails respawn & Active Decoy Fish decay
  for (const pail of state.baitPails) {
    if (pail.tipped) {
      pail.respawnTimer -= dt;
      if (pail.respawnTimer <= 0) {
        pail.tipped = false;
        pail.respawnTimer = 0;
      }
    }
  }

  for (let i = state.decoyFish.length - 1; i >= 0; i--) {
    state.decoyFish[i].timer -= dt;
    if (state.decoyFish[i].timer <= 0) {
      state.decoyFish.splice(i, 1);
    }
  }

  // Pressing [G] while carrying stolen fish drops it forward as dog decoy bait
  if (options.dropBaitPressed && cat.carryingFish && !cat.swimming) {
    const dropX = cat.x + Math.sin(cat.yaw) * 1.35;
    const dropZ = cat.z + Math.cos(cat.yaw) * 1.35;
    events.droppedDecoyBait = spawnDecoyFish(state, dropX, cat.y, dropZ, 9.0, false);
  }

  // 5. Marco's Pigeon-Post Letters: collect on close touch (< 1.15m)
  for (const letter of state.letters) {
    if (letter.collected) continue;
    const d = Math.hypot(cat.x - letter.x, cat.y - letter.y, cat.z - letter.z);
    if (d < 1.15) {
      letter.collected = true;
      events.collectedLetter = letter;
    }
  }

  return events;
}
