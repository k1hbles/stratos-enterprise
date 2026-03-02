'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';

export default function MobileCouncilPage() {
  const router = useRouter();

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 flex-shrink-0 h-12 border-b border-[var(--border-default)]"
      >
        <button
          onClick={() => router.push('/m/chat')}
          className="p-1 text-[var(--text-secondary)]"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="text-[14px] font-medium text-[var(--text-primary)]">
          Council
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <div
          className="flex items-center justify-center rounded-full w-14 h-14"
          style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))',
            border: '1px solid rgba(96,165,250,0.2)',
          }}
        >
          <Users size={26} strokeWidth={1.5} className="text-blue-400" />
        </div>
        <p className="text-[15px] font-medium text-center text-[var(--text-secondary)]">
          Council coming soon for mobile
        </p>
      </div>
    </div>
  );
}
