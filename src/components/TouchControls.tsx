import { useRef, useState } from 'react';
import type { VirtualHeldAction, VirtualPulseAction } from '../core/input';
import type { UiLocaleBundle } from '../data/i18n';

interface TouchControlsProps {
  locale: UiLocaleBundle;
  crouching: boolean;
  purring: boolean;
  onAxisChange: (forward: number, right: number) => void;
  onHeldChange: (action: VirtualHeldAction, active: boolean) => void;
  onPulseAction: (action: VirtualPulseAction) => void;
  onCycleTool: () => void;
}

export function TouchControls({
  locale,
  crouching,
  purring,
  onAxisChange,
  onHeldChange,
  onPulseAction,
  onCycleTool,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [purrToggled, setPurrToggled] = useState(false);
  const [crouchToggled, setCrouchToggled] = useState(false);

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onAxisChange(-dy / maxR, dx / maxR);
  };

  const resetStick = () => {
    activePointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    onAxisChange(0, 0);
  };

  return (
    <div
      data-testid="touch-controls-overlay"
      className="w-full pointer-events-none flex items-end justify-between px-1 sm:px-2 pb-1"
    >
      {/* Left Floating Analog Joystick */}
      <div
        ref={padRef}
        role="application"
        aria-label="Virtual movement joystick"
        onPointerDown={(e) => {
          e.stopPropagation();
          activePointerRef.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerRef.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerRef.current === e.pointerId) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            resetStick();
          }
        }}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 bg-[#121C20]/80 border-2 border-[#8F5E46]/80 touch-none flex items-center justify-center shadow-lg"
      >
        <div className="w-16 h-16 border border-[#8F5E46]/35 pointer-events-none" />
        <div
          className="absolute w-11 h-11 bg-[#F4A949]/90 border-2 border-[#FFD5A5] shadow-md pointer-events-none"
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      {/* Right Ergonomic Action Buttons */}
      <div className="pointer-events-auto grid grid-cols-3 gap-1 sm:gap-1.5 touch-none">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPulseAction('dash');
          }}
          className="h-10 px-2 text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#15353B]/90 border border-[#6FE6D6]/85 text-[#D8FFF8] cursor-pointer"
        >
          {locale.actions.touchDash}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPulseAction('sense');
          }}
          className="h-10 px-2 text-[11px] font-mono font-semibold uppercase tracking-wider bg-[#2C2415]/90 border border-[#FFD57E]/85 text-[#FFE8C2] cursor-pointer"
        >
          {locale.actions.touchSense}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onCycleTool();
          }}
          className="h-10 px-2 text-[11px] font-mono uppercase tracking-wider bg-[#121C20]/85 border border-[#8F5E46]/80 text-[#F4A949] cursor-pointer"
        >
          {locale.actions.touchNextTool}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            const next = !crouchToggled;
            setCrouchToggled(next);
            onHeldChange('crouch', next);
          }}
          className={`h-10 px-2 text-[11px] font-mono uppercase tracking-wider border cursor-pointer ${
            crouching || crouchToggled
              ? 'bg-[#3F7D70] border-[#8FE8CF] text-[#F7EEDC]'
              : 'bg-[#121C20]/85 border-[#8F5E46]/80 text-[#EFE6D5]'
          }`}
        >
          {locale.actions.touchCrouch}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            const next = !purrToggled;
            setPurrToggled(next);
            onHeldChange('purr', next);
          }}
          className={`h-10 px-2 text-[11px] font-mono uppercase tracking-wider border cursor-pointer ${
            purring || purrToggled
              ? 'bg-[#6E4924] border-[#F4A949] text-[#FFE8C2]'
              : 'bg-[#121C20]/85 border-[#8F5E46]/80 text-[#EFE6D5]'
          }`}
        >
          {locale.actions.touchPurr}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPulseAction('interact');
          }}
          className="h-10 px-2 text-xs font-mono font-semibold uppercase tracking-wider bg-[#1D3530]/90 border border-[#6EA89C] text-[#F7EEDC] cursor-pointer"
        >
          {locale.actions.touchAct}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPulseAction('chime');
          }}
          className="h-11 px-3 text-xs font-mono font-semibold uppercase tracking-wider bg-[#784A1E]/92 border border-[#F4A949] text-[#FFE8C2] cursor-pointer"
        >
          {locale.actions.touchTool}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPulseAction('jump');
            onHeldChange('glide', true);
          }}
          onPointerUp={() => onHeldChange('glide', false)}
          onPointerCancel={() => onHeldChange('glide', false)}
          className="col-span-2 h-11 px-3.5 text-xs font-mono font-bold uppercase tracking-wider bg-[#F4A949] border border-[#FFD5A5] text-[#142024] cursor-pointer"
        >
          {locale.actions.touchJump}
        </button>
      </div>
    </div>
  );
}
