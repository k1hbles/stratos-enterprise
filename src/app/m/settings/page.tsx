'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, ChevronRight } from 'lucide-react';

export default function MobileSettingsPage() {
  const router = useRouter();

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 z-10 bg-[#0f0f0f]">
        <button onClick={() => router.back()} className="text-gray-300 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-medium">Settings</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        {/* Profile Card */}
        <div className="bg-[#1c1c1e] rounded-2xl p-4 flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#2c2c2e] flex items-center justify-center">
            <User size={28} className="text-gray-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-medium text-gray-200">User</span>
            <span className="text-[13px] text-gray-500">Manage your account</span>
          </div>
        </div>

        {/* Settings sections */}
        <div className="bg-[#1c1c1e] rounded-2xl flex flex-col divide-y divide-[#2c2c2e]">
          {['General', 'Appearance', 'Notifications', 'Data & Privacy', 'About'].map((item) => (
            <button
              key={item}
              className="flex items-center justify-between p-4 text-gray-200 text-[15px]"
            >
              {item}
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
