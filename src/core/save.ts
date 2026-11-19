import type { ActId } from '../data/acts';

export const SAVE_SCHEMA_VERSION = 2;
const STORAGE_KEY = 'sunken_chime_save_v1';

export type SkillId = 'double_jump' | 'velvet_paws' | 'brass_harmonic' | 'tide_swimmer';
export type CollarId = 'brass_bell' | 'sea_silk' | 'shadow_velvet' | 'sun_medallion';

export interface SaveData {
  schemaVersion: number;
  districtIndex: number;
  unlockedHarmonics: number;
  unlockedLocks: string[];
  checkpointId: string;
  completedDistricts: string[];
  storyFlags: Record<string, boolean>;
  // v2 Campaign & Progression fields
  highestReachedAct: number;
  currentAct: ActId;
  fishBank: number;
  unlockedSkills: SkillId[];
  unlockedCollars: CollarId[];
  equippedCollar: CollarId;
  unlockedAchievements: string[];
  completedActs: ActId[];
  bestActScores: Record<ActId, number>;
}

const VALID_SKILLS: ReadonlySet<string> = new Set([
  'double_jump',
  'velvet_paws',
  'brass_harmonic',
  'tide_swimmer',
]);
const VALID_COLLARS: ReadonlySet<string> = new Set([
  'brass_bell',
  'sea_silk',
  'shadow_velvet',
  'sun_medallion',
]);
const VALID_ACTS: ReadonlySet<string> = new Set(['harbor', 'cistern', 'spire']);

export function defaultSaveData(): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    districtIndex: 0,
    unlockedHarmonics: 1,
    unlockedLocks: [],
    checkpointId: 'cp_start',
    completedDistricts: [],
    storyFlags: {},
    highestReachedAct: 0,
    currentAct: 'harbor',
    fishBank: 3,
    unlockedSkills: [],
    unlockedCollars: ['brass_bell'],
    equippedCollar: 'brass_bell',
    unlockedAchievements: [],
    completedActs: [],
    bestActScores: { harbor: 0, cistern: 0, spire: 0 },
  };
}

export function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return defaultSaveData();
  const obj = raw as Record<string, unknown>;
  const base = defaultSaveData();
  const rawScores =
    obj.bestActScores && typeof obj.bestActScores === 'object'
      ? (obj.bestActScores as Record<string, unknown>)
      : {};

  const unlockedCollars = Array.isArray(obj.unlockedCollars)
    ? obj.unlockedCollars.filter((v): v is CollarId => typeof v === 'string' && VALID_COLLARS.has(v))
    : [...base.unlockedCollars];
  if (!unlockedCollars.includes('brass_bell')) unlockedCollars.unshift('brass_bell');

  const equippedCollar =
    typeof obj.equippedCollar === 'string' &&
    VALID_COLLARS.has(obj.equippedCollar) &&
    unlockedCollars.includes(obj.equippedCollar as CollarId)
      ? (obj.equippedCollar as CollarId)
      : 'brass_bell';

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    districtIndex: typeof obj.districtIndex === 'number' ? obj.districtIndex : base.districtIndex,
    unlockedHarmonics:
      typeof obj.unlockedHarmonics === 'number' ? obj.unlockedHarmonics : base.unlockedHarmonics,
    unlockedLocks: Array.isArray(obj.unlockedLocks)
      ? obj.unlockedLocks.filter((v): v is string => typeof v === 'string')
      : [],
    checkpointId: typeof obj.checkpointId === 'string' ? obj.checkpointId : base.checkpointId,
    completedDistricts: Array.isArray(obj.completedDistricts)
      ? obj.completedDistricts.filter((v): v is string => typeof v === 'string')
      : [],
    storyFlags:
      obj.storyFlags && typeof obj.storyFlags === 'object'
        ? (obj.storyFlags as Record<string, boolean>)
        : {},
    highestReachedAct:
      typeof obj.highestReachedAct === 'number'
        ? Math.max(0, Math.min(2, Math.floor(obj.highestReachedAct)))
        : base.highestReachedAct,
    currentAct:
      typeof obj.currentAct === 'string' && VALID_ACTS.has(obj.currentAct)
        ? (obj.currentAct as ActId)
        : base.currentAct,
    fishBank: typeof obj.fishBank === 'number' && obj.fishBank >= 0 ? Math.floor(obj.fishBank) : base.fishBank,
    unlockedSkills: Array.isArray(obj.unlockedSkills)
      ? obj.unlockedSkills.filter((v): v is SkillId => typeof v === 'string' && VALID_SKILLS.has(v))
      : [],
    unlockedCollars,
    equippedCollar,
    unlockedAchievements: Array.isArray(obj.unlockedAchievements)
      ? obj.unlockedAchievements.filter((v): v is string => typeof v === 'string')
      : [],
    completedActs: Array.isArray(obj.completedActs)
      ? obj.completedActs.filter((v): v is ActId => typeof v === 'string' && VALID_ACTS.has(v))
      : [],
    bestActScores: {
      harbor: typeof rawScores.harbor === 'number' ? Math.max(0, Math.floor(rawScores.harbor)) : 0,
      cistern: typeof rawScores.cistern === 'number' ? Math.max(0, Math.floor(rawScores.cistern)) : 0,
      spire: typeof rawScores.spire === 'number' ? Math.max(0, Math.floor(rawScores.spire)) : 0,
    },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSaveData();
    return migrateSave(JSON.parse(raw));
  } catch {
    return defaultSaveData();
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, schemaVersion: SAVE_SCHEMA_VERSION })
    );
  } catch {
    // Ignore storage quota / sandbox restrictions
  }
}
