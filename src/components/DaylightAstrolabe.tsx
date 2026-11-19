import React from 'react';
import type { ActId } from '../data/acts';
import { computeAstrolabeReadout, type DayPhaseName } from '../systems/atmosphere';

interface DaylightAstrolabeProps {
  cyclePhase: number;
  actId: ActId;
  phaseLabels: Record<DayPhaseName, string>;
  speed: number;
  speedUnit: string;
  isLowEco?: boolean;
}

const DIAL_CX = 18;
const DIAL_CY = 18;
const ORBIT_R = 12.2;

export const DaylightAstrolabe: React.FC<DaylightAstrolabeProps> = ({
  cyclePhase,
  actId,
  phaseLabels,
  speed,
  speedUnit,
  isLowEco = false,
}) => {
  const astrolabe = computeAstrolabeReadout(cyclePhase, actId);
  const sunRad = (astrolabe.sunAngleDeg * Math.PI) / 180;
  const moonRad = (astrolabe.moonAngleDeg * Math.PI) / 180;

  const sunX = DIAL_CX + Math.cos(sunRad) * ORBIT_R;
  const sunY = DIAL_CY + Math.sin(sunRad) * ORBIT_R;
  const moonX = DIAL_CX + Math.cos(moonRad) * ORBIT_R;
  const moonY = DIAL_CY + Math.sin(moonRad) * ORBIT_R;

  const phaseAccent =
    astrolabe.phaseName === 'noon'
      ? '#FFD57E'
      : astrolabe.phaseName === 'dusk'
        ? '#9DB7FF'
        : '#F4A949';

  return (
    <div
      data-testid="daylight-astrolabe"
      className="flex items-center gap-2 bg-[#162327]/92 border border-[#8F5E46]/70 px-2 py-1 shrink-0"
    >
      <svg viewBox="0 0 36 36" className="w-7 h-7 shrink-0" aria-hidden="true">
        <circle cx={DIAL_CX} cy={DIAL_CY} r={15.5} fill="#0F181B" stroke="#8F5E46" strokeWidth="1.2" />
        <line x1={3} y1={DIAL_CY} x2={33} y2={DIAL_CY} stroke="#2E464D" strokeWidth="0.9" />
        {!isLowEco && (
          <path
            d={`M ${DIAL_CX - 13} ${DIAL_CY} A 13 13 0 0 1 ${DIAL_CX + 13} ${DIAL_CY}`}
            fill="none"
            stroke={phaseAccent}
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
        )}
        <circle cx={DIAL_CX} cy={DIAL_CY} r={ORBIT_R} fill="none" stroke="#24383E" strokeWidth="0.8" />
        {/* Moon crescent */}
        <circle
          cx={moonX}
          cy={moonY}
          r={2.5}
          fill="#BFD5FF"
          fillOpacity={astrolabe.phaseName === 'noon' ? 0.45 : 0.92}
        />
        {/* Sun brass orb */}
        <circle
          cx={sunX}
          cy={sunY}
          r={3.1}
          fill={astrolabe.phaseName === 'dusk' ? '#FF9466' : '#FFD57E'}
          stroke="#121C20"
          strokeWidth="0.8"
        />
        {/* Pivot jewel */}
        <circle cx={DIAL_CX} cy={DIAL_CY} r={1.8} fill="#F4A949" />
      </svg>

      <div className="leading-tight font-mono">
        <div
          data-testid="day-phase-label"
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: phaseAccent }}
        >
          {phaseLabels[astrolabe.phaseName]}
        </div>
        {speed >= 3.8 && (
          <div
            data-testid="hud-speed-readout"
            className="text-[9px] text-[#8FE8CF] tabular-nums whitespace-nowrap"
          >
            {Math.round(speed)} {speedUnit}
          </div>
        )}
      </div>
    </div>
  );
};
