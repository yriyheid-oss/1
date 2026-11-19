import type { ActId, ActSpec, WeatherKind } from '../data/acts';
import type { CatState } from './parkour';

export interface QuestProgressItem {
  id: 'feast' | 'letters' | 'boss_trial' | 'rival_race';
  current: number;
  target: number;
  completed: boolean;
  rewardFish: number;
}

export interface RivalRaceState {
  active: boolean;
  completed: boolean;
  nextRingIndex: number;
  totalRings: number;
  timeRemaining: number;
  maxTime: number;
  bestTimeSec: number | null;
}

export interface WeatherState {
  kind: WeatherKind;
  cycleTimer: number;
  cycleDuration: number;
  owlDetectionMult: number;
  dogScentMult: number;
}

export interface QuestStepEvents {
  raceStartedNow: boolean;
  ringPassedIndex: number | null;
  raceWonNow: boolean;
  raceExpiredNow: boolean;
  weatherChangedTo: WeatherKind | null;
  questCompletedIds: QuestProgressItem['id'][];
  bonusFishEarned: number;
}

export interface QuestSystemState {
  actId: ActId;
  quests: QuestProgressItem[];
  race: RivalRaceState;
  weather: WeatherState;
  rewardedQuestIds: string[];
}

export function createQuestSystemState(act: ActSpec): QuestSystemState {
  return {
    actId: act.id,
    quests: [
      { id: 'feast', current: 0, target: 3, completed: false, rewardFish: 3 },
      { id: 'letters', current: 0, target: act.id === 'harbor' ? 5 : 3, completed: false, rewardFish: 3 },
      { id: 'rival_race', current: 0, target: act.rivalCat.rings.length, completed: false, rewardFish: 4 },
      { id: 'boss_trial', current: 0, target: 1, completed: false, rewardFish: 5 },
    ],
    race: {
      active: false,
      completed: false,
      nextRingIndex: 0,
      totalRings: act.rivalCat.rings.length,
      timeRemaining: 0,
      maxTime: 48,
      bestTimeSec: null,
    },
    weather: {
      kind: act.id === 'cistern' ? 'mist' : 'clear',
      cycleTimer: 0,
      cycleDuration: 42,
      owlDetectionMult: 1.0,
      dogScentMult: 1.0,
    },
    rewardedQuestIds: [],
  };
}

export function isNearRivalCat(cat: CatState, act: ActSpec): boolean {
  const dx = cat.x - act.rivalCat.x;
  const dz = cat.z - act.rivalCat.z;
  const dy = Math.abs(cat.y - act.rivalCat.y);
  return Math.hypot(dx, dz) < 1.85 && dy < 1.5;
}

export function isNearFerryGondola(cat: CatState, act: ActSpec): boolean {
  const dx = cat.x - act.ferry.x;
  const dz = cat.z - act.ferry.z;
  const dy = Math.abs(cat.y - act.ferry.y);
  return Math.hypot(dx, dz) < 2.6 && dy < 2.0;
}

export function stepQuestAndWeatherSystem(
  state: QuestSystemState,
  act: ActSpec,
  cat: CatState,
  metrics: {
    stolenFishCount: number;
    lettersFound: number;
    bossDefeated: boolean;
    startRacePressed: boolean;
  },
  dt: number
): QuestStepEvents {
  const ev: QuestStepEvents = {
    raceStartedNow: false,
    ringPassedIndex: null,
    raceWonNow: false,
    raceExpiredNow: false,
    weatherChangedTo: null,
    questCompletedIds: [],
    bonusFishEarned: 0,
  };

  // 1. Dynamic Atmosphere / Weather cycle
  state.weather.cycleTimer += dt;
  if (state.weather.cycleTimer >= state.weather.cycleDuration) {
    state.weather.cycleTimer = 0;
    const seq: WeatherKind[] =
      act.id === 'cistern' ? ['mist', 'clear'] : ['clear', 'mist', 'rain'];
    const idx = seq.indexOf(state.weather.kind);
    const nextKind = seq[(idx + 1) % seq.length];
    if (nextKind !== state.weather.kind) {
      state.weather.kind = nextKind;
      ev.weatherChangedTo = nextKind;
    }
  }
  state.weather.owlDetectionMult =
    state.weather.kind === 'rain' ? 0.72 : state.weather.kind === 'mist' ? 0.85 : 1.0;
  state.weather.dogScentMult =
    state.weather.kind === 'rain' ? 0.76 : state.weather.kind === 'mist' ? 0.9 : 1.0;

  // 2. Rival Cat Rooftop Ring Race
  if (metrics.startRacePressed && !state.race.active) {
    state.race.active = true;
    state.race.nextRingIndex = 0;
    state.race.timeRemaining = state.race.maxTime;
    ev.raceStartedNow = true;
  }

  if (state.race.active) {
    state.race.timeRemaining = Math.max(0, state.race.timeRemaining - dt);
    const ring = act.rivalCat.rings[state.race.nextRingIndex];
    if (ring) {
      const dist = Math.hypot(cat.x - ring.x, cat.y - ring.y + 0.25, cat.z - ring.z);
      if (dist <= 2.1) {
        ev.ringPassedIndex = state.race.nextRingIndex;
        state.race.nextRingIndex++;
        if (state.race.nextRingIndex >= state.race.totalRings) {
          const elapsedSec = Math.max(1, Math.round(state.race.maxTime - state.race.timeRemaining));
          state.race.active = false;
          state.race.completed = true;
          state.race.bestTimeSec =
            state.race.bestTimeSec === null
              ? elapsedSec
              : Math.min(state.race.bestTimeSec, elapsedSec);
          ev.raceWonNow = true;
        }
      }
    }
    if (state.race.active && state.race.timeRemaining <= 0) {
      state.race.active = false;
      state.race.nextRingIndex = 0;
      ev.raceExpiredNow = true;
    }
  }

  // 3. Update Quest Trackers & grant first-time rewards
  for (const q of state.quests) {
    if (q.id === 'feast') {
      q.current = Math.min(q.target, metrics.stolenFishCount);
    } else if (q.id === 'letters') {
      q.current = Math.min(q.target, metrics.lettersFound);
    } else if (q.id === 'rival_race') {
      q.current = state.race.completed
        ? q.target
        : state.race.active
          ? state.race.nextRingIndex
          : 0;
    } else if (q.id === 'boss_trial') {
      q.current = metrics.bossDefeated ? 1 : 0;
    }

    if (q.current >= q.target) {
      q.completed = true;
      if (!state.rewardedQuestIds.includes(q.id)) {
        state.rewardedQuestIds.push(q.id);
        ev.questCompletedIds.push(q.id);
        ev.bonusFishEarned += q.rewardFish;
      }
    }
  }

  return ev;
}
