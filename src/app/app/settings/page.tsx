'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { GlassCard } from '@/components/ui/GlassCard';
import { Toggle } from '@/components/ui/toggle';
import { Sun, Monitor, Moon } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;

const AUTONOMY_OPTIONS = [
  { value: 'confirm', label: 'Confirm — Ask before every action' },
  { value: 'supervised', label: 'Supervised — Ask for important actions only' },
  { value: 'auto', label: 'Auto — Execute without asking' },
] as const;

const TIMEZONES = [
  'Asia/Jakarta',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

interface UserSettings {
  defaultAutonomy: string;
  whatsappEnabled: boolean;
  whatsappNumber: string | null;
  timezone: string;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings>({
    defaultAutonomy: 'confirm',
    whatsappEnabled: false,
    whatsappNumber: null,
    timezone: 'Asia/Jakarta',
  });
  const [phone, setPhone] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings({
            defaultAutonomy: data.defaultAutonomy ?? 'confirm',
            whatsappEnabled: !!data.whatsappEnabled,
            whatsappNumber: data.whatsappNumber ?? null,
            timezone: data.timezone ?? 'Asia/Jakarta',
          });
        }
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  const patchSettings = useCallback(async (patch: Partial<UserSettings & { whatsappNumber: string }>) => {
    setSaveError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed to save settings');
    } catch {
      setSaveError('Failed to save settings. Please try again.');
    }
  }, []);

  const handleAutonomyChange = useCallback(
    (value: string) => {
      setSettings((prev) => ({ ...prev, defaultAutonomy: value }));
      patchSettings({ defaultAutonomy: value });
    },
    [patchSettings]
  );

  const handleWhatsappToggle = useCallback(
    (checked: boolean) => {
      setSettings((prev) => ({ ...prev, whatsappEnabled: checked }));
      patchSettings({ whatsappEnabled: checked });
    },
    [patchSettings]
  );

  const handlePhoneSave = useCallback(() => {
    if (phone.trim()) {
      patchSettings({ whatsappNumber: phone.trim() });
    }
  }, [phone, patchSettings]);

  const handleTimezoneChange = useCallback(
    (value: string) => {
      setSettings((prev) => ({ ...prev, timezone: value }));
      patchSettings({ timezone: value });
    },
    [patchSettings]
  );

  return (
    <div className="space-y-[var(--space-6)] px-4 py-6 md:px-8 md:py-8">
      <GlassCard className="p-[var(--space-6)]">
        <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          Settings
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Manage your account, preferences, and integrations.
        </p>
      </GlassCard>

      {saveError && (
        <div
          className="rounded-xl px-4 py-3 text-[13px] font-medium"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            color: 'rgba(248, 113, 113, 0.9)',
          }}
        >
          {saveError}
        </div>
      )}

      <GlassCard className="p-[var(--space-6)]">
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
          Theme
        </h3>
        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
          Choose how Hyprnova looks for you.
        </p>
        <div className="mt-4 flex gap-2">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-all duration-150"
                style={{
                  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  border: active
                    ? '1px solid rgba(255, 255, 255, 0.15)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  color: active
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.5)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {option.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-[var(--space-6)]">
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
          Account
        </h3>
        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
          Your profile and subscription details.
        </p>
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--surface-glass-border)] bg-[var(--surface-glass)] p-[var(--space-4)]">
          <p className="text-[14px] text-[var(--text-tertiary)]">Coming soon</p>
        </div>
      </GlassCard>

      {/* Autonomy */}
      <GlassCard className="p-[var(--space-6)]">
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
          Autonomy
        </h3>
        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
          How much control should your AI agents have?
        </p>
        <div className="mt-4">
          <select
            value={settingsLoaded ? settings.defaultAutonomy : 'confirm'}
            onChange={(e) => handleAutonomyChange(e.target.value)}
            className="w-full max-w-sm rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-glass-border)',
            }}
          >
            {AUTONOMY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* WhatsApp Notifications */}
      <GlassCard className="p-[var(--space-6)]">
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
          WhatsApp Notifications
        </h3>
        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
          Get notified about important events via WhatsApp.
        </p>
        <div className="mt-4 space-y-4">
          <Toggle
            checked={settings.whatsappEnabled}
            onCheckedChange={handleWhatsappToggle}
            label="Enable WhatsApp notifications"
            description="Receive job completions and action requests via WhatsApp"
          />
          {settings.whatsappEnabled && (
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2 max-w-sm">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={settings.whatsappNumber ?? '+62...'}
                  className="flex-1 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--surface-glass-border)',
                  }}
                />
                <button
                  onClick={handlePhoneSave}
                  disabled={!phone.trim()}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  Save
                </button>
              </div>
              {settings.whatsappNumber && (
                <p className="text-[12px] text-white/30 mt-1.5">
                  Current: {settings.whatsappNumber}
                </p>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Timezone */}
      <GlassCard className="p-[var(--space-6)]">
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
          Timezone
        </h3>
        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
          Used for scheduling automations and displaying timestamps.
        </p>
        <div className="mt-4">
          <select
            value={settingsLoaded ? settings.timezone : 'Asia/Jakarta'}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="w-full max-w-sm rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-glass-border)',
            }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>
    </div>
  );
}
