'use client';

export function ParticlesBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ background: 'var(--bg-home)' }}
    />
  );
}
