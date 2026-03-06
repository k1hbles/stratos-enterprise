'use client';

import { usePathname } from 'next/navigation';

/**
 * Forces a full remount of the page component on every route change.
 * Without this, Next.js's router cache can restore a cached page without
 * remounting it, so Framer Motion initial→animate transitions never replay.
 */
export function PageRemounter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="contents">{children}</div>;
}
