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
        className="flex items-center gap-3 px-3 flex-shrink-0"
        style={{
          height: 48,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={() => router.push('/m/chat')}
          className="p-1"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="text-[14px] font-medium" style={{ color: '#fff' }}>
          Council
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))',
            border: '1px solid rgba(96,165,250,0.2)',
          }}
        >
          <Users size={26} strokeWidth={1.5} style={{ color: 'rgb(96,165,250)' }} />
        </div>
        <p className="text-[15px] font-medium text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Council coming soon for mobile
        </p>
      </div>
    </div>
  );
}
