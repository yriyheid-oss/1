import type { ActId, WeatherKind } from '../data/acts';

export type DayPhaseName = 'dawn' | 'noon' | 'dusk';

export const DAY_CYCLE_DURATION_SEC = 180;
export const DEFAULT_HARBOR_START_PHASE = 0.06;

export interface RgbTuple {
  r: number;
  g: number;
  b: number;
}

export interface DaylightProfile {
  cyclePhase: number;
  phaseName: DayPhaseName;
  duskFactor: number;
  sunDir: [number, number, number];
  sunColor: RgbTuple;
  sunIntensityMult: number;
  hemiSky: RgbTuple;
  hemiGround: RgbTuple;
  hemiIntensityMult: number;
  skyHorizon: RgbTuple;
  skyMid: RgbTuple;
  skyTop: RgbTuple;
  fogColor: RgbTuple;
  waterReflectTint: RgbTuple;
  windowGlowMult: number;
  lanternGlowMult: number;
  fireflyVisibility: number;
}

interface DayKeyframe {
  phase: number;
  sunDir: [number, number, number];
  sunColor: RgbTuple;
  sunIntensityMult: number;
  hemiSky: RgbTuple;
  hemiGround: RgbTuple;
  hemiIntensityMult: number;
  skyHorizon: RgbTuple;
  skyMid: RgbTuple;
  skyTop: RgbTuple;
  fogColor: RgbTuple;
  waterReflectTint: RgbTuple;
  duskFactor: number;
  windowGlowMult: number;
  lanternGlowMult: number;
  fireflyVisibility: number;
}

function rgb(hex: string): RgbTuple {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RgbTuple, b: RgbTuple, t: number): RgbTuple {
  return {
    r: lerpNum(a.r, b.r, t),
    g: lerpNum(a.g, b.g, t),
    b: lerpNum(a.b, b.b, t),
  };
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

const HARBOR_KEYFRAMES: readonly DayKeyframe[] = [
  {
    phase: 0.0, // Golden Copper Dawn
    sunDir: normalize3(0.64, 0.30, 0.71),
    sunColor: rgb('#FFC98B'),
    sunIntensityMult: 1.0,
    hemiSky: rgb('#75A3AD'),
    hemiGround: rgb('#132024'),
    hemiIntensityMult: 1.0,
    skyHorizon: rgb('#2A484E'),
    skyMid: rgb('#203F48'),
    skyTop: rgb('#0E1E24'),
    fogColor: rgb('#1A2E33'),
    waterReflectTint: rgb('#1B4249'),
    duskFactor: 0.14,
    windowGlowMult: 1.05,
    lanternGlowMult: 1.0,
    fireflyVisibility: 0.38,
  },
  {
    phase: 0.34, // Bright Venetian Noon
    sunDir: normalize3(0.32, 0.86, 0.38),
    sunColor: rgb('#FFF1D6'),
    sunIntensityMult: 1.24,
    hemiSky: rgb('#A4DBE4'),
    hemiGround: rgb('#243C42'),
    hemiIntensityMult: 1.14,
    skyHorizon: rgb('#5A96A3'),
    skyMid: rgb('#3D7D8E'),
    skyTop: rgb('#1D5367'),
    fogColor: rgb('#366874'),
    waterReflectTint: rgb('#3A7E8B'),
    duskFactor: 0.0,
    windowGlowMult: 0.45,
    lanternGlowMult: 0.58,
    fireflyVisibility: 0.12,
  },
  {
    phase: 0.70, // Starry Lantern Dusk
    sunDir: normalize3(-0.70, 0.16, 0.69),
    sunColor: rgb('#FF8C5A'),
    sunIntensityMult: 0.82,
    hemiSky: rgb('#5E72A2'),
    hemiGround: rgb('#101724'),
    hemiIntensityMult: 0.92,
    skyHorizon: rgb('#462E3C'),
    skyMid: rgb('#1C263D'),
    skyTop: rgb('#08101F'),
    fogColor: rgb('#161F31'),
    waterReflectTint: rgb('#25314D'),
    duskFactor: 1.0,
    windowGlowMult: 1.75,
    lanternGlowMult: 1.55,
    fireflyVisibility: 1.0,
  },
  {
    phase: 1.0, // Wraps smoothly back to Dawn
    sunDir: normalize3(0.64, 0.30, 0.71),
    sunColor: rgb('#FFC98B'),
    sunIntensityMult: 1.0,
    hemiSky: rgb('#75A3AD'),
    hemiGround: rgb('#132024'),
    hemiIntensityMult: 1.0,
    skyHorizon: rgb('#2A484E'),
    skyMid: rgb('#203F48'),
    skyTop: rgb('#0E1E24'),
    fogColor: rgb('#1A2E33'),
    waterReflectTint: rgb('#1B4249'),
    duskFactor: 0.14,
    windowGlowMult: 1.05,
    lanternGlowMult: 1.0,
    fireflyVisibility: 0.38,
  },
];

export function computeDaylightProfile(
  rawCyclePhase: number,
  weather: WeatherKind,
  actId: ActId
): DaylightProfile {
  const phase = ((rawCyclePhase % 1) + 1) % 1;

  // Non-Harbor acts keep dedicated subterranean/summit art direction
  if (actId === 'cistern') {
    return {
      cyclePhase: phase,
      phaseName: 'dusk',
      duskFactor: 0.25,
      sunDir: normalize3(0.4, 0.8, 0.4),
      sunColor: rgb('#7DE2C6'),
      sunIntensityMult: weather === 'rain' ? 0.82 : 1.0,
      hemiSky: rgb('#3B847E'),
      hemiGround: rgb('#0B1618'),
      hemiIntensityMult: 1.0,
      skyHorizon: rgb('#0F2224'),
      skyMid: rgb('#0F2224'),
      skyTop: rgb('#091416'),
      fogColor: rgb('#11292A'),
      waterReflectTint: rgb('#144442'),
      windowGlowMult: 1.25,
      lanternGlowMult: 1.2,
      fireflyVisibility: 0.65,
    };
  }

  if (actId === 'spire') {
    // High moonlit clockwork summit with drifting auroral dusk shimmer
    const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    return {
      cyclePhase: phase,
      phaseName: 'dusk',
      duskFactor: 0.65 + pulse * 0.25,
      sunDir: normalize3(-0.35 + pulse * 0.25, 0.65, 0.62),
      sunColor: rgb('#FFD57E'),
      sunIntensityMult: weather === 'rain' ? 0.80 : 1.0,
      hemiSky: rgb('#6C7CD6'),
      hemiGround: rgb('#121324'),
      hemiIntensityMult: 1.0,
      skyHorizon: rgb('#1C2142'),
      skyMid: rgb('#131630'),
      skyTop: rgb('#080A19'),
      fogColor: rgb('#171936'),
      waterReflectTint: rgb('#2A2F5D'),
      windowGlowMult: 1.45,
      lanternGlowMult: 1.35,
      fireflyVisibility: 0.82,
    };
  }

  // Smooth Harbor Dawn -> Golden Noon -> Starry Dusk interpolation
  let k0 = HARBOR_KEYFRAMES[0];
  let k1 = HARBOR_KEYFRAMES[1];
  for (let i = 0; i < HARBOR_KEYFRAMES.length - 1; i++) {
    if (phase >= HARBOR_KEYFRAMES[i].phase && phase <= HARBOR_KEYFRAMES[i + 1].phase) {
      k0 = HARBOR_KEYFRAMES[i];
      k1 = HARBOR_KEYFRAMES[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, k1.phase - k0.phase);
  const rawT = Math.min(1, Math.max(0, (phase - k0.phase) / span));
  const t = rawT * rawT * (3 - 2 * rawT); // smoothstep

  const sunDir = normalize3(
    lerpNum(k0.sunDir[0], k1.sunDir[0], t),
    lerpNum(k0.sunDir[1], k1.sunDir[1], t),
    lerpNum(k0.sunDir[2], k1.sunDir[2], t)
  );
  let sunColor = lerpRgb(k0.sunColor, k1.sunColor, t);
  let sunIntensityMult = lerpNum(k0.sunIntensityMult, k1.sunIntensityMult, t);
  let hemiSky = lerpRgb(k0.hemiSky, k1.hemiSky, t);
  const hemiGround = lerpRgb(k0.hemiGround, k1.hemiGround, t);
  const hemiIntensityMult = lerpNum(k0.hemiIntensityMult, k1.hemiIntensityMult, t);
  let skyHorizon = lerpRgb(k0.skyHorizon, k1.skyHorizon, t);
  let skyMid = lerpRgb(k0.skyMid, k1.skyMid, t);
  let skyTop = lerpRgb(k0.skyTop, k1.skyTop, t);
  let fogColor = lerpRgb(k0.fogColor, k1.fogColor, t);
  const waterReflectTint = lerpRgb(k0.waterReflectTint, k1.waterReflectTint, t);
  const duskFactor = lerpNum(k0.duskFactor, k1.duskFactor, t);
  const windowGlowMult = lerpNum(k0.windowGlowMult, k1.windowGlowMult, t);
  const lanternGlowMult = lerpNum(k0.lanternGlowMult, k1.lanternGlowMult, t);
  const fireflyVisibility = lerpNum(k0.fireflyVisibility, k1.fireflyVisibility, t);

  if (weather === 'mist') {
    const mistCol = rgb('#4D727A');
    skyHorizon = lerpRgb(skyHorizon, mistCol, 0.32);
    skyMid = lerpRgb(skyMid, mistCol, 0.25);
    fogColor = lerpRgb(fogColor, mistCol, 0.35);
    sunIntensityMult *= 0.86;
  } else if (weather === 'rain') {
    const stormCol = rgb('#243844');
    skyHorizon = lerpRgb(skyHorizon, stormCol, 0.42);
    skyMid = lerpRgb(skyMid, stormCol, 0.38);
    skyTop = lerpRgb(skyTop, stormCol, 0.35);
    fogColor = lerpRgb(fogColor, stormCol, 0.44);
    hemiSky = lerpRgb(hemiSky, rgb('#618594'), 0.35);
    sunColor = lerpRgb(sunColor, rgb('#C8DCE4'), 0.28);
    sunIntensityMult *= 0.78;
  }

  let phaseName: DayPhaseName = 'dawn';
  if (phase >= 0.16 && phase < 0.54) {
    phaseName = 'noon';
  } else if (phase >= 0.54 && phase < 0.88) {
    phaseName = 'dusk';
  }

  return {
    cyclePhase: phase,
    phaseName,
    duskFactor,
    sunDir,
    sunColor,
    sunIntensityMult,
    hemiSky,
    hemiGround,
    hemiIntensityMult,
    skyHorizon,
    skyMid,
    skyTop,
    fogColor,
    waterReflectTint,
    windowGlowMult,
    lanternGlowMult,
    fireflyVisibility,
  };
}

export interface AstrolabeReadout {
  phaseName: DayPhaseName;
  cyclePhase: number;
  sunAngleDeg: number;
  moonAngleDeg: number;
  horizonWarmth: number;
}

export function computeAstrolabeReadout(
  rawCyclePhase: number,
  actId: ActId
): AstrolabeReadout {
  const cyclePhase = ((rawCyclePhase % 1) + 1) % 1;
  if (actId === 'cistern' || actId === 'spire') {
    return {
      phaseName: 'dusk',
      cyclePhase,
      sunAngleDeg: 215,
      moonAngleDeg: 35,
      horizonWarmth: actId === 'spire' ? 0.55 : 0.25,
    };
  }
  let phaseName: DayPhaseName = 'dawn';
  if (cyclePhase >= 0.16 && cyclePhase < 0.54) {
    phaseName = 'noon';
  } else if (cyclePhase >= 0.54 && cyclePhase < 0.88) {
    phaseName = 'dusk';
  }
  // Map 0.06 (dawn east) -> 0.34 (noon zenith = -90deg top) -> 0.70 (dusk west) smoothly on dial
  const sunAngleDeg = ((cyclePhase - 0.34) * 360 - 90 + 720) % 360;
  const moonAngleDeg = (sunAngleDeg + 180) % 360;
  const horizonWarmth =
    phaseName === 'dawn' ? 0.72 : phaseName === 'dusk' ? 0.92 : 0.18;
  return {
    phaseName,
    cyclePhase,
    sunAngleDeg,
    moonAngleDeg,
    horizonWarmth,
  };
}

export interface CameraDynamicsInput {
  horizSpeed: number;
  gliding: boolean;
  dashing: boolean;
  swimming: boolean;
  sprinting: boolean;
}

export interface CameraDynamicsOutput {
  targetFov: number;
  speedLineIntensity: number;
  lookAheadFactor: number;
  distOffset: number;
}

export function computeCameraDynamics(input: CameraDynamicsInput): CameraDynamicsOutput {
  const clampedSpeed = Math.max(0, Math.min(18, input.horizSpeed));
  const speedNorm = Math.max(0, Math.min(1, (clampedSpeed - 2.2) / 7.5));

  let targetFov = 52.0 + speedNorm * 2.4;
  if (input.gliding) targetFov = Math.max(targetFov, 55.2);
  if (input.dashing) targetFov = 59.0;
  else if (input.swimming) targetFov = 51.2 + speedNorm * 1.1;

  let speedLineIntensity = 0;
  if (input.dashing) {
    speedLineIntensity = 1.0;
  } else if (input.gliding) {
    speedLineIntensity = 0.68;
  } else if (clampedSpeed > 5.4 && !input.swimming) {
    speedLineIntensity = Math.min(0.82, ((clampedSpeed - 5.4) / 4.2) * (input.sprinting ? 0.82 : 0.45));
  }

  const lookAheadFactor = input.dashing ? 0.22 : input.gliding ? 0.19 : 0.14;
  const distOffset = input.dashing ? 0.28 : input.gliding ? 0.32 : input.swimming ? -0.18 : 0;

  return {
    targetFov,
    speedLineIntensity,
    lookAheadFactor,
    distOffset,
  };
}

