import { getDb } from "@/lib/db";

export interface HyprnovaSettings {
  id: string;
  userId: string;
  defaultAutonomy: "confirm" | "auto" | "supervised";
  modeOverrides: Record<string, string>;
  whatsappEnabled: boolean;
  whatsappNumber: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

/** Actions that always require user confirmation regardless of settings */
const LOCKED_ACTIONS = [
  "gmail_send",
  "write_and_register_tool",
  "gsheets_write",
  "gcal_create",
  "gdrive_delete",
  "whatsapp_send",
] as const;

const DEFAULT_SETTINGS: Omit<HyprnovaSettings, "id" | "createdAt" | "updatedAt"> = {
  userId: "",
  defaultAutonomy: "confirm",
  modeOverrides: {},
  whatsappEnabled: false,
  whatsappNumber: null,
  timezone: "Asia/Jakarta",
};

interface SettingsRow {
  id: string;
  user_id: string;
  default_autonomy: string;
  mode_overrides: string;
  whatsapp_enabled: number;
  whatsapp_number: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

function rowToSettings(row: SettingsRow): HyprnovaSettings {
  return {
    id: row.id,
    userId: row.user_id,
    defaultAutonomy: row.default_autonomy as HyprnovaSettings["defaultAutonomy"],
    modeOverrides: JSON.parse(row.mode_overrides || "{}"),
    whatsappEnabled: row.whatsapp_enabled === 1,
    whatsappNumber: row.whatsapp_number,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Get settings for a user, returning defaults if no row exists */
export function getSettings(userId: string): HyprnovaSettings {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM settings WHERE user_id = ?")
    .get(userId) as SettingsRow | undefined;

  if (!row) {
    return {
      ...DEFAULT_SETTINGS,
      id: "",
      userId,
      createdAt: "",
      updatedAt: "",
    };
  }

  return rowToSettings(row);
}

/** Update settings for a user (upsert) */
export function updateSettings(
  userId: string,
  patch: Partial<{
    defaultAutonomy: string;
    modeOverrides: Record<string, string>;
    whatsappEnabled: boolean;
    whatsappNumber: string;
    timezone: string;
  }>
): HyprnovaSettings {
  const db = getDb();
  const current = getSettings(userId);

  // Strip locked actions from mode overrides
  const modeOverrides = patch.modeOverrides ?? current.modeOverrides;
  for (const locked of LOCKED_ACTIONS) {
    delete modeOverrides[locked];
  }

  const id = current.id || crypto.randomUUID();

  db.prepare(
    `INSERT INTO settings (id, user_id, default_autonomy, mode_overrides, whatsapp_enabled, whatsapp_number, timezone, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       default_autonomy = excluded.default_autonomy,
       mode_overrides = excluded.mode_overrides,
       whatsapp_enabled = excluded.whatsapp_enabled,
       whatsapp_number = excluded.whatsapp_number,
       timezone = excluded.timezone,
       updated_at = datetime('now')`
  ).run(
    id,
    userId,
    patch.defaultAutonomy ?? current.defaultAutonomy,
    JSON.stringify(modeOverrides),
    (patch.whatsappEnabled ?? current.whatsappEnabled) ? 1 : 0,
    patch.whatsappNumber ?? current.whatsappNumber,
    patch.timezone ?? current.timezone
  );

  return getSettings(userId);
}

/**
 * Resolve autonomy level for a specific action.
 * Locked actions always return 'confirm'.
 */
export function resolveAutonomy(
  userId: string,
  mode: string,
  toolName: string
): "confirm" | "auto" | "supervised" {
  if (LOCKED_ACTIONS.includes(toolName as (typeof LOCKED_ACTIONS)[number])) {
    return "confirm";
  }

  const settings = getSettings(userId);
  const override = settings.modeOverrides[mode] ?? settings.modeOverrides[toolName];
  if (override) return override as "confirm" | "auto" | "supervised";

  return settings.defaultAutonomy;
}
