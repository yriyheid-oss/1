import type { CollarId, SaveData, SkillId } from '../core/save';
import type { ActId } from '../data/acts';

export interface SkillSpec {
  id: SkillId;
  cost: number;
  icon: string;
}

export interface CollarSpec {
  id: CollarId;
  cost: number;
  accentHex: string;
}

export type AchievementId =
  | 'first_rub'
  | 'fish_thief'
  | 'double_jumper'
  | 'dog_evader'
  | 'owl_whisperer'
  | 'race_champion'
  | 'harbor_clear'
  | 'cistern_clear'
  | 'spire_clear'
  | 'letter_collector'
  | 'secret_four_winds'
  | 'secret_silent_paw'
  | 'secret_clockwork_fish';

export const SKILL_CATALOG: readonly SkillSpec[] = [
  { id: 'double_jump', cost: 2, icon: '🐾' },
  { id: 'velvet_paws', cost: 3, icon: '⚡' },
  { id: 'brass_harmonic', cost: 4, icon: '🔔' },
  { id: 'tide_swimmer', cost: 3, icon: '🌊' },
];

export const COLLAR_CATALOG: readonly CollarSpec[] = [
  { id: 'brass_bell', cost: 0, accentHex: '#F4A949' },
  { id: 'sea_silk', cost: 3, accentHex: '#4CE0B3' },
  { id: 'shadow_velvet', cost: 4, accentHex: '#8E99E6' },
  { id: 'sun_medallion', cost: 5, accentHex: '#FFD57E' },
];

export const ACHIEVEMENT_ORDER: readonly AchievementId[] = [
  'first_rub',
  'fish_thief',
  'double_jumper',
  'dog_evader',
  'owl_whisperer',
  'race_champion',
  'letter_collector',
  'harbor_clear',
  'cistern_clear',
  'spire_clear',
  'secret_four_winds',
  'secret_silent_paw',
  'secret_clockwork_fish',
];

export interface PlayerBonuses {
  maxAirJumps: number;
  sprintMult: number;
  swimMult: number;
  ledgeSnapBonus: number;
  toolCooldownMult: number;
  chimeRadiusMult: number;
  owlSuspicionMult: number;
}

export function computePlayerBonuses(
  unlockedSkills: readonly SkillId[],
  equippedCollar: CollarId
): PlayerBonuses {
  const hasDoubleJump = unlockedSkills.includes('double_jump');
  const hasVelvetPaws = unlockedSkills.includes('velvet_paws');
  const hasBrassHarmonic = unlockedSkills.includes('brass_harmonic');
  const hasTideSwimmer = unlockedSkills.includes('tide_swimmer');

  let maxAirJumps = hasDoubleJump ? 1 : 0;
  let sprintMult = hasVelvetPaws ? 1.18 : 1.0;
  let swimMult = hasTideSwimmer ? 1.32 : 1.0;
  let ledgeSnapBonus = hasTideSwimmer ? 1.25 : 0;
  let toolCooldownMult = hasBrassHarmonic ? 0.75 : 1.0;
  let chimeRadiusMult = hasBrassHarmonic ? 1.28 : 1.0;
  let owlSuspicionMult = hasVelvetPaws ? 0.8 : 1.0;

  if (equippedCollar === 'sea_silk') {
    swimMult += 0.16;
    sprintMult += 0.05;
  } else if (equippedCollar === 'shadow_velvet') {
    owlSuspicionMult *= 0.68;
  } else if (equippedCollar === 'sun_medallion') {
    toolCooldownMult *= 0.78;
    maxAirJumps = Math.max(1, maxAirJumps);
  }

  return {
    maxAirJumps,
    sprintMult,
    swimMult,
    ledgeSnapBonus,
    toolCooldownMult,
    chimeRadiusMult,
    owlSuspicionMult,
  };
}

export function purchaseSkill(save: SaveData, skillId: SkillId): SaveData | null {
  if (save.unlockedSkills.includes(skillId)) return null;
  const spec = SKILL_CATALOG.find((s) => s.id === skillId);
  if (!spec || save.fishBank < spec.cost) return null;
  return {
    ...save,
    fishBank: save.fishBank - spec.cost,
    unlockedSkills: [...save.unlockedSkills, skillId],
  };
}

export function purchaseOrEquipCollar(save: SaveData, collarId: CollarId): SaveData | null {
  if (save.unlockedCollars.includes(collarId)) {
    if (save.equippedCollar === collarId) return null;
    return {
      ...save,
      equippedCollar: collarId,
    };
  }
  const spec = COLLAR_CATALOG.find((c) => c.id === collarId);
  if (!spec || save.fishBank < spec.cost) return null;
  return {
    ...save,
    fishBank: save.fishBank - spec.cost,
    unlockedCollars: [...save.unlockedCollars, collarId],
    equippedCollar: collarId,
  };
}

export interface RunTelemetryForRewards {
  actId: ActId;
  rubCount: number;
  stolenFishCount: number;
  escapedChaseCount: number;
  distractedDogsCount: number;
  stealthAvoidedCount: number;
  lettersFound: number;
  doubleJumpsUsed: number;
  raceWon: boolean;
  bossDefeated: boolean;
  chimesCount: number;
  secretQuestsCompleted?: string[];
}

export function computeActRunScore(stats: RunTelemetryForRewards): number {
  return Math.round(
    stats.stolenFishCount * 120 +
      stats.rubCount * 90 +
      (stats.escapedChaseCount + stats.distractedDogsCount) * 110 +
      stats.lettersFound * 240 +
      stats.stealthAvoidedCount * 35 +
      (stats.raceWon ? 600 : 0) +
      (stats.bossDefeated ? 1000 : 0) +
      (stats.secretQuestsCompleted?.length ?? 0) * 500 +
      stats.chimesCount * 15
  );
}

export function evaluateAchievements(
  save: SaveData,
  stats: RunTelemetryForRewards
): { updatedSave: SaveData; newlyUnlocked: AchievementId[] } {
  const owned = new Set(save.unlockedAchievements);
  const newlyUnlocked: AchievementId[] = [];

  const grant = (id: AchievementId, condition: boolean) => {
    if (condition && !owned.has(id)) {
      owned.add(id);
      newlyUnlocked.push(id);
    }
  };

  grant('first_rub', stats.rubCount >= 1);
  grant('fish_thief', stats.stolenFishCount >= 5);
  grant('double_jumper', stats.doubleJumpsUsed >= 1 || save.unlockedSkills.includes('double_jump'));
  grant('dog_evader', stats.escapedChaseCount + stats.distractedDogsCount >= 3);
  grant('owl_whisperer', stats.stealthAvoidedCount >= 3);
  grant('race_champion', stats.raceWon);
  grant('letter_collector', stats.lettersFound >= 5);
  grant('harbor_clear', stats.actId === 'harbor' && stats.bossDefeated);
  grant('cistern_clear', stats.actId === 'cistern' && stats.bossDefeated);
  grant('spire_clear', stats.actId === 'spire' && stats.bossDefeated);
  const secrets = stats.secretQuestsCompleted ?? [];
  grant('secret_four_winds', secrets.includes('four_winds_resonance'));
  grant('secret_silent_paw', secrets.includes('silent_paw_order'));
  grant('secret_clockwork_fish', secrets.includes('clockwork_mackerel'));

  const score = computeActRunScore(stats);
  const prevBest = save.bestActScores[stats.actId] ?? 0;

  return {
    newlyUnlocked,
    updatedSave: {
      ...save,
      unlockedAchievements: Array.from(owned),
      bestActScores: {
        ...save.bestActScores,
        [stats.actId]: Math.max(prevBest, score),
      },
    },
  };
}
