import type { Metadata, Viewport } from 'next';
import { PageRemounter } from './PageRemounter';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'ELK',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ELK',
  },
  manifest: '/manifest.json',
};

// Static inline script — no user input, safe from XSS.
// Sets the theme class before first paint to prevent flash.
const themeInitScript = `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(t)})()`;

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mobile-shell flex justify-center bg-[var(--bg-page)] min-h-screen font-sans text-[var(--text-primary)]">
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <div
        className="w-full sm:max-w-md bg-[var(--bg-page)] relative overflow-hidden flex flex-col shadow-2xl sm:border-x border-[var(--border-default)]"
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <PageRemounter>{children}</PageRemounter>
      </div>
    </div>
  );
}
