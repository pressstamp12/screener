import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import OfflineBanner from '@/components/OfflineBanner';
import PwaRegister from '@/components/PwaRegister';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mode D Screener — Saham Rebound IDX',
  description:
    'Aplikasi PWA screening saham rebound harian Mode D untuk trader modal kecil di Indonesia.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mode D Screener',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F0F0F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.className} bg-[#0F0F0F] text-white antialiased`}>
        <PwaRegister />
        <OfflineBanner />
        <main className="max-w-md mx-auto min-h-screen px-4 pt-5 pb-28">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
