import type { ActId } from '../data/acts';
import type { CatState } from './parkour';

export type SecretQuestId =
  | 'four_winds_resonance'
  | 'silent_paw_order'
  | 'clockwork_mackerel';

export interface TuningForkBeacon {
  id: 'fork_east_foundry' | 'fork_west_cloister' | 'fork_north_viaduct';
  x: number;
  y: number;
  z: number;
  activated: boolean;
}

export type SalvatorQuestStage = 'unstarted' | 'active' | 'carrying' | 'completed';

export interface SecretQuestHudItem {
  id: SecretQuestId;
  current: number;
  target: number;
  completed: boolean;
  rewardFish: number;
  active: boolean;
}

export interface SecretQuestState {
  actId: ActId;
  beacons: TuningForkBeacon[];
  vaultRevealed: boolean;
  silentFeats: {
    purredInBeam: boolean;
    stalkedGull: boolean;
    sleptNest: boolean;
  };
  silentCompleted: boolean;
  salvatoreStage: SalvatorQuestStage;
  mackerelPos: { x: number; y: number; z: number };
  salvatorePos: { x: number; y: number; z: number };
  rewardedIds: SecretQuestId[];
}

export interface SecretQuestStepInput {
  bellChimedNow: boolean;
  chimeRadius: number;
  owlStealthSynced: boolean;
  owlAlarmFired: boolean;
  stalkedGullNow: boolean;
  sleptNestNow: boolean;
  rubbedPersonId: string | null;
  interactPressed: boolean;
  caughtOrHitNow: boolean;
}

export interface SecretQuestEvents {
  beaconActivatedId: TuningForkBeacon['id'] | null;
  vaultRevealedNow: boolean;
  silentFeatNow: 'purr_beam' | 'stalk_gull' | 'sleep_nest' | null;
  silentResetByAlarm: boolean;
  salvatoreStartedNow: boolean;
  mackerelPickedUpNow: boolean;
  mackerelDroppedNow: boolean;
  mackerelDeliveredNow: boolean;
  completedSecretIds: SecretQuestId[];
  bonusFishEarned: number;
  nearbyKind: 'salvatore_start' | 'salvatore_deliver' | 'pickup_mackerel' | null;
}

export const SECRET_VAULT_SURFACE_SPEC = {
  surfaceId: 'secret_echo_vault',
  x: 0,
  y: 5.8,
  z: -20.5,
  w: 4.8,
  d: 3.4,
} as const;

export function createSecretQuestState(actId: ActId): SecretQuestState {
  return {
    actId,
    beacons: [
      { id: 'fork_east_foundry', x: 79.5, y: 0.5, z: 10.5, activated: false },
      { id: 'fork_west_cloister', x: -79.5, y: 0.5, z: 11.5, activated: false },
      { id: 'fork_north_viaduct', x: 0.0, y: 4.8, z: -76.5, activated: false },
    ],
    vaultRevealed: false,
    silentFeats: {
      purredInBeam: false,
      stalkedGull: false,
      sleptNest: false,
    },
    silentCompleted: false,
    salvatoreStage: 'unstarted',
    mackerelPos: { x: 41.0, y: 0.5, z: 14.5 },
    salvatorePos: { x: 0.0, y: 0.5, z: 73.0 },
    rewardedIds: [],
  };
}

export function getSecretQuestHudList(state: SecretQuestState): SecretQuestHudItem[] {
  if (state.actId !== 'harbor') return [];

  const forksLit = state.beacons.filter((b) => b.activated).length;
  const silentCount =
    (state.silentFeats.purredInBeam ? 1 : 0) +
    (state.silentFeats.stalkedGull ? 1 : 0) +
    (state.silentFeats.sleptNest ? 1 : 0);

  const salvatoreCurrent =
    state.salvatoreStage === 'completed'
      ? 2
      : state.salvatoreStage === 'carrying'
        ? 1
        : 0;

  return [
    {
      id: 'four_winds_resonance',
      current: forksLit,
      target: 3,
      completed: state.vaultRevealed,
      rewardFish: 6,
      active: forksLit > 0 || state.vaultRevealed,
    },
    {
      id: 'silent_paw_order',
      current: state.silentCompleted ? 3 : silentCount,
      target: 3,
      completed: state.silentCompleted,
      rewardFish: 5,
      active: silentCount > 0 || state.silentCompleted,
    },
    {
      id: 'clockwork_mackerel',
      current: salvatoreCurrent,
      target: 2,
      completed: state.salvatoreStage === 'completed',
      rewardFish: 10,
      active: state.salvatoreStage !== 'unstarted',
    },
  ];
}

export function stepSecretQuests(
  state: SecretQuestState,
  cat: CatState,
  input: SecretQuestStepInput
): SecretQuestEvents {
  const ev: SecretQuestEvents = {
    beaconActivatedId: null,
    vaultRevealedNow: false,
    silentFeatNow: null,
    silentResetByAlarm: false,
    salvatoreStartedNow: false,
    mackerelPickedUpNow: false,
    mackerelDroppedNow: false,
    mackerelDeliveredNow: false,
    completedSecretIds: [],
    bonusFishEarned: 0,
    nearbyKind: null,
  };

  if (state.actId !== 'harbor') return ev;

  // 1. Secret Quest I: Four-Winds Resonance (3 tuning-fork beacons activated by Bell chime)
  if (input.bellChimedNow && !state.vaultRevealed) {
    const reach = Math.max(4.8, input.chimeRadius * 0.55);
    for (const b of state.beacons) {
      if (b.activated) continue;
      const dist = Math.hypot(cat.x - b.x, cat.z - b.z);
      if (dist <= reach && Math.abs(cat.y - b.y) <= 3.4) {
        b.activated = true;
        ev.beaconActivatedId = b.id;
      }
    }
    if (state.beacons.every((b) => b.activated)) {
      state.vaultRevealed = true;
      ev.vaultRevealedNow = true;
      if (!state.rewardedIds.includes('four_winds_resonance')) {
        state.rewardedIds.push('four_winds_resonance');
        ev.completedSecretIds.push('four_winds_resonance');
        ev.bonusFishEarned += 6;
      }
    }
  }

  // 2. Secret Quest II: Order of the Silent Paw (3 stealth feats in 1 run without triggering an Owl Alarm)
  if (!state.silentCompleted) {
    if (input.owlAlarmFired) {
      const hadAny =
        state.silentFeats.purredInBeam ||
        state.silentFeats.stalkedGull ||
        state.silentFeats.sleptNest;
      state.silentFeats.purredInBeam = false;
      state.silentFeats.stalkedGull = false;
      state.silentFeats.sleptNest = false;
      if (hadAny) ev.silentResetByAlarm = true;
    } else {
      if (input.owlStealthSynced && !state.silentFeats.purredInBeam) {
        state.silentFeats.purredInBeam = true;
        ev.silentFeatNow = 'purr_beam';
      }
      if (input.stalkedGullNow && !state.silentFeats.stalkedGull) {
        state.silentFeats.stalkedGull = true;
        ev.silentFeatNow = 'stalk_gull';
      }
      if (input.sleptNestNow && !state.silentFeats.sleptNest) {
        state.silentFeats.sleptNest = true;
        ev.silentFeatNow = 'sleep_nest';
      }

      if (
        state.silentFeats.purredInBeam &&
        state.silentFeats.stalkedGull &&
        state.silentFeats.sleptNest
      ) {
        state.silentCompleted = true;
        if (!state.rewardedIds.includes('silent_paw_order')) {
          state.rewardedIds.push('silent_paw_order');
          ev.completedSecretIds.push('silent_paw_order');
          ev.bonusFishEarned += 5;
        }
      }
    }
  }

  // 3. Secret Quest III: Clockwork Mackerel for Old Salvatore
  const distToSalvatore = Math.hypot(
    cat.x - state.salvatorePos.x,
    cat.z - state.salvatorePos.z
  );
  const distToMackerel = Math.hypot(
    cat.x - state.mackerelPos.x,
    cat.z - state.mackerelPos.z
  );

  if (state.salvatoreStage === 'unstarted') {
    if (distToSalvatore <= 4.5 && Math.abs(cat.y - state.salvatorePos.y) <= 1.6) {
      ev.nearbyKind = 'salvatore_start';
    }
    if (input.rubbedPersonId === 'bastion_angler') {
      state.salvatoreStage = 'active';
      ev.salvatoreStartedNow = true;
    }
  } else if (state.salvatoreStage === 'active') {
    if (distToMackerel <= 2.4 && Math.abs(cat.y - state.mackerelPos.y) <= 1.6) {
      ev.nearbyKind = 'pickup_mackerel';
      if (distToMackerel <= 1.35 || input.interactPressed) {
        state.salvatoreStage = 'carrying';
        ev.mackerelPickedUpNow = true;
      }
    }
  } else if (state.salvatoreStage === 'carrying') {
    if (input.caughtOrHitNow) {
      state.salvatoreStage = 'active';
      ev.mackerelDroppedNow = true;
    } else if (
      distToSalvatore <= 4.8 &&
      Math.abs(cat.y - state.salvatorePos.y) <= 1.6
    ) {
      ev.nearbyKind = 'salvatore_deliver';
      if (input.rubbedPersonId === 'bastion_angler' || input.interactPressed) {
        state.salvatoreStage = 'completed';
        ev.mackerelDeliveredNow = true;
        if (!state.rewardedIds.includes('clockwork_mackerel')) {
          state.rewardedIds.push('clockwork_mackerel');
          ev.completedSecretIds.push('clockwork_mackerel');
          ev.bonusFishEarned += 10;
        }
      }
    }
  }

  return ev;
}
