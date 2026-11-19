import React, { useEffect, useRef } from 'react';
import type { GraphicsLevel } from '../data/tuning';

interface AmbientGoldDustProps {
  graphicsLevel: GraphicsLevel;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  warm: boolean;
}

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  warm: boolean;
}

const UI_BURST_EVENT = 'chime-ui-burst';

export function emitUiGoldBurst(xRatio = 0.5, yRatio = 0.5, warm = true): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UI_BURST_EVENT, { detail: { xRatio, yRatio, warm } }));
}

export const AmbientGoldDust: React.FC<AmbientGoldDustProps> = ({ graphicsLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ nx: 0, ny: 0, lastX: -1, lastY: -1 });
  const isUltra = graphicsLevel === 'ultra';
  const enabled = graphicsLevel === 'high' || graphicsLevel === 'ultra';

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = isUltra ? 28 : 12;
    const particles: DustParticle[] = Array.from({ length: count }, (_, idx) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.012,
      vy: -(0.012 + Math.random() * 0.022),
      radius: isUltra ? 1.2 + Math.random() * 2.1 : 1.1 + Math.random() * 1.4,
      alpha: 0.22 + Math.random() * 0.45,
      phase: idx * 0.77,
      warm: idx % 4 !== 0,
    }));

    const SPARK_POOL = isUltra ? 48 : 24;
    const sparks: SparkParticle[] = Array.from({ length: SPARK_POOL }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      maxAge: 0.65,
      size: 1.5,
      warm: true,
    }));
    let sparkCursor = 0;

    const spawnSpark = (x: number, y: number, vx: number, vy: number, maxAge: number, size: number, warm: boolean) => {
      const s = sparks[sparkCursor];
      sparkCursor = (sparkCursor + 1) % SPARK_POOL;
      s.active = true;
      s.x = x;
      s.y = y;
      s.vx = vx;
      s.vy = vy;
      s.age = 0;
      s.maxAge = maxAge;
      s.size = size;
      s.warm = warm;
    };

    const resize = () => {
      const dpr = Math.min(isUltra ? 1.5 : 1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onPointerMove = (e: PointerEvent) => {
      if (!isUltra) return;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      pointerRef.current.nx = e.clientX / w - 0.5;
      pointerRef.current.ny = e.clientY / h - 0.5;

      const dx = e.clientX - pointerRef.current.lastX;
      const dy = e.clientY - pointerRef.current.lastY;
      if (pointerRef.current.lastX < 0 || dx * dx + dy * dy >= 324) {
        pointerRef.current.lastX = e.clientX;
        pointerRef.current.lastY = e.clientY;
        spawnSpark(
          e.clientX + (Math.random() - 0.5) * 6,
          e.clientY + (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 22,
          -(12 + Math.random() * 24),
          0.55 + Math.random() * 0.25,
          1.4 + Math.random() * 1.4,
          Math.random() > 0.25
        );
      }
    };

    const onUiBurst = (evt: Event) => {
      const detail = (evt as CustomEvent<{ xRatio?: number; yRatio?: number; warm?: boolean }>).detail;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const cx = (detail?.xRatio ?? 0.5) * w;
      const cy = (detail?.yRatio ?? 0.5) * h;
      const warm = detail?.warm ?? true;
      const n = isUltra ? 22 : 12;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.35;
        const speed = 42 + Math.random() * 88;
        spawnSpark(
          cx + (Math.random() - 0.5) * 14,
          cy + (Math.random() - 0.5) * 14,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 18,
          0.62 + Math.random() * 0.34,
          1.7 + Math.random() * 1.8,
          i % 4 === 0 ? !warm : warm
        );
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener(UI_BURST_EVENT, onUiBurst);

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const parallaxX = isUltra ? pointerRef.current.nx * 18 : 0;
      const parallaxY = isUltra ? pointerRef.current.ny * 12 : 0;

      for (const p of particles) {
        p.x = (p.x + p.vx * dt + 1) % 1;
        p.y = (p.y + p.vy * dt + 1) % 1;

        const px = p.x * w + Math.sin(elapsed * 0.9 + p.phase) * 8 + parallaxX * (p.radius * 0.6);
        const py = p.y * h + parallaxY * (p.radius * 0.6);
        const twinkle = 0.65 + Math.sin(elapsed * 2.1 + p.phase) * 0.35;
        const a = p.alpha * twinkle;

        if (isUltra) {
          ctx.fillStyle = p.warm ? `rgba(255, 213, 140, ${a * 0.28})` : `rgba(143, 232, 207, ${a * 0.24})`;
          ctx.beginPath();
          ctx.arc(px, py, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = p.warm ? `rgba(244, 185, 92, ${a})` : `rgba(143, 232, 207, ${a})`;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Crisp 4-point brass star glints on brightest motes
        if (isUltra && p.radius > 2.25 && twinkle > 0.72) {
          const arm = p.radius * 2.4;
          ctx.strokeStyle = p.warm ? `rgba(255, 235, 190, ${a * 0.82})` : `rgba(190, 250, 235, ${a * 0.75})`;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.moveTo(px - arm, py);
          ctx.lineTo(px + arm, py);
          ctx.moveTo(px, py - arm);
          ctx.lineTo(px, py + arm);
          ctx.stroke();
        }
      }

      for (const s of sparks) {
        if (!s.active) continue;
        s.age += dt;
        if (s.age >= s.maxAge) {
          s.active = false;
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.94;
        s.vy = s.vy * 0.94 + 28 * dt;

        const lifeRatio = 1 - s.age / s.maxAge;
        const sa = lifeRatio * lifeRatio * 0.85;
        const r = s.size * (0.45 + lifeRatio * 0.65);

        if (isUltra) {
          ctx.fillStyle = s.warm ? `rgba(255, 224, 155, ${sa * 0.26})` : `rgba(143, 232, 207, ${sa * 0.22})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = s.warm ? `rgba(255, 224, 155, ${sa})` : `rgba(143, 232, 207, ${sa})`;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - r * 1.6);
        ctx.lineTo(s.x + r * 0.9, s.y);
        ctx.lineTo(s.x, s.y + r * 1.6);
        ctx.lineTo(s.x - r * 0.9, s.y);
        ctx.closePath();
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener(UI_BURST_EVENT, onUiBurst);
    };
  }, [enabled, isUltra]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="ambient-gold-dust"
      aria-hidden="true"
      className="fixed inset-0 z-[21] pointer-events-none w-full h-full"
    />
  );
};
