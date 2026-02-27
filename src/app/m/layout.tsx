import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Stratos',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stratos',
  },
  manifest: '/manifest.json',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-center bg-black min-h-screen font-sans text-white">
      <div
        className="w-full sm:max-w-md bg-[#0f0f0f] relative overflow-hidden flex flex-col shadow-2xl sm:border-x border-[#1c1c1e]"
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
