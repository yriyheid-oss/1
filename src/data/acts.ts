import type { MusicZone } from './i18n';

export type ActId = 'harbor' | 'cistern' | 'spire';

export const ACT_ORDER: readonly ActId[] = ['harbor', 'cistern', 'spire'] as const;

export type BossId = 'bosun_bulldog' | 'captain_ironsnout' | 'gufo_oro';

export type WeatherKind = 'clear' | 'mist' | 'rain';

export interface RaceRingSpec {
  x: number;
  y: number;
  z: number;
}

export interface ActSpec {
  id: ActId;
  index: 0 | 1 | 2;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  spawn: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    surfaceId: string;
  };
  ferry: {
    x: number;
    y: number;
    z: number;
    targetAct: ActId | null;
  };
  boss: {
    id: BossId;
    x: number;
    y: number;
    z: number;
    maxHp: number;
    arenaRadius: number;
    anchors: ReadonlyArray<{ id: string; x: number; y: number; z: number }>;
  };
  rivalCat: {
    id: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
    rings: readonly RaceRingSpec[];
  };
  atmosphere: {
    skyHex: string;
    fogHex: string;
    fogDensity: number;
    waterColorHex: string;
    keyHex: string;
    keyIntensity: number;
    hemiSkyHex: string;
    hemiGroundHex: string;
    defaultMusicZone: MusicZone;
  };
}

export const ACT_SPECS: Record<ActId, ActSpec> = {
  harbor: {
    id: 'harbor',
    index: 0,
    bounds: { minX: -185, maxX: 185, minZ: -195, maxZ: 145 },
    spawn: { x: 0, y: 3.0, z: 1.2, yaw: Math.PI, surfaceId: 'roof_start' },
    ferry: { x: 0, y: 0.5, z: 42.0, targetAct: 'cistern' },
    boss: {
      id: 'bosun_bulldog',
      x: 41.5,
      y: 0.5,
      z: 3.5,
      maxHp: 3,
      arenaRadius: 15.0,
      anchors: [
        { id: 'hb_anchor_1', x: 36.2, y: 0.5, z: -2.0 },
        { id: 'hb_anchor_2', x: 46.8, y: 0.5, z: 8.5 },
        { id: 'hb_anchor_3', x: 41.5, y: 0.5, z: 14.5 },
      ],
    },
    rivalCat: {
      id: 'rival_harbor',
      x: 11.4,
      y: 3.8,
      z: 1.5,
      yaw: -Math.PI * 0.5,
      rings: [
        { x: 13.4, y: 4.5, z: -3.5 },
        { x: 13.4, y: 5.0, z: -12.0 },
        { x: 6.4, y: 4.6, z: -12.8 },
        { x: 0.0, y: 5.5, z: -16.5 },
        { x: -6.4, y: 4.0, z: -8.5 },
        { x: 0.0, y: 3.8, z: 0.5 },
      ],
    },
    atmosphere: {
      skyHex: '#1A2E33',
      fogHex: '#1A2E33',
      fogDensity: 0.0082,
      waterColorHex: '#0C282D',
      keyHex: '#FFC98B',
      keyIntensity: 2.65,
      hemiSkyHex: '#75A3AD',
      hemiGroundHex: '#132024',
      defaultMusicZone: 'rooftops',
    },
  },
  cistern: {
    id: 'cistern',
    index: 1,
    bounds: { minX: -72, maxX: 72, minZ: -78, maxZ: 72 },
    spawn: { x: 0, y: 2.2, z: 24.0, yaw: Math.PI, surfaceId: 'cistern_entry_quay' },
    ferry: { x: 0, y: 4.2, z: -38.0, targetAct: 'spire' },
    boss: {
      id: 'captain_ironsnout',
      x: 0,
      y: 1.4,
      z: -10.0,
      maxHp: 4,
      arenaRadius: 14.5,
      anchors: [
        { id: 'cb_anchor_1', x: -7.5, y: 1.4, z: -6.0 },
        { id: 'cb_anchor_2', x: 7.5, y: 1.4, z: -6.0 },
        { id: 'cb_anchor_3', x: 0.0, y: 1.4, z: -18.0 },
      ],
    },
    rivalCat: {
      id: 'rival_cistern',
      x: -16.0,
      y: 2.6,
      z: 14.0,
      yaw: Math.PI * 0.4,
      rings: [
        { x: -16.0, y: 3.4, z: 4.0 },
        { x: -16.0, y: 4.2, z: -10.0 },
        { x: -8.0, y: 5.0, z: -22.0 },
        { x: 8.0, y: 5.0, z: -22.0 },
        { x: 16.0, y: 4.0, z: -8.0 },
        { x: 16.0, y: 3.2, z: 8.0 },
      ],
    },
    atmosphere: {
      skyHex: '#0F2224',
      fogHex: '#11292A',
      fogDensity: 0.0115,
      waterColorHex: '#0B3534',
      keyHex: '#7DE2C6',
      keyIntensity: 2.05,
      hemiSkyHex: '#3B847E',
      hemiGroundHex: '#0B1618',
      defaultMusicZone: 'waterfront',
    },
  },
  spire: {
    id: 'spire',
    index: 2,
    bounds: { minX: -70, maxX: 70, minZ: -74, maxZ: 70 },
    spawn: { x: 0, y: 2.0, z: 26.0, yaw: Math.PI, surfaceId: 'spire_entry_barge' },
    ferry: { x: 0, y: 11.2, z: -26.0, targetAct: null },
    boss: {
      id: 'gufo_oro',
      x: 0,
      y: 11.2,
      z: -16.0,
      maxHp: 4,
      arenaRadius: 15.5,
      anchors: [
        { id: 'sb_anchor_1', x: -8.2, y: 11.2, z: -12.0 },
        { id: 'sb_anchor_2', x: 8.2, y: 11.2, z: -12.0 },
        { id: 'sb_anchor_3', x: 0.0, y: 11.2, z: -24.0 },
      ],
    },
    rivalCat: {
      id: 'rival_spire',
      x: 11.5,
      y: 3.6,
      z: 18.0,
      yaw: -Math.PI * 0.5,
      rings: [
        { x: 14.0, y: 5.0, z: 10.0 },
        { x: 10.0, y: 6.4, z: 0.0 },
        { x: 0.0, y: 7.4, z: 2.0 },
        { x: -11.0, y: 8.6, z: -2.0 },
        { x: -9.5, y: 10.2, z: -10.0 },
        { x: 0.0, y: 12.0, z: -12.0 },
      ],
    },
    atmosphere: {
      skyHex: '#171C33',
      fogHex: '#1C223B',
      fogDensity: 0.0074,
      waterColorHex: '#101A34',
      keyHex: '#FFD599',
      keyIntensity: 2.45,
      hemiSkyHex: '#8C9EE8',
      hemiGroundHex: '#161626',
      defaultMusicZone: 'dam_summit',
    },
  },
};

export function getNextActId(actId: ActId): ActId | null {
  const idx = ACT_ORDER.indexOf(actId);
  if (idx < 0 || idx >= ACT_ORDER.length - 1) return null;
  return ACT_ORDER[idx + 1];
}
