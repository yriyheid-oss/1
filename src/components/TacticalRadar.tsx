import React from 'react';

export interface RadarBlip {
  x: number;
  z: number;
  kind: 'dog' | 'owl' | 'letter' | 'boss' | 'ferry' | 'ring' | 'secret';
}

interface TacticalRadarProps {
  catX: number;
  catZ: number;
  camYaw: number;
  blips: RadarBlip[];
  isLowEco?: boolean;
  showSweep?: boolean;
}

const RADAR_RADIUS_WORLD = 48;
const CENTER = 52;
const VIEW_R = 44;

export interface ProjectedBlip {
  cx: number;
  cy: number;
  inRange: boolean;
}

export function projectRadarBlip(
  bx: number,
  bz: number,
  catX: number,
  catZ: number,
  camYaw: number
): ProjectedBlip {
  const cosY = Math.cos(camYaw);
  const sinY = Math.sin(camYaw);
  const dx = bx - catX;
  const dz = bz - catZ;
  // Rotate relative to camera heading so "up" matches camera forward (-Z when yaw=0)
  const rx = dx * cosY - dz * sinY;
  const ry = dx * sinY + dz * cosY;
  const dist = Math.hypot(rx, ry);
  const scale = Math.min(1, dist / RADAR_RADIUS_WORLD);
  const angle = Math.atan2(rx, -ry);
  const clampedR = Math.min(VIEW_R - 4, scale * (VIEW_R - 4));
  return {
    cx: CENTER + Math.sin(angle) * clampedR,
    cy: CENTER - Math.cos(angle) * clampedR,
    inRange: dist <= RADAR_RADIUS_WORLD,
  };
}

export interface CompassCardinal {
  label: 'N' | 'E' | 'S' | 'W';
  x: number;
  y: number;
}

export function computeCompassCardinals(camYaw: number): CompassCardinal[] {
  const dirs: Array<{ label: 'N' | 'E' | 'S' | 'W'; wx: number; wz: number }> = [
    { label: 'N', wx: 0, wz: -1 },
    { label: 'E', wx: 1, wz: 0 },
    { label: 'S', wx: 0, wz: 1 },
    { label: 'W', wx: -1, wz: 0 },
  ];
  const cosY = Math.cos(camYaw);
  const sinY = Math.sin(camYaw);
  const ringR = VIEW_R - 3.5;

  return dirs.map(({ label, wx, wz }) => {
    const rx = wx * cosY - wz * sinY;
    const ry = wx * sinY + wz * cosY;
    return {
      label,
      x: CENTER + rx * ringR,
      y: CENTER + ry * ringR,
    };
  });
}

const COMPASS_TICKS = [0, 45, 90, 135, 180, 225, 270, 315];

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  catX,
  catZ,
  camYaw,
  blips,
  isLowEco = false,
  showSweep = false,
}) => {
  const cardinals = computeCompassCardinals(camYaw);

  return (
    <div
      data-testid="tactical-radar"
      className="relative w-[96px] h-[96px] sm:w-[106px] sm:h-[106px] rounded-full bg-[#101A1E]/94 border-2 border-[#8F5E46]/90 shadow-lg overflow-hidden shrink-0"
    >
      <svg viewBox="0 0 104 104" className="w-full h-full">
        {showSweep && (
          <defs>
            <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4A949" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#4CE0B3" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="radarFovGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4CE0B3" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#4CE0B3" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        )}

        {/* Astrolabe compass bezel rings & degree notches */}
        <circle cx={CENTER} cy={CENTER} r={VIEW_R} fill="none" stroke="#314B52" strokeWidth="1" />
        {!isLowEco && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={24}
            fill="none"
            stroke="#24383D"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        <line x1={CENTER} y1={8} x2={CENTER} y2={96} stroke="#1F3136" strokeWidth="1" />
        <line x1={8} y1={CENTER} x2={96} y2={CENTER} stroke="#1F3136" strokeWidth="1" />

        {!isLowEco &&
          COMPASS_TICKS.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const rIn = deg % 90 === 0 ? VIEW_R - 4.5 : VIEW_R - 3;
            const rOut = VIEW_R;
            return (
              <line
                key={deg}
                x1={CENTER + Math.sin(rad) * rIn}
                y1={CENTER - Math.cos(rad) * rIn}
                x2={CENTER + Math.sin(rad) * rOut}
                y2={CENTER - Math.cos(rad) * rOut}
                stroke={deg % 90 === 0 ? '#8F5E46' : '#355057'}
                strokeWidth={deg % 90 === 0 ? 1.1 : 0.75}
              />
            );
          })}

        {/* Camera forward FOV cone wedge */}
        <path
          d={`M ${CENTER} ${CENTER} L ${CENTER - 18} ${CENTER - 36} A 40 40 0 0 1 ${CENTER + 18} ${CENTER - 36} Z`}
          fill={showSweep ? 'url(#radarFovGrad)' : isLowEco ? 'none' : 'rgba(76, 224, 179, 0.07)'}
          stroke={isLowEco ? 'none' : 'rgba(143, 232, 207, 0.22)'}
          strokeWidth="0.6"
        />

        {/* Living rotating sweep wedge (High / Ultra only) */}
        {showSweep && (
          <g className="radar-sweep">
            <path
              d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - VIEW_R} A ${VIEW_R} ${VIEW_R} 0 0 1 ${CENTER + 31} ${CENTER - 31} Z`}
              fill="url(#radarSweepGrad)"
            />
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER}
              y2={CENTER - VIEW_R}
              stroke="#F4A949"
              strokeWidth="0.9"
              strokeOpacity="0.45"
            />
          </g>
        )}

        {/* Rotating cardinal bearings (N/E/S/W) */}
        {cardinals.map((c) => (
          <text
            key={c.label}
            x={c.x}
            y={c.y + 2.3}
            textAnchor="middle"
            fontSize="6.5"
            fontFamily="monospace"
            fontWeight="700"
            fill={c.label === 'N' ? '#F4A949' : '#7E9892'}
          >
            {c.label}
          </text>
        ))}

        {/* World Blips */}
        {blips.map((b, i) => {
          const pos = projectRadarBlip(b.x, b.z, catX, catZ, camYaw);
          if (b.kind === 'boss') {
            return (
              <g key={`b_${i}`}>
                {showSweep && (
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={6.5}
                    fill="none"
                    stroke="#FF5733"
                    strokeWidth="0.8"
                    strokeOpacity="0.55"
                  />
                )}
                <polygon
                  points={`${pos.cx},${pos.cy - 4.5} ${pos.cx + 4},${pos.cy + 3.5} ${pos.cx - 4},${pos.cy + 3.5}`}
                  fill="#FF5733"
                  stroke="#FFD5A5"
                  strokeWidth="0.9"
                />
              </g>
            );
          }
          if (b.kind === 'ferry') {
            return (
              <rect
                key={`f_${i}`}
                x={pos.cx - 3.5}
                y={pos.cy - 3.5}
                width={7}
                height={7}
                fill="#4CE0B3"
                stroke="#F7EEDC"
                strokeWidth="0.9"
              />
            );
          }
          if (b.kind === 'ring') {
            return (
              <circle
                key={`r_${i}`}
                cx={pos.cx}
                cy={pos.cy}
                r={3.8}
                fill="none"
                stroke="#F4A949"
                strokeWidth="1.8"
              />
            );
          }
          if (b.kind === 'secret') {
            return (
              <polygon
                key={`s_${i}`}
                points={`${pos.cx},${pos.cy - 4} ${pos.cx + 3.5},${pos.cy} ${pos.cx},${pos.cy + 4} ${pos.cx - 3.5},${pos.cy}`}
                fill="#4CE0B3"
                stroke="#FFE8C2"
                strokeWidth="0.9"
              />
            );
          }
          if (!pos.inRange) return null;
          const color =
            b.kind === 'dog' ? '#FF6B4A' : b.kind === 'owl' ? '#FFA94D' : '#F4D56D';
          return (
            <circle
              key={`n_${i}`}
              cx={pos.cx}
              cy={pos.cy}
              r={b.kind === 'letter' ? 2.6 : 2.2}
              fill={color}
            />
          );
        })}

        {/* Player Pip center arrow */}
        <polygon
          points={`${CENTER},${CENTER - 5.5} ${CENTER + 4},${CENTER + 4} ${CENTER},${CENTER + 1.8} ${CENTER - 4},${CENTER + 4}`}
          fill="#F4A949"
          stroke="#142024"
          strokeWidth="0.9"
        />
      </svg>
    </div>
  );
};
