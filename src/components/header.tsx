'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-12 items-center justify-between px-3 md:hidden"
      style={{
        background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--sidebar-border)',
      }}
    >
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        aria-label="Open menu"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      <Link href="/app" className="flex items-center">
        <Image src="/logo-mark.png" alt="Logo" width={26} height={26} className="object-contain" />
      </Link>

      <Link
        href="/app/settings"
        className="flex h-8 w-8 items-center justify-center"
      >
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-medium"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          {userInitial}
        </div>
      </Link>
    </header>
  );
}
