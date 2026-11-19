export type DifficultyLevel = 'relaxed' | 'standard' | 'challenger';
export type GraphicsLevel = 'low' | 'medium' | 'high' | 'ultra';
export type CatBreedId = 'ginger' | 'tuxedo' | 'siamese' | 'calico' | 'russian_blue' | 'void';

export const CAT_BREED_ORDER: readonly CatBreedId[] = [
  'ginger',
  'tuxedo',
  'siamese',
  'calico',
  'russian_blue',
  'void',
] as const;

export interface CatBreedAnatomy {
  bodyScale: [number, number, number];
  headScale: [number, number, number];
  muzzleScale: [number, number, number];
  earScale: [number, number, number];
  earTiltZ: number;
  earFold: boolean;
  earTufts: boolean;
  legRadiusScale: number;
  legLengthScale: number;
  tailRadiusScale: number;
  tailLengthScale: number;
  bobtail: boolean;
  neckFluff: number;
  coatGloss: number;
}

export interface CatBreedVisualSpec {
  id: CatBreedId;
  coatHex: string;
  stripeHex: string;
  patchHex: string;
  creamHex: string;
  earHex: string;
  pawHex: string;
  tailTipHex: string;
  noseHex: string;
  eyeHex: string;
  eyeEmissiveHex: string;
  collarHex: string;
  sheenHex: string;
  pattern: 'tabby' | 'tuxedo' | 'points' | 'calico' | 'solid';
  swatchPrimary: string;
  swatchSecondary: string;
  anatomy: CatBreedAnatomy;
}

export const CAT_BREED_SPECS: Record<CatBreedId, CatBreedVisualSpec> = {
  ginger: {
    id: 'ginger',
    coatHex: '#C8662B',
    stripeHex: '#944118',
    patchHex: '#E59454',
    creamHex: '#EAD0AA',
    earHex: '#241915',
    pawHex: '#241915',
    tailTipHex: '#241915',
    noseHex: '#8C4A3E',
    eyeHex: '#F7C658',
    eyeEmissiveHex: '#E39A32',
    collarHex: '#234B43',
    sheenHex: '#FFD9A8',
    pattern: 'tabby',
    swatchPrimary: '#C8662B',
    swatchSecondary: '#EAD0AA',
    anatomy: {
      bodyScale: [1.0, 1.0, 1.0],
      headScale: [1.0, 1.0, 1.0],
      muzzleScale: [1.0, 1.0, 1.0],
      earScale: [1.0, 1.0, 1.0],
      earTiltZ: 0.24,
      earFold: false,
      earTufts: false,
      legRadiusScale: 1.0,
      legLengthScale: 1.0,
      tailRadiusScale: 1.0,
      tailLengthScale: 1.0,
      bobtail: false,
      neckFluff: 1.0,
      coatGloss: 0.08,
    },
  },
  tuxedo: {
    id: 'tuxedo',
    coatHex: '#1E2126',
    stripeHex: '#111317',
    patchHex: '#2E333C',
    creamHex: '#F4F1EA',
    earHex: '#181A1F',
    pawHex: '#F4F1EA',
    tailTipHex: '#F4F1EA',
    noseHex: '#C97F84',
    eyeHex: '#6CE08A',
    eyeEmissiveHex: '#35A857',
    collarHex: '#9E322B',
    sheenHex: '#A6B7CC',
    pattern: 'tuxedo',
    swatchPrimary: '#1E2126',
    swatchSecondary: '#F4F1EA',
    anatomy: {
      // Maine Coon Tuxedo: broad lion-like ruff, lynx ear tufts, thick plush plume tail
      bodyScale: [1.14, 1.06, 1.08],
      headScale: [1.06, 1.04, 1.06],
      muzzleScale: [1.12, 1.05, 1.08],
      earScale: [1.05, 1.24, 0.96],
      earTiltZ: 0.20,
      earFold: false,
      earTufts: true,
      legRadiusScale: 1.12,
      legLengthScale: 1.02,
      tailRadiusScale: 1.48,
      tailLengthScale: 1.14,
      bobtail: false,
      neckFluff: 1.38,
      coatGloss: 0.04,
    },
  },
  siamese: {
    id: 'siamese',
    coatHex: '#E8D8C2',
    stripeHex: '#D5C0A3',
    patchHex: '#C9AF8E',
    creamHex: '#F3E8D8',
    earHex: '#3D2A21',
    pawHex: '#3D2A21',
    tailTipHex: '#3D2A21',
    noseHex: '#4B342A',
    eyeHex: '#5CC9FF',
    eyeEmissiveHex: '#2991D9',
    collarHex: '#266973',
    sheenHex: '#FFF4E0',
    pattern: 'points',
    swatchPrimary: '#E8D8C2',
    swatchSecondary: '#3D2A21',
    anatomy: {
      // Oriental Siamese: slender lithe frame, tall flared wedge ears, long whip tail
      bodyScale: [0.83, 0.94, 1.10],
      headScale: [0.90, 0.96, 1.12],
      muzzleScale: [0.86, 0.90, 1.20],
      earScale: [1.12, 1.34, 0.80],
      earTiltZ: 0.38,
      earFold: false,
      earTufts: false,
      legRadiusScale: 0.82,
      legLengthScale: 1.09,
      tailRadiusScale: 0.72,
      tailLengthScale: 1.20,
      bobtail: false,
      neckFluff: 0.85,
      coatGloss: 0.24,
    },
  },
  calico: {
    id: 'calico',
    coatHex: '#EFEAE0',
    stripeHex: '#D97B34',
    patchHex: '#2D2724',
    creamHex: '#F6F2EA',
    earHex: '#D97B34',
    pawHex: '#F6F2EA',
    tailTipHex: '#2D2724',
    noseHex: '#D8827B',
    eyeHex: '#A7D856',
    eyeEmissiveHex: '#73A628',
    collarHex: '#C2742B',
    sheenHex: '#FFEBD1',
    pattern: 'calico',
    swatchPrimary: '#EFEAE0',
    swatchSecondary: '#D97B34',
    anatomy: {
      // Scottish Fold Calico: round owl-like cranium, folded drooping ears, plush compact body
      bodyScale: [1.08, 1.02, 0.93],
      headScale: [1.15, 1.09, 0.95],
      muzzleScale: [1.06, 0.95, 0.84],
      earScale: [0.98, 0.82, 0.88],
      earTiltZ: 0.42,
      earFold: true,
      earTufts: false,
      legRadiusScale: 1.06,
      legLengthScale: 0.92,
      tailRadiusScale: 1.20,
      tailLengthScale: 0.94,
      bobtail: false,
      neckFluff: 1.16,
      coatGloss: 0.06,
    },
  },
  russian_blue: {
    id: 'russian_blue',
    coatHex: '#657786',
    stripeHex: '#4E5D6B',
    patchHex: '#8498A8',
    creamHex: '#92A4B2',
    earHex: '#505F6D',
    pawHex: '#5A6B79',
    tailTipHex: '#485663',
    noseHex: '#3B454F',
    eyeHex: '#4CE68A',
    eyeEmissiveHex: '#23AD5E',
    collarHex: '#7D3554',
    sheenHex: '#CFE1F2',
    pattern: 'solid',
    swatchPrimary: '#657786',
    swatchSecondary: '#92A4B2',
    anatomy: {
      // Kurilian Bobtail: short fluffy pom-pom bobtail, muscular compact shoulders & haunches
      bodyScale: [1.05, 1.02, 0.95],
      headScale: [1.04, 1.02, 1.02],
      muzzleScale: [1.02, 1.0, 0.98],
      earScale: [1.02, 1.08, 0.92],
      earTiltZ: 0.25,
      earFold: false,
      earTufts: false,
      legRadiusScale: 1.08,
      legLengthScale: 1.0,
      tailRadiusScale: 1.65,
      tailLengthScale: 0.28,
      bobtail: true,
      neckFluff: 1.18,
      coatGloss: 0.14,
    },
  },
  void: {
    id: 'void',
    coatHex: '#15161B',
    stripeHex: '#0C0D10',
    patchHex: '#222633',
    creamHex: '#1D1F27',
    earHex: '#111216',
    pawHex: '#111216',
    tailTipHex: '#111216',
    noseHex: '#2C282B',
    eyeHex: '#FFCD4A',
    eyeEmissiveHex: '#F49D1E',
    collarHex: '#D18236',
    sheenHex: '#7F91C9',
    pattern: 'solid',
    swatchPrimary: '#15161B',
    swatchSecondary: '#FFCD4A',
    anatomy: {
      // Bombay Mini-Panther: sleek muscular torso, glossy obsidian coat, rounded ears, athletic stride
      bodyScale: [0.95, 0.98, 1.06],
      headScale: [0.98, 0.96, 1.04],
      muzzleScale: [1.05, 0.96, 1.08],
      earScale: [0.96, 0.90, 0.88],
      earTiltZ: 0.22,
      earFold: false,
      earTufts: false,
      legRadiusScale: 0.94,
      legLengthScale: 1.06,
      tailRadiusScale: 0.92,
      tailLengthScale: 1.12,
      bobtail: false,
      neckFluff: 0.92,
      coatGloss: 0.42,
    },
  },
};

const CAT_BREED_STORAGE_KEY = 'sunken_chime_cat_v1';

export function getSavedCatBreed(): CatBreedId {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(CAT_BREED_STORAGE_KEY);
      if (saved && saved in CAT_BREED_SPECS) {
        return saved as CatBreedId;
      }
    }
  } catch {
    // ignore storage errors
  }
  return 'ginger';
}

export function saveCatBreed(breed: CatBreedId): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CAT_BREED_STORAGE_KEY, breed);
    }
  } catch {
    // ignore storage errors
  }
}

export interface GraphicsSettings {
  level: GraphicsLevel;
  rank: number;
  pixelRatioCap: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  postProcessing: boolean;
  bloomStrength: number;
  glowEffectsEnabled: boolean;
  particlesEnabled: boolean;
  fogDensity: number;
  moteVisibilityRatio: number;
  shaftsEnabled: boolean;
  waterEnvIntensity: number;
  waterQualityTier: number;
  tilt3DEnabled: boolean;
  screenShakeEnabled: boolean;
  aimArcEnabled: boolean;
  heavyDrawEffectsEnabled: boolean;
  uiAnimationsEnabled: boolean;
  complexGradientsEnabled: boolean;
  contactShadowsEnabled: boolean;
  cameraFar: number;
  toneMappingExposure: number;
}

export const GRAPHICS_LEVEL_RANK: Record<GraphicsLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
};

export function isGraphicsAtLeast(current: GraphicsLevel, minLevel: GraphicsLevel): boolean {
  return GRAPHICS_LEVEL_RANK[current] >= GRAPHICS_LEVEL_RANK[minLevel];
}

const GFX_STORAGE_KEY = 'sunken_chime_gfx_v1';

export function getSavedGraphicsLevel(): GraphicsLevel {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(GFX_STORAGE_KEY);
      if (saved === 'low' || saved === 'medium' || saved === 'high' || saved === 'ultra') {
        return saved;
      }
    }
  } catch {
    // ignore storage errors
  }
  return 'high';
}

export function saveGraphicsLevel(level: GraphicsLevel): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(GFX_STORAGE_KEY, level);
    }
  } catch {
    // ignore storage errors
  }
}

export function getGraphicsSettings(level: GraphicsLevel, isSoftwareGl = false): GraphicsSettings {
  const base: GraphicsSettings = (() => {
    switch (level) {
      case 'low':
        return {
          level: 'low',
          rank: GRAPHICS_LEVEL_RANK.low,
          pixelRatioCap: 1.0,
          shadowsEnabled: false,
          shadowMapSize: 512,
          postProcessing: false,
          bloomStrength: 0,
          glowEffectsEnabled: false,
          particlesEnabled: false,
          fogDensity: 0.0058,
          moteVisibilityRatio: 0,
          shaftsEnabled: false,
          waterEnvIntensity: 0,
          waterQualityTier: 0,
          tilt3DEnabled: false,
          screenShakeEnabled: false,
          aimArcEnabled: false,
          heavyDrawEffectsEnabled: false,
          uiAnimationsEnabled: false,
          complexGradientsEnabled: false,
          contactShadowsEnabled: false,
          cameraFar: 380,
          toneMappingExposure: 1.24,
        };
      case 'medium':
        return {
          level: 'medium',
          rank: GRAPHICS_LEVEL_RANK.medium,
          pixelRatioCap: 1.25,
          shadowsEnabled: false,
          shadowMapSize: 512,
          postProcessing: false,
          bloomStrength: 0,
          glowEffectsEnabled: false,
          particlesEnabled: false,
          fogDensity: 0.006,
          moteVisibilityRatio: 0,
          shaftsEnabled: false,
          waterEnvIntensity: 0.48,
          waterQualityTier: 1,
          tilt3DEnabled: false,
          screenShakeEnabled: false,
          aimArcEnabled: false,
          heavyDrawEffectsEnabled: false,
          uiAnimationsEnabled: true,
          complexGradientsEnabled: true,
          contactShadowsEnabled: true,
          cameraFar: 500,
          toneMappingExposure: 1.32,
        };
      case 'ultra':
        return {
          level: 'ultra',
          rank: GRAPHICS_LEVEL_RANK.ultra,
          pixelRatioCap: 2.0,
          shadowsEnabled: true,
          shadowMapSize: 2048,
          postProcessing: true,
          bloomStrength: 0.46,
          glowEffectsEnabled: true,
          particlesEnabled: true,
          fogDensity: 0.005,
          moteVisibilityRatio: 1.0,
          shaftsEnabled: true,
          waterEnvIntensity: 1.35,
          waterQualityTier: 3,
          tilt3DEnabled: true,
          screenShakeEnabled: true,
          aimArcEnabled: true,
          heavyDrawEffectsEnabled: true,
          uiAnimationsEnabled: true,
          complexGradientsEnabled: true,
          contactShadowsEnabled: true,
          cameraFar: 740,
          toneMappingExposure: 1.22,
        };
      case 'high':
      default:
        return {
          level: 'high',
          rank: GRAPHICS_LEVEL_RANK.high,
          pixelRatioCap: 1.65,
          shadowsEnabled: true,
          shadowMapSize: 1024,
          postProcessing: true,
          bloomStrength: 0.34,
          glowEffectsEnabled: true,
          particlesEnabled: true,
          fogDensity: 0.0056,
          moteVisibilityRatio: 0.45,
          shaftsEnabled: true,
          waterEnvIntensity: 1.05,
          waterQualityTier: 2,
          tilt3DEnabled: false,
          screenShakeEnabled: true,
          aimArcEnabled: true,
          heavyDrawEffectsEnabled: true,
          uiAnimationsEnabled: true,
          complexGradientsEnabled: true,
          contactShadowsEnabled: true,
          cameraFar: 620,
          toneMappingExposure: 1.18,
        };
    }
  })();

  if (isSoftwareGl) {
    return {
      ...base,
      pixelRatioCap: 1.0,
      shadowsEnabled: false,
      postProcessing: false,
    };
  }
  return base;
}

export interface ParkourTuning {
  walkSpeed: number;
  sprintSpeed: number;
  crouchSpeed: number;
  turnSpeed: number;
  gravity: number;
  jumpVelocity: number;
  coyoteTime: number;
  jumpBuffer: number;
  ledgeSnapRange: number;
  ledgeMaxStepUp: number;
  ledgeHopDuration: number;
  ledgeArcBoost: number;
  waterKillY: number;
}

export interface BellTuning {
  chimeRadius: number;
  lureDuration: number;
  echoRevealDuration: number;
  cooldown: number;
}

export interface StealthTuning {
  alertFillPerSec: number;
  alertDecayPerSec: number;
  purrDrainSpeedMult: number;
  respawnDelay: number;
}

export interface DifficultyModifiers {
  level: DifficultyLevel;
  dogChaseSpeedMult: number;
  dogMaxChaseSec: number;
  dogCooldownSec: number;
  owlSuspicionFillMult: number;
  coyoteBonusSec: number;
}

export interface GameTuning {
  parkour: ParkourTuning;
  bell: BellTuning;
  stealth: StealthTuning;
  difficulty: DifficultyModifiers;
}

export function getDifficultyModifiers(level: DifficultyLevel): DifficultyModifiers {
  switch (level) {
    case 'relaxed':
      return {
        level: 'relaxed',
        dogChaseSpeedMult: 0.78,
        dogMaxChaseSec: 5.0,
        dogCooldownSec: 15.0,
        owlSuspicionFillMult: 0.55,
        coyoteBonusSec: 0.08,
      };
    case 'challenger':
      return {
        level: 'challenger',
        dogChaseSpeedMult: 1.2,
        dogMaxChaseSec: 10.5,
        dogCooldownSec: 6.5,
        owlSuspicionFillMult: 1.45,
        coyoteBonusSec: 0,
      };
    case 'standard':
    default:
      return {
        level: 'standard',
        dogChaseSpeedMult: 1.0,
        dogMaxChaseSec: 7.5,
        dogCooldownSec: 10.5,
        owlSuspicionFillMult: 1.0,
        coyoteBonusSec: 0.02,
      };
  }
}

export function createDefaultTuning(difficultyLevel: DifficultyLevel = 'standard'): GameTuning {
  const diff = getDifficultyModifiers(difficultyLevel);
  return {
    parkour: {
      walkSpeed: 4.4,
      sprintSpeed: 7.1,
      crouchSpeed: 2.3,
      turnSpeed: 12.0,
      gravity: 19.5,
      jumpVelocity: 7.15,
      coyoteTime: 0.14 + diff.coyoteBonusSec,
      jumpBuffer: 0.15,
      ledgeSnapRange: 4.35,
      ledgeMaxStepUp: 1.7,
      ledgeHopDuration: 0.36,
      ledgeArcBoost: 0.78,
      waterKillY: 0.2,
    },
    bell: {
      chimeRadius: 11.5,
      lureDuration: 4.8,
      echoRevealDuration: 4.0,
      cooldown: 0.85,
    },
    stealth: {
      alertFillPerSec: 0.72 * diff.owlSuspicionFillMult,
      alertDecayPerSec: 0.45,
      purrDrainSpeedMult: 0.5,
      respawnDelay: 0.9,
    },
    difficulty: diff,
  };
}
