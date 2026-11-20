import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import OfflineBanner from '@/components/OfflineBanner';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Screener IDX — Day Trade & Rebound',
  description: 'Screener saham IDX multi-faktor untuk day trade dan rebound, dengan backtest dan rencana trade.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Screener IDX' },
  icons: { icon: '/icons/icon-192x192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#0F0F0F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body className="font-sans bg-[#0F0F0F] text-white antialiased">
        <PwaRegister />
        <OfflineBanner />
        <main className="max-w-md md:max-w-2xl mx-auto min-h-screen px-4 pt-5 pb-28">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
