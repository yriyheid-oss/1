export type ToolId = 'bell' | 'fish_sling' | 'sonic_claw' | 'lantern_flare';

export interface ToolSpec {
  id: ToolId;
  slotIndex: number;
  cooldownSec: number;
  accentHex: string;
}

export const TOOL_ORDER: readonly ToolId[] = [
  'bell',
  'fish_sling',
  'sonic_claw',
  'lantern_flare',
];

export const TOOL_SPECS: Record<ToolId, ToolSpec> = {
  bell: {
    id: 'bell',
    slotIndex: 1,
    cooldownSec: 0.85,
    accentHex: '#F4A949',
  },
  fish_sling: {
    id: 'fish_sling',
    slotIndex: 2,
    cooldownSec: 3.2,
    accentHex: '#6EA89C',
  },
  sonic_claw: {
    id: 'sonic_claw',
    slotIndex: 3,
    cooldownSec: 2.6,
    accentHex: '#FF8A4C',
  },
  lantern_flare: {
    id: 'lantern_flare',
    slotIndex: 4,
    cooldownSec: 5.5,
    accentHex: '#FFD57E',
  },
};

export function cycleToolId(current: ToolId, wheelDelta: number): ToolId {
  if (wheelDelta === 0) return current;
  const idx = TOOL_ORDER.indexOf(current);
  const step = wheelDelta > 0 ? 1 : -1;
  const next = (idx + step + TOOL_ORDER.length) % TOOL_ORDER.length;
  return TOOL_ORDER[next];
}
