'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface Integration {
  name: string;
  slug: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
}

interface ApiIntegration {
  slug: string;
  connected: boolean;
}

const INTEGRATIONS_META: { name: string; slug: string; description: string; icon: React.ReactNode }[] = [
  {
    name: 'Gmail',
    slug: 'gmail',
    description: 'Send and read emails',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <path d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="#EA4335" fillOpacity="0.15" />
        <path d="M2 6L12 13L22 6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Google Sheets',
    slug: 'google-sheets',
    description: 'Read and write spreadsheets',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#34A853" fillOpacity="0.15" />
        <path d="M14 2L20 8H14V2Z" fill="#34A853" fillOpacity="0.25" />
        <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="7" y="11" width="10" height="7" rx="0.5" stroke="#34A853" strokeWidth="1" />
        <line x1="7" y1="14" x2="17" y2="14" stroke="#34A853" strokeWidth="1" />
        <line x1="11" y1="11" x2="11" y2="18" stroke="#34A853" strokeWidth="1" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    slug: 'whatsapp',
    description: 'Send notifications and messages',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12C2 13.89 2.525 15.66 3.438 17.168L2 22L6.931 20.594C8.397 21.436 10.143 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" fill="#25D366" fillOpacity="0.15" stroke="#25D366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 10.5C8.5 10.5 9 8.5 10 8.5C11 8.5 11 9.5 11.5 10C12 10.5 12.5 11 13 11.5C13.5 12 15.5 12.5 15.5 12.5C15.5 12.5 16 14 14.5 15C13 16 12 15.5 11 15C10 14.5 8.5 13 8 12C7.5 11 8.5 10.5 8.5 10.5Z" stroke="#25D366" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Google Calendar',
    slug: 'google-calendar',
    description: 'Manage events and schedules',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4" fillOpacity="0.15" stroke="#4285F4" strokeWidth="1.5" />
        <path d="M3 9H21" stroke="#4285F4" strokeWidth="1.5" />
        <path d="M8 2V5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 2V5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="7" y="12" width="3" height="2.5" rx="0.5" fill="#4285F4" fillOpacity="0.6" />
        <rect x="14" y="12" width="3" height="2.5" rx="0.5" fill="#4285F4" fillOpacity="0.6" />
        <rect x="7" y="16.5" width="3" height="2.5" rx="0.5" fill="#4285F4" fillOpacity="0.6" />
      </svg>
    ),
  },
  {
    name: 'Google Drive',
    slug: 'google-drive',
    description: 'Access and manage files',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <path d="M8 2L1 14H8L15 2H8Z" fill="#FBBC04" fillOpacity="0.2" stroke="#FBBC04" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M15 2L8 14H15L22 2H15Z" fill="#34A853" fillOpacity="0.2" stroke="#34A853" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M1 14L5 22H19L15 14H1Z" fill="#4285F4" fillOpacity="0.2" stroke="#4285F4" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Slack',
    slug: 'slack',
    description: 'Send messages to channels',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
        <path d="M6 15C4.89543 15 4 15.8954 4 17C4 18.1046 4.89543 19 6 19C7.10457 19 8 18.1046 8 17V15H6Z" fill="#E01E5A" fillOpacity="0.7" />
        <path d="M6 5C4.89543 5 4 5.89543 4 7C4 8.10457 4.89543 9 6 9H11V7C11 5.89543 10.1046 5 9 5H6Z" fill="#36C5F0" fillOpacity="0.7" />
        <path d="M18 5C16.8954 5 16 5.89543 16 7V12H18C19.1046 12 20 11.1046 20 10V7C20 5.89543 19.1046 5 18 5Z" fill="#2EB67D" fillOpacity="0.7" />
        <path d="M13 17C13 18.1046 13.8954 19 15 19H18C19.1046 19 20 18.1046 20 17C20 15.8954 19.1046 15 18 15H13V17Z" fill="#ECB22E" fillOpacity="0.7" />
        <path d="M8 10V12H11V10C11 8.89543 10.1046 8 9 8C7.89543 8 8 8.89543 8 10Z" fill="#E01E5A" fillOpacity="0.3" />
        <path d="M13 10V12H16V10C16 8.89543 15.1046 8 14 8C12.8954 8 13 8.89543 13 10Z" fill="#2EB67D" fillOpacity="0.3" />
      </svg>
    ),
  },
];

export default function IntegrationsPage() {
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/integrations/status', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.integrations) {
          const map: Record<string, boolean> = {};
          for (const item of data.integrations as ApiIntegration[]) {
            map[item.slug] = item.connected;
          }
          setStatusMap(map);
        }
      })
      .catch(() => {
        // fail silently — badges stay as "Coming soon"
      });
  }, []);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          Integrations
        </h1>
        <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
          Connect your tools and services
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS_META.map((integration) => {
          const isConnected = statusMap[integration.slug] === true;
          return (
            <GlassCard
              key={integration.slug}
              className={`p-5 ${isConnected ? '' : 'opacity-50 cursor-not-allowed'}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                >
                  {integration.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">
                      {integration.name}
                    </p>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={
                        isConnected
                          ? { background: 'rgba(52, 211, 153, 0.15)', color: 'rgb(52, 211, 153)' }
                          : { background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }
                      }
                    >
                      {isConnected ? 'Connected' : 'Coming soon'}
                    </span>
                  </div>
                  <p className="text-[13px] text-white/40 mt-1">
                    {integration.description}
                  </p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
