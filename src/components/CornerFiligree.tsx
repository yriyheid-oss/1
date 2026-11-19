import React from 'react';

interface CornerFiligreeProps {
  accent?: string;
}

export const CornerFiligree: React.FC<CornerFiligreeProps> = ({ accent = '#F4A949' }) => (
  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
    <svg viewBox="0 0 18 18" className="absolute -top-px -left-px w-4 h-4">
      <path d="M1 14V1h13M1 5.5h4.5V1M1 1l3.2 3.2" fill="none" stroke={accent} strokeWidth="1.35" opacity="0.9" />
      <circle cx="5.2" cy="5.2" r="0.85" fill={accent} opacity="0.85" />
    </svg>
    <svg viewBox="0 0 18 18" className="absolute -top-px -right-px w-4 h-4">
      <path d="M17 14V1H4M17 5.5h-4.5V1M17 1l-3.2 3.2" fill="none" stroke={accent} strokeWidth="1.35" opacity="0.9" />
      <circle cx="12.8" cy="5.2" r="0.85" fill={accent} opacity="0.85" />
    </svg>
    <svg viewBox="0 0 18 18" className="absolute -bottom-px -left-px w-4 h-4">
      <path d="M1 4v13h13M1 12.5h4.5V17M1 17l3.2-3.2" fill="none" stroke={accent} strokeWidth="1.35" opacity="0.9" />
      <circle cx="5.2" cy="12.8" r="0.85" fill={accent} opacity="0.85" />
    </svg>
    <svg viewBox="0 0 18 18" className="absolute -bottom-px -right-px w-4 h-4">
      <path d="M17 4v13H4M17 12.5h-4.5V17M17 17l-3.2-3.2" fill="none" stroke={accent} strokeWidth="1.35" opacity="0.9" />
      <circle cx="12.8" cy="12.8" r="0.85" fill={accent} opacity="0.85" />
    </svg>
  </div>
);
