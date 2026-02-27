/**
 * Nightshift — Design Tokens (TypeScript)
 * Mirrors the CSS custom properties in globals.css.
 * Use for Framer Motion, runtime style calculations, and typed references.
 */

// ---------- Colors: Light Mode (default) ----------

export const colors = {
  bg: {
    page: "#F5F5F7",
    primary: "#F5F5F7",
    secondary: "#FAFAFA",
    tertiary: "#EEEEEF",
    elevated: "#E5E5E8",
  },
  text: {
    primary: "rgba(0, 0, 0, 0.85)",
    secondary: "rgba(0, 0, 0, 0.55)",
    tertiary: "rgba(0, 0, 0, 0.35)",
    muted: "rgba(0, 0, 0, 0.25)",
    inverse: "#FFFFFF",
  },
  surface: {
    glass: "rgba(255, 255, 255, 0.60)",
    glassHover: "rgba(255, 255, 255, 0.75)",
    glassBorder: "rgba(0, 0, 0, 0.08)",
    glassShadow: "0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 32px rgba(0, 0, 0, 0.06)",
    glassHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.9)",
    glassElevated: "rgba(255, 255, 255, 0.80)",
    glassElevatedBorder: "rgba(0, 0, 0, 0.10)",
    glassSubtle: "rgba(255, 255, 255, 0.40)",
    glassSubtleBorder: "rgba(0, 0, 0, 0.05)",
  },
  sidebar: {
    bg: "#FFFFFF",
    border: "rgba(0, 0, 0, 0.06)",
    itemHover: "rgba(0, 0, 0, 0.03)",
    itemActive: "rgba(0, 0, 0, 0.05)",
  },
  btn: {
    primaryBg: "#000000",
    primaryText: "#FFFFFF",
    primaryHover: "rgba(0, 0, 0, 0.80)",
    secondaryBg: "rgba(0, 0, 0, 0.04)",
    secondaryText: "rgba(0, 0, 0, 0.85)",
    secondaryBorder: "rgba(0, 0, 0, 0.10)",
  },
  accent: {
    default: "rgba(0, 0, 0, 0.85)",
    hover: "rgba(0, 0, 0, 0.70)",
    light: "rgba(0, 0, 0, 0.06)",
  },
  overlay: "rgba(0, 0, 0, 0.3)",
  status: {
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
} as const;

// ---------- Colors: Dark Mode ----------

export const darkColors = {
  bg: {
    primary: "#050507",
    secondary: "#0A0A0F",
    tertiary: "#111118",
    elevated: "#1A1A24",
  },
  text: {
    primary: "rgba(255, 255, 255, 0.92)",
    secondary: "rgba(255, 255, 255, 0.55)",
    tertiary: "rgba(255, 255, 255, 0.30)",
    muted: "rgba(255, 255, 255, 0.15)",
    inverse: "#0F172A",
  },
  surface: {
    glass: "rgba(255, 255, 255, 0.04)",
    glassHover: "rgba(255, 255, 255, 0.07)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
    glassHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    glassElevated: "rgba(255, 255, 255, 0.07)",
    glassElevatedBorder: "rgba(255, 255, 255, 0.10)",
    glassElevatedShadow: "0 4px 24px rgba(0, 0, 0, 0.5), 0 16px 48px rgba(0, 0, 0, 0.3)",
    glassElevatedHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 0 20px rgba(255, 255, 255, 0.03)",
    glassSubtle: "rgba(255, 255, 255, 0.02)",
    glassSubtleBorder: "rgba(255, 255, 255, 0.05)",
  },
  btn: {
    primaryBg: "#FFFFFF",
    primaryText: "#0F172A",
    primaryHover: "#E2E8F0",
    secondaryBg: "rgba(255, 255, 255, 0.06)",
    secondaryText: "rgba(255, 255, 255, 0.92)",
    secondaryBorder: "rgba(255, 255, 255, 0.10)",
  },
} as const;

// ---------- Typography ----------

export const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Helvetica Neue', system-ui, sans-serif",
    mono: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: "11px",
    sm: "13px",
    base: "15px",
    lg: "18px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px",
    hero: "clamp(36px, 6vw, 72px)",
  },
  headline: {
    fontWeight: "700",
    letterSpacing: "-0.02em",
    lineHeight: "1.1",
  },
  body: {
    fontWeight: "400",
    letterSpacing: "0",
    lineHeight: "1.6",
  },
  label: {
    fontWeight: "500",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
} as const;

// ---------- Spacing (4px base) ----------

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

// ---------- Border Radius ----------

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  pill: "24px",
  full: "9999px",
} as const;

// ---------- Layout ----------

export const layout = {
  contentWidthFocused: "900px",
  contentWidthDashboard: "1200px",
  sidebarExpanded: "260px",
  sidebarCollapsed: "0px",
} as const;

// ---------- Animation ----------

export const easing = {
  default: [0.16, 1, 0.3, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  spring: [0.22, 1, 0.36, 1] as const,
};

export const duration = {
  fast: 0.15,
  base: 0.3,
  slow: 0.5,
  crawl: 0.8,
} as const;
