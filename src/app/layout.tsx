import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TRPCProvider } from "@/trpc/provider";
import { ThemeProvider } from "@/components/theme-provider";
import "@/styles/globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hyprnova — Your tasks keep moving, even when you don't",
  description:
    "Queue tasks before bed, wake up to results. AI works while you sleep.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh' }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TRPCProvider>
            {children}
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
