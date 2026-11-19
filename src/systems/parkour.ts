import type { ParkourTuning } from '../data/tuning';

export const WORLD_BOUNDS = {
  minX: -185,
  maxX: 185,
  minZ: -195,
  maxZ: 145,
} as const;

export interface GableSlope {
  /** 'z' = ridge runs parallel to Z axis (roof slopes across X); 'x' = ridge runs parallel to X axis */
  axis: 'x' | 'z';
  center: number;
  halfSpan: number;
  eaveY: number;
  ridgeY: number;
}

export interface RampSlope {
  axis: 'x' | 'z';
  startCoord: number;
  endCoord: number;
  startY: number;
  endY: number;
}

export interface WalkSurface {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
  kind: 'roof' | 'pipe' | 'bridge' | 'gear' | 'hidden_echo';
  visible?: boolean;
  /** Optional dynamic XZ offset per frame for moving gears/bridges */
  offsetX?: number;
  offsetZ?: number;
  carryDx?: number;
  carryDz?: number;
  /** Optional pitched triangular roof profile */
  gable?: GableSlope;
  /** Optional linear sloped ramp profile (e.g. inclined plank bridge) */
  ramp?: RampSlope;
}

export interface SolidCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface LedgeCandidate {
  surfaceId: string;
  x: number;
  y: number;
  z: number;
  distance: number;
  score: number;
}

export interface CatState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  yawRate: number;
  slopePitch: number;
  slopeRoll: number;
  grounded: boolean;
  swimming: boolean;
  crouching: boolean;
  sprinting: boolean;
  purring: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  surfaceId: string | null;
  checkpointX: number;
  checkpointY: number;
  checkpointZ: number;
  hopActive: boolean;
  hopElapsed: number;
  hopDuration: number;
  hopStartX: number;
  hopStartY: number;
  hopStartZ: number;
  hopTargetX: number;
  hopTargetY: number;
  hopTargetZ: number;
  hopSurfaceId: string;
  targetLedge: LedgeCandidate | null;
  gaitPhase: number;
  idleTime: number;
  purrTimer: number;
  rubTimer: number;
  frightTimer: number;
  carryingFish: boolean;
  sleeping: boolean;
  warmthTimer: number;
  maxAirJumps: number;
  airJumpsRemaining: number;
  lastAirVy: number;
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirZ: number;
  gliding: boolean;
  airTime: number;
  jumpAnimTimer: number;
  jumpPrepTimer: number;
  jumpPrepDuration: number;
  landTimer: number;
  landingElapsed: number;
  landImpact: number;
  airSpinTimer: number;
  lastWallNormalX: number;
  lastWallNormalZ: number;
  wallContactTimer: number;
  parkourChain: number;
  parkourFlowTimer: number;
}

export interface MoveInput {
  forward: number; // -1..1 in camera space
  right: number;   // -1..1 in camera space
  cameraYaw: number;
  sprint: boolean;
  crouch: boolean;
  purr: boolean;
  jumpPressed: boolean;
  jumpHeld?: boolean;
  dashPressed?: boolean;
}

export function createCatState(x: number, y: number, z: number): CatState {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    yawRate: 0,
    slopePitch: 0,
    slopeRoll: 0,
    grounded: true,
    swimming: false,
    crouching: false,
    sprinting: false,
    purring: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    surfaceId: null,
    checkpointX: x,
    checkpointY: y,
    checkpointZ: z,
    hopActive: false,
    hopElapsed: 0,
    hopDuration: 0.34,
    hopStartX: x,
    hopStartY: y,
    hopStartZ: z,
    hopTargetX: x,
    hopTargetY: y,
    hopTargetZ: z,
    hopSurfaceId: '',
    targetLedge: null,
    gaitPhase: 0,
    idleTime: 0,
    purrTimer: 0,
    rubTimer: 0,
    frightTimer: 0,
    carryingFish: false,
    sleeping: false,
    warmthTimer: 0,
    maxAirJumps: 0,
    airJumpsRemaining: 0,
    lastAirVy: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirZ: 1,
    gliding: false,
    airTime: 0,
    jumpAnimTimer: 0,
    jumpPrepTimer: 0,
    jumpPrepDuration: 0.10,
    landTimer: 0,
    landingElapsed: 0,
    landImpact: 0,
    airSpinTimer: 0,
    lastWallNormalX: 0,
    lastWallNormalZ: 0,
    wallContactTimer: 0,
    parkourChain: 0,
    parkourFlowTimer: 0,
  };
}

export function surfaceBounds(s: WalkSurface) {
  const ox = s.offsetX ?? 0;
  const oz = s.offsetZ ?? 0;
  return {
    minX: s.minX + ox,
    maxX: s.maxX + ox,
    minZ: s.minZ + oz,
    maxZ: s.maxZ + oz,
  };
}

export function getSurfaceHeightAt(s: WalkSurface, x: number, z: number): number {
  if (s.ramp) {
    const r = s.ramp;
    const coord = r.axis === 'z' ? z - (s.offsetZ ?? 0) : x - (s.offsetX ?? 0);
    const span = r.endCoord - r.startCoord;
    const t = Math.abs(span) < 1e-4 ? 0 : Math.max(0, Math.min(1, (coord - r.startCoord) / span));
    return r.startY + t * (r.endY - r.startY);
  }
  if (!s.gable) return s.topY;
  const g = s.gable;
  const coord = g.axis === 'z' ? x - (s.offsetX ?? 0) : z - (s.offsetZ ?? 0);
  const t = Math.max(0, Math.min(1, 1 - Math.abs(coord - g.center) / Math.max(0.01, g.halfSpan)));
  return g.eaveY + t * (g.ridgeY - g.eaveY);
}

function getSurfaceGradientAt(s: WalkSurface, x: number, z: number): { dYdX: number; dYdZ: number } {
  if (s.ramp) {
    const r = s.ramp;
    const span = r.endCoord - r.startCoord;
    const slope = Math.abs(span) < 1e-4 ? 0 : (r.endY - r.startY) / span;
    return r.axis === 'z' ? { dYdX: 0, dYdZ: slope } : { dYdX: slope, dYdZ: 0 };
  }
  if (!s.gable) return { dYdX: 0, dYdZ: 0 };
  const g = s.gable;
  const slopeMag = (g.ridgeY - g.eaveY) / Math.max(0.01, g.halfSpan);
  if (g.axis === 'z') {
    const dx = x - (s.offsetX ?? 0) - g.center;
    if (Math.abs(dx) < 0.04) return { dYdX: 0, dYdZ: 0 };
    return { dYdX: dx > 0 ? -slopeMag : slopeMag, dYdZ: 0 };
  } else {
    const dz = z - (s.offsetZ ?? 0) - g.center;
    if (Math.abs(dz) < 0.04) return { dYdX: 0, dYdZ: 0 };
    return { dYdX: 0, dYdZ: dz > 0 ? -slopeMag : slopeMag };
  }
}

export function isPointOverSurface(x: number, z: number, s: WalkSurface, margin = 0.16): boolean {
  if (s.visible === false) return false;
  const b = surfaceBounds(s);
  const m = s.kind === 'pipe' || s.kind === 'bridge' ? Math.max(margin, 0.22) : margin;
  return x >= b.minX - m && x <= b.maxX + m && z >= b.minZ - m && z <= b.maxZ + m;
}

export function findBestLedgeCandidate(
  cat: CatState,
  lookDirX: number,
  lookDirZ: number,
  surfaces: WalkSurface[],
  tuning: ParkourTuning
): LedgeCandidate | null {
  let best: LedgeCandidate | null = null;
  const len = Math.hypot(lookDirX, lookDirZ) || 1;
  const dx = lookDirX / len;
  const dz = lookDirZ / len;

  for (const s of surfaces) {
    if (s.visible === false) continue;
    if (s.id === cat.surfaceId) continue;

    const b = surfaceBounds(s);
    const pad = 0.32;
    const clampedX = Math.max(
      b.minX + Math.min(pad, (b.maxX - b.minX) * 0.45),
      Math.min(b.maxX - Math.min(pad, (b.maxX - b.minX) * 0.45), cat.x + dx * 2.1)
    );
    const clampedZ = Math.max(
      b.minZ + Math.min(pad, (b.maxZ - b.minZ) * 0.45),
      Math.min(b.maxZ - Math.min(pad, (b.maxZ - b.minZ) * 0.45), cat.z + dz * 2.1)
    );

    const targetY = getSurfaceHeightAt(s, clampedX, clampedZ);
    const dy = targetY - cat.y;
    if (dy > tuning.ledgeMaxStepUp || dy < -5.5) continue;

    const vx = clampedX - cat.x;
    const vz = clampedZ - cat.z;
    const horizDist = Math.hypot(vx, vz);
    const minDist = cat.swimming ? 0.12 : dy > 0.18 ? 0.16 : 0.62;
    if (horizDist < minDist || horizDist > tuning.ledgeSnapRange) continue;

    const alignment = (vx * dx + vz * dz) / horizDist;
    if (alignment < 0.35) continue;

    const score = alignment * 3.0 - horizDist * 0.35 + (dy >= -0.2 ? 0.45 : 0);
    if (!best || score > best.score) {
      best = {
        surfaceId: s.id,
        x: clampedX,
        y: targetY,
        z: clampedZ,
        distance: horizDist,
        score,
      };
    }
  }
  return best;
}

export interface StepResult {
  anticipating?: boolean;
  jumped: boolean;
  doubleJumped?: boolean;
  wallKicked?: boolean;
  isLedgeHop: boolean;
  landedSurfaceId: string | null;
  fellInWater: boolean;
  enteredWater: boolean;
  dashedNow?: boolean;
  glideStarted?: boolean;
}

export interface ParkourModifiers {
  maxAirJumps?: number;
  sprintMult?: number;
  swimMult?: number;
  ledgeSnapBonus?: number;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
}

function pushOutOfBoxXZ(
  cat: CatState,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  radius: number
): boolean {
  const exMinX = minX - radius;
  const exMaxX = maxX + radius;
  const exMinZ = minZ - radius;
  const exMaxZ = maxZ + radius;
  if (cat.x <= exMinX || cat.x >= exMaxX || cat.z <= exMinZ || cat.z >= exMaxZ) return false;

  const dLeft = cat.x - exMinX;
  const dRight = exMaxX - cat.x;
  const dBack = cat.z - exMinZ;
  const dFront = exMaxZ - cat.z;
  const minPen = Math.min(dLeft, dRight, dBack, dFront);

  if (minPen === dLeft) {
    cat.x = exMinX;
    if (cat.vx > 0) cat.vx = 0;
    cat.lastWallNormalX = -1;
    cat.lastWallNormalZ = 0;
  } else if (minPen === dRight) {
    cat.x = exMaxX;
    if (cat.vx < 0) cat.vx = 0;
    cat.lastWallNormalX = 1;
    cat.lastWallNormalZ = 0;
  } else if (minPen === dBack) {
    cat.z = exMinZ;
    if (cat.vz > 0) cat.vz = 0;
    cat.lastWallNormalX = 0;
    cat.lastWallNormalZ = -1;
  } else {
    cat.z = exMaxZ;
    if (cat.vz < 0) cat.vz = 0;
    cat.lastWallNormalX = 0;
    cat.lastWallNormalZ = 1;
  }
  return true;
}

export function stepCatParkour(
  cat: CatState,
  input: MoveInput,
  surfaces: WalkSurface[],
  tuning: ParkourTuning,
  dt: number,
  colliders: SolidCollider[] = [],
  modifiers: ParkourModifiers = {}
): StepResult {
  const maxAir = modifiers.maxAirJumps ?? cat.maxAirJumps;
  cat.maxAirJumps = maxAir;
  const result: StepResult = {
    jumped: false,
    doubleJumped: false,
    wallKicked: false,
    isLedgeHop: false,
    landedSurfaceId: null,
    fellInWater: false,
    enteredWater: false,
    dashedNow: false,
    glideStarted: false,
  };

  if (cat.dashCooldown > 0) cat.dashCooldown = Math.max(0, cat.dashCooldown - dt);
  if (cat.dashTimer > 0) cat.dashTimer = Math.max(0, cat.dashTimer - dt);
  if (cat.landTimer > 0) {
    cat.landTimer = Math.max(0, cat.landTimer - dt);
    cat.landingElapsed += dt;
  }
  if (cat.airSpinTimer > 0) cat.airSpinTimer = Math.max(0, cat.airSpinTimer - dt);
  if (cat.wallContactTimer > 0) cat.wallContactTimer = Math.max(0, cat.wallContactTimer - dt);
  if (cat.parkourFlowTimer > 0) {
    cat.parkourFlowTimer = Math.max(0, cat.parkourFlowTimer - dt);
    if (cat.parkourFlowTimer <= 0) {
      cat.parkourChain = 0;
    }
  }
  if (!cat.grounded && !cat.swimming) {
    cat.airTime += dt;
    cat.jumpAnimTimer += dt;
  } else {
    cat.airTime = 0;
  }

  if (input.jumpPressed) {
    cat.jumpBufferTimer = tuning.jumpBuffer;
  } else {
    cat.jumpBufferTimer = Math.max(0, cat.jumpBufferTimer - dt);
  }

  // Desired world movement direction from cameraYaw
  const sinY = Math.sin(input.cameraYaw);
  const cosY = Math.cos(input.cameraYaw);
  let wishX = -sinY * input.forward + cosY * input.right;
  let wishZ = -cosY * input.forward - sinY * input.right;
  const wishMag = Math.hypot(wishX, wishZ);
  if (wishMag > 1e-4) {
    wishX /= wishMag;
    wishZ /= wishMag;
  } else {
    wishX = 0;
    wishZ = 0;
  }

  const facingX = Math.sin(cat.yaw);
  const facingZ = Math.cos(cat.yaw);
  const lookX = wishMag > 0.1 ? wishX : facingX;
  const lookZ = wishMag > 0.1 ? wishZ : facingZ;

  if (cat.hopActive) {
    cat.swimming = false;
    cat.gliding = false;
    cat.jumpPrepTimer = 0;
    cat.hopElapsed += dt;
    const t = Math.min(1, cat.hopElapsed / cat.hopDuration);
    // EaseInOutQuad horizontal glide + fast-rise (36% up) / gentle sinusoidal descent (64% down)
    const easeHoriz = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) * 0.5;
    const prevY = cat.y;
    cat.x = cat.hopStartX + (cat.hopTargetX - cat.hopStartX) * easeHoriz;
    cat.z = cat.hopStartZ + (cat.hopTargetZ - cat.hopStartZ) * easeHoriz;
    const dy = cat.hopTargetY - cat.hopStartY;
    const arcPeak = Math.max(0.48, Math.abs(dy) * 0.25 + tuning.ledgeArcBoost * 0.74);
    const apexY = Math.max(cat.hopStartY, cat.hopTargetY) + arcPeak;
    const tPeak = 0.36;
    if (t <= tPeak) {
      const u = t / tPeak;
      const climbEase = Math.sin(u * Math.PI * 0.5);
      cat.y = cat.hopStartY + (apexY - cat.hopStartY) * climbEase;
    } else {
      const u = (t - tPeak) / (1 - tPeak);
      const fallEase = 0.5 * (1 - Math.cos(u * Math.PI));
      cat.y = apexY + (cat.hopTargetY - apexY) * fallEase;
    }
    cat.vx = (cat.hopTargetX - cat.hopStartX) / cat.hopDuration;
    cat.vz = (cat.hopTargetZ - cat.hopStartZ) / cat.hopDuration;
    cat.vy = (cat.y - prevY) / Math.max(1e-4, dt);
    cat.yaw = Math.atan2(cat.hopTargetX - cat.hopStartX, cat.hopTargetZ - cat.hopStartZ);
    cat.yawRate = 0;
    cat.gaitPhase += dt * 9;
    cat.idleTime = 0;

    if (t >= 1) {
      cat.hopActive = false;
      cat.x = cat.hopTargetX;
      cat.y = cat.hopTargetY;
      cat.z = cat.hopTargetZ;
      cat.vx *= 0.35;
      cat.vz *= 0.35;
      cat.lastAirVy = -Math.max(4.8, Math.abs(dy) * 2.2 + 3.4);
      cat.vy = 0;
      cat.grounded = true;
      cat.swimming = false;
      cat.surfaceId = cat.hopSurfaceId;
      cat.coyoteTimer = tuning.coyoteTime;
      cat.airJumpsRemaining = maxAir;
      cat.airTime = 0;
      cat.airSpinTimer = 0;
      cat.landImpact = Math.min(1, Math.max(0.55, Math.abs(cat.lastAirVy) / 8.5));
      cat.landTimer = 0.26;
      cat.landingElapsed = 0;
      result.landedSurfaceId = cat.hopSurfaceId;
    }
    return result;
  }

  if (cat.purrTimer > 0) cat.purrTimer = Math.max(0, cat.purrTimer - dt);
  if (cat.rubTimer > 0) cat.rubTimer = Math.max(0, cat.rubTimer - dt);
  if (cat.frightTimer > 0) cat.frightTimer = Math.max(0, cat.frightTimer - dt);
  if (cat.warmthTimer > 0) cat.warmthTimer = Math.max(0, cat.warmthTimer - dt);

  if (cat.sleeping) {
    if (wishMag > 0.1 || input.jumpPressed) {
      cat.sleeping = false;
    } else {
      cat.vx = 0;
      cat.vz = 0;
      cat.crouching = false;
      cat.sprinting = false;
      cat.purring = true;
    }
  }

  // Carry Pip cleanly along moving waterwheel paddles
  if (cat.grounded && cat.surfaceId) {
    const standing = surfaces.find((s) => s.id === cat.surfaceId);
    if (standing && (standing.carryDx || standing.carryDz)) {
      cat.x += standing.carryDx ?? 0;
      cat.z += standing.carryDz ?? 0;
    }
  }

  if (!cat.sleeping) {
    cat.crouching = !cat.swimming && input.crouch;
    cat.purring = !cat.swimming && (input.purr || cat.purrTimer > 0);
    cat.sprinting = input.sprint && !cat.crouching && wishMag > 0.1;
  }

  // Trigger Shadow Dash [KeyX] — fast invincible directional burst on land or in air
  const DASH_DURATION = 0.20;
  const DASH_COOLDOWN = 1.50;
  const DASH_SPEED = 14.5;
  if (input.dashPressed && cat.dashCooldown <= 0 && !cat.swimming) {
    cat.sleeping = false;
    cat.crouching = false;
    cat.gliding = false;
    const dMag = Math.hypot(lookX, lookZ) || 1;
    cat.dashDirX = lookX / dMag;
    cat.dashDirZ = lookZ / dMag;
    cat.dashTimer = DASH_DURATION;
    cat.dashCooldown = DASH_COOLDOWN;
    cat.vx = cat.dashDirX * DASH_SPEED;
    cat.vz = cat.dashDirZ * DASH_SPEED;
    if (!cat.grounded) {
      cat.vy = Math.max(cat.vy, 0.85);
    }
    cat.yaw = Math.atan2(cat.dashDirX, cat.dashDirZ);
    result.dashedNow = true;
  }

  const wasGliding = cat.gliding;
  const glideEligible =
    !cat.grounded &&
    !cat.swimming &&
    cat.dashTimer <= 0 &&
    Boolean(input.jumpHeld) &&
    cat.vy < -0.35;
  cat.gliding = glideEligible;
  if (cat.gliding && !wasGliding) {
    result.glideStarted = true;
  }

  const warmthMul = cat.warmthTimer > 0 ? 1.16 : 1.0;
  const flowBoostMul =
    cat.parkourChain >= 2 ? 1 + Math.min(3, cat.parkourChain - 1) * 0.04 : 1.0;
  const sprintMul = (modifiers.sprintMult ?? 1.0) * flowBoostMul;
  const swimMul = modifiers.swimMult ?? 1.0;
  const glideMul = cat.gliding ? 1.28 : 1.0;
  let speed = tuning.walkSpeed * warmthMul * glideMul * (cat.parkourChain >= 2 ? 1.04 : 1.0);
  if (cat.swimming) {
    speed = (cat.sprinting ? tuning.walkSpeed * 0.96 : tuning.walkSpeed * 0.74) * warmthMul * swimMul;
  } else if (cat.crouching) {
    speed = (cat.purring ? tuning.crouchSpeed * 0.5 : tuning.crouchSpeed) * warmthMul;
  } else if (cat.sprinting) {
    speed = (cat.frightTimer > 0 ? tuning.sprintSpeed * 1.15 : tuning.sprintSpeed) * warmthMul * sprintMul;
  }

  if (cat.dashTimer > 0) {
    cat.vx = cat.dashDirX * DASH_SPEED;
    cat.vz = cat.dashDirZ * DASH_SPEED;
  } else {
    const accel = cat.swimming ? 8.5 : cat.grounded ? 18 : cat.gliding ? 11 : 8;
    const targetVx = cat.sleeping ? 0 : wishX * speed;
    const targetVz = cat.sleeping ? 0 : wishZ * speed;
    const blend = 1 - Math.exp(-accel * dt);
    cat.vx += (targetVx - cat.vx) * blend;
    cat.vz += (targetVz - cat.vz) * blend;
  }

  const horizSpeed = Math.hypot(cat.vx, cat.vz);
  if (horizSpeed > 0.25) {
    const targetYaw = Math.atan2(cat.vx, cat.vz);
    let diff = targetYaw - cat.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const prevYaw = cat.yaw;
    cat.yaw += diff * Math.min(1, (cat.swimming ? tuning.turnSpeed * 0.65 : tuning.turnSpeed) * dt);
    cat.yawRate = (cat.yaw - prevYaw) / Math.max(1e-4, dt);
    cat.gaitPhase += dt * (4 + horizSpeed * 1.6);
    cat.idleTime = 0;
  } else {
    cat.yawRate *= 0.8;
    if (cat.swimming) {
      cat.gaitPhase += dt * 3.2; // gentle water treading
    }
    cat.idleTime = cat.grounded ? cat.idleTime + dt : 0;
  }

  const effectiveTuning: ParkourTuning =
    modifiers.ledgeSnapBonus && modifiers.ledgeSnapBonus > 0
      ? { ...tuning, ledgeSnapRange: tuning.ledgeSnapRange + modifiers.ledgeSnapBonus }
      : tuning;

  cat.targetLedge =
    cat.grounded || cat.coyoteTimer > 0 || cat.swimming
      ? findBestLedgeCandidate(cat, lookX, lookZ, surfaces, effectiveTuning)
      : null;

  if (cat.grounded || cat.swimming) {
    cat.airJumpsRemaining = maxAir;
  }

  // Phase 1: Grounded Jump Anticipation (0.10s deep crouch before liftoff)
  let launchReadyFromPrep = false;
  if (cat.jumpPrepTimer > 0) {
    if (!cat.grounded || cat.swimming || cat.dashTimer > 0) {
      cat.jumpPrepTimer = 0;
    } else {
      cat.jumpPrepTimer = Math.max(0, cat.jumpPrepTimer - dt);
      cat.vx *= 0.80;
      cat.vz *= 0.80;
      if (cat.jumpPrepTimer <= 0) {
        launchReadyFromPrep = true;
      } else {
        result.anticipating = true;
      }
    }
  } else if (cat.jumpBufferTimer > 0 && cat.grounded && !cat.swimming && cat.dashTimer <= 0) {
    cat.jumpBufferTimer = 0;
    cat.sleeping = false;
    cat.landTimer = 0;
    cat.jumpPrepDuration = 0.10;
    cat.jumpPrepTimer = 0.10;
    result.anticipating = true;
  }

  // Execute launch once 0.10s anticipation finishes (or immediately for coyote/swim rescues, wall-kicks, double jumps)
  if (
    launchReadyFromPrep ||
    (cat.jumpBufferTimer > 0 && !cat.grounded && (cat.coyoteTimer > 0 || cat.swimming))
  ) {
    cat.jumpBufferTimer = 0;
    cat.jumpPrepTimer = 0;
    cat.coyoteTimer = 0;
    cat.grounded = false;
    cat.swimming = false;
    cat.idleTime = 0;
    cat.landTimer = 0;
    cat.jumpAnimTimer = 0;
    cat.airSpinTimer = 0;
    cat.airJumpsRemaining = maxAir;
    cat.parkourChain = cat.parkourFlowTimer > 0 ? Math.min(9, cat.parkourChain + 1) : 1;
    cat.parkourFlowTimer = 4.2;
    result.jumped = true;

    if (cat.targetLedge) {
      const dy = Math.max(0, cat.targetLedge.y - cat.y);
      cat.hopActive = true;
      cat.hopElapsed = 0;
      cat.hopDuration = Math.max(
        0.32,
        Math.min(0.58, 0.24 + cat.targetLedge.distance * 0.06 + dy * 0.065)
      );
      cat.hopStartX = cat.x;
      cat.hopStartY = cat.y;
      cat.hopStartZ = cat.z;
      cat.hopTargetX = cat.targetLedge.x;
      cat.hopTargetY = cat.targetLedge.y;
      cat.hopTargetZ = cat.targetLedge.z;
      cat.hopSurfaceId = cat.targetLedge.surfaceId;
      const arcPeak = Math.max(0.48, Math.abs(cat.hopTargetY - cat.hopStartY) * 0.25 + tuning.ledgeArcBoost * 0.74);
      const controlY = Math.max(cat.hopStartY, cat.hopTargetY) + arcPeak;
      cat.vy = (2 * (controlY - cat.hopStartY)) / cat.hopDuration;
      result.isLedgeHop = true;
      return result;
    }

    // Snappy initial ascent velocity (faster than descent)
    cat.vy = tuning.jumpVelocity * 1.15;
    if (wishMag > 0.1) {
      cat.vx += wishX * 1.05;
      cat.vz += wishZ * 1.05;
    }
    cat.surfaceId = null;
  } else if (
    cat.jumpBufferTimer > 0 &&
    !cat.grounded &&
    !cat.swimming &&
    cat.wallContactTimer > 0
  ) {
    // Agile feline wall-kick rebound off vertical masonry/crates without spending double-jump
    cat.jumpBufferTimer = 0;
    cat.wallContactTimer = 0;
    cat.landTimer = 0;
    cat.jumpAnimTimer = 0;
    cat.airSpinTimer = 0.28;
    cat.vy = tuning.jumpVelocity * 1.06;
    const kickDirX = cat.lastWallNormalX + wishX * 0.38;
    const kickDirZ = cat.lastWallNormalZ + wishZ * 0.38;
    const kickMag = Math.hypot(kickDirX, kickDirZ) || 1;
    cat.vx = (kickDirX / kickMag) * 5.6;
    cat.vz = (kickDirZ / kickMag) * 5.6;
    cat.yaw = Math.atan2(cat.vx, cat.vz);
    cat.surfaceId = null;
    cat.parkourChain = Math.min(9, cat.parkourChain + 1);
    cat.parkourFlowTimer = 4.4;
    result.jumped = true;
    result.wallKicked = true;
  } else if (
    cat.jumpBufferTimer > 0 &&
    !cat.grounded &&
    !cat.swimming &&
    cat.airJumpsRemaining > 0
  ) {
    cat.jumpBufferTimer = 0;
    cat.airJumpsRemaining--;
    cat.landTimer = 0;
    cat.jumpAnimTimer = 0;
    cat.airSpinTimer = 0.32;
    cat.vy = tuning.jumpVelocity * 1.10;
    if (wishMag > 0.1) {
      cat.vx += wishX * 2.2;
      cat.vz += wishZ * 2.2;
    }
    cat.surfaceId = null;
    cat.parkourChain = Math.min(9, cat.parkourChain + 1);
    cat.parkourFlowTimer = 4.2;
    result.jumped = true;
    result.doubleJumped = true;
  }

  const prevY = cat.y;
  cat.x += cat.vx * dt;
  cat.z += cat.vz * dt;
  if (cat.swimming) {
    const waterFloatY = -0.2;
    const buoyancy = (waterFloatY - cat.y) * 32.0 - cat.vy * 9.5;
    cat.vy += buoyancy * dt;
    cat.y += cat.vy * dt;
  } else if (cat.dashTimer > 0) {
    cat.vy -= tuning.gravity * 0.16 * dt;
    cat.y += cat.vy * dt;
  } else {
    // Asymmetric platformer gravity: faster upward ascent vs lighter, floatier descent
    const grav = cat.vy > 0 ? tuning.gravity * 1.35 : tuning.gravity * 0.68;
    cat.vy -= grav * dt;
    if (cat.gliding) {
      cat.vy = Math.max(cat.vy, -1.85);
    } else {
      cat.vy = Math.max(cat.vy, -10.8);
    }
    cat.y += cat.vy * dt;
  }

  // Keep Pip within active Act bounds
  const activeBounds = modifiers.bounds ?? WORLD_BOUNDS;
  cat.x = Math.max(activeBounds.minX, Math.min(activeBounds.maxX, cat.x));
  cat.z = Math.max(activeBounds.minZ, Math.min(activeBounds.maxZ, cat.z));

  // 0. While swimming toward a low shore/quay/skiff/step edge (<= 0.75m), let Pip scramble smoothly onto dry land
  if (cat.swimming && (wishMag > 0.1 || horizSpeed > 0.35)) {
    for (const s of surfaces) {
      if (s.visible === false || s.topY > 0.75 || s.topY < 0.15) continue;
      if (!isPointOverSurface(cat.x, cat.z, s, 0.34)) continue;
      const surfY = getSurfaceHeightAt(s, cat.x, cat.z);
      if (surfY - cat.y <= 0.82) {
        const b = surfaceBounds(s);
        cat.x = Math.max(b.minX + 0.22, Math.min(b.maxX - 0.22, cat.x));
        cat.z = Math.max(b.minZ + 0.22, Math.min(b.maxZ - 0.22, cat.z));
        cat.y = surfY;
        cat.vy = 0;
        cat.swimming = false;
        cat.grounded = true;
        cat.surfaceId = s.id;
        cat.coyoteTimer = tuning.coyoteTime;
        cat.airJumpsRemaining = maxAir;
        result.landedSurfaceId = s.id;
        return result;
      }
    }
  }

  // 1. Solid architectural obstacle colliders (masonry walls, dormer walls, chimneys, crates)
  // Check against prevY so dropping cleanly from a higher roof onto a lower building's deck
  // lands on top of the roof instead of being shoved laterally by its lower masonry body.
  const catRadius = 0.22;
  const catHeight = 0.45;
  let touchedWall = false;
  for (const c of colliders) {
    if (prevY + catHeight > c.minY + 0.04 && prevY < c.maxY - 0.04) {
      if (pushOutOfBoxXZ(cat, c.minX, c.maxX, c.minZ, c.maxZ, catRadius)) {
        touchedWall = true;
      }
    }
  }
  if (touchedWall && !cat.grounded && !cat.swimming && cat.airTime > 0.05) {
    cat.wallContactTimer = 0.18;
  }

  // 2. Prevent clipping inside pitched gable roof interiors from below or gable ends
  for (const s of surfaces) {
    if (!s.gable || s.visible === false) continue;
    const b = surfaceBounds(s);
    if (
      cat.x > b.minX - catRadius &&
      cat.x < b.maxX + catRadius &&
      cat.z > b.minZ - catRadius &&
      cat.z < b.maxZ + catRadius
    ) {
      const slopeY = getSurfaceHeightAt(s, cat.x, cat.z);
      if (prevY < slopeY - 0.24 && prevY + catHeight > s.gable.eaveY - 0.05) {
        if (pushOutOfBoxXZ(cat, b.minX, b.maxX, b.minZ, b.maxZ, catRadius)) {
          if (!cat.grounded && !cat.swimming && cat.airTime > 0.05) {
            cat.wallContactTimer = 0.18;
          }
        }
      }
    }
  }

  // 3. Resolve landing / walking on highest supporting surface beneath cat (including pitched gable & ramp slopes)
  let landedSurface: WalkSurface | null = null;
  let bestTopY = -Infinity;
  for (const s of surfaces) {
    if (!isPointOverSurface(cat.x, cat.z, s)) continue;
    const surfY = getSurfaceHeightAt(s, cat.x, cat.z);
    const isSloped = Boolean(s.gable || s.ramp);
    const isGear = s.kind === 'gear';
    const snapMargin = (isSloped || isGear) && cat.surfaceId === s.id ? 0.52 : 0.18;
    const stepUpAllowance = isGear ? 0.58 : isSloped ? 0.44 : (cat.surfaceId === s.id ? 0.35 : 0.26);
    if (cat.vy <= 0 && prevY >= surfY - stepUpAllowance && cat.y <= surfY + snapMargin) {
      if (surfY > bestTopY) {
        bestTopY = surfY;
        landedSurface = s;
      }
    }
  }

  if (landedSurface) {
    const wasAirborne = !cat.grounded;
    if (wasAirborne) {
      cat.lastAirVy = cat.vy;
      cat.landImpact = Math.min(1, Math.max(0.45, Math.abs(cat.vy) / 8.5));
      cat.landTimer = 0.26;
      cat.landingElapsed = 0;
      cat.airSpinTimer = 0;
      cat.wallContactTimer = 0;
      cat.airTime = 0;
    } else {
      cat.lastAirVy = 0;
    }
    cat.y = bestTopY;
    cat.vy = 0;
    cat.grounded = true;
    cat.swimming = false;
    cat.gliding = false;
    cat.coyoteTimer = tuning.coyoteTime;
    cat.airJumpsRemaining = maxAir;
    cat.surfaceId = landedSurface.id;
    const grad = getSurfaceGradientAt(landedSurface, cat.x, cat.z);
    const fX = Math.sin(cat.yaw);
    const fZ = Math.cos(cat.yaw);
    const rX = Math.cos(cat.yaw);
    const rZ = -Math.sin(cat.yaw);
    const targetPitch = -(grad.dYdX * fX + grad.dYdZ * fZ) * 0.72;
    const targetRoll = (grad.dYdX * rX + grad.dYdZ * rZ) * 0.68;
    cat.slopePitch += (targetPitch - cat.slopePitch) * Math.min(1, 14 * dt);
    cat.slopeRoll += (targetRoll - cat.slopeRoll) * Math.min(1, 14 * dt);
    if (wasAirborne) {
      result.landedSurfaceId = landedSurface.id;
    }
  } else {
    cat.grounded = false;
    cat.surfaceId = null;
    cat.coyoteTimer = Math.max(0, cat.coyoteTimer - dt);
    cat.slopePitch *= 0.88;
    cat.slopeRoll *= 0.88;

    if (!cat.swimming && cat.y <= -0.04) {
      cat.swimming = true;
      cat.gliding = false;
      cat.dashTimer = 0;
      cat.airSpinTimer = 0;
      cat.landTimer = 0;
      cat.wallContactTimer = 0;
      cat.parkourChain = 0;
      cat.parkourFlowTimer = 0;
      cat.lastAirVy = cat.vy;
      cat.vy = Math.max(-1.6, cat.vy * 0.18);
      cat.slopePitch = 0;
      cat.slopeRoll = 0;
      result.enteredWater = true;
    }
  }

  return result;
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Pure ray-vs-AABB camera pull-in so walls and tall quay masonry never block sightlines
 * between Pip and the orbit camera (zero per-frame heap allocations).
 */
export function pullInCameraFromColliders(
  target: Vec3Like,
  desiredPos: Vec3Like,
  colliders: SolidCollider[],
  outPos: Vec3Like,
  wallMargin = 0.28
): Vec3Like {
  const dx = desiredPos.x - target.x;
  const dy = desiredPos.y - target.y;
  const dz = desiredPos.z - target.z;
  const fullDist = Math.hypot(dx, dy, dz);
  if (fullDist < 1e-4) {
    outPos.x = desiredPos.x;
    outPos.y = desiredPos.y;
    outPos.z = desiredPos.z;
    return outPos;
  }

  let bestT = 1.0;
  const minDist = 1.15;
  const minT = Math.min(0.95, minDist / fullDist);

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    // Quick broad-phase check in XZ/Y
    const minX = Math.min(target.x, desiredPos.x);
    const maxX = Math.max(target.x, desiredPos.x);
    const minZ = Math.min(target.z, desiredPos.z);
    const maxZ = Math.max(target.z, desiredPos.z);
    if (c.maxX < minX || c.minX > maxX || c.maxZ < minZ || c.minZ > maxZ) continue;
    if (c.maxY < Math.min(target.y, desiredPos.y) || c.minY > Math.max(target.y, desiredPos.y)) continue;

    // Slab intersection on [target -> desiredPos] normalized parameter t in [0, 1]
    let tmin = 0;
    let tmax = 1;

    const invDx = Math.abs(dx) > 1e-6 ? 1 / dx : null;
    if (invDx === null) {
      if (target.x < c.minX || target.x > c.maxX) continue;
    } else {
      let tx1 = (c.minX - target.x) * invDx;
      let tx2 = (c.maxX - target.x) * invDx;
      if (tx1 > tx2) {
        const tmp = tx1;
        tx1 = tx2;
        tx2 = tmp;
      }
      tmin = Math.max(tmin, tx1);
      tmax = Math.min(tmax, tx2);
      if (tmin > tmax) continue;
    }

    const invDy = Math.abs(dy) > 1e-6 ? 1 / dy : null;
    if (invDy === null) {
      if (target.y < c.minY || target.y > c.maxY) continue;
    } else {
      let ty1 = (c.minY - target.y) * invDy;
      let ty2 = (c.maxY - target.y) * invDy;
      if (ty1 > ty2) {
        const tmp = ty1;
        ty1 = ty2;
        ty2 = tmp;
      }
      tmin = Math.max(tmin, ty1);
      tmax = Math.min(tmax, ty2);
      if (tmin > tmax) continue;
    }

    const invDz = Math.abs(dz) > 1e-6 ? 1 / dz : null;
    if (invDz === null) {
      if (target.z < c.minZ || target.z > c.maxZ) continue;
    } else {
      let tz1 = (c.minZ - target.z) * invDz;
      let tz2 = (c.maxZ - target.z) * invDz;
      if (tz1 > tz2) {
        const tmp = tz1;
        tz1 = tz2;
        tz2 = tmp;
      }
      tmin = Math.max(tmin, tz1);
      tmax = Math.min(tmax, tz2);
      if (tmin > tmax) continue;
    }

    if (tmin > 0.04 && tmin < bestT) {
      const pullT = Math.max(minT, tmin - wallMargin / fullDist);
      if (pullT < bestT) bestT = pullT;
    }
  }

  outPos.x = target.x + dx * bestT;
  outPos.y = target.y + dy * bestT;
  outPos.z = target.z + dz * bestT;
  return outPos;
}

