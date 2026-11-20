'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, Bookmark, BookOpen, FlaskConical, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Screener', icon: Radar },
  { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/jurnal', label: 'Jurnal', icon: BookOpen },
  { href: '/backtest', label: 'Backtest', icon: FlaskConical },
  { href: '/pengaturan', label: 'Atur', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-[#2A2A2A] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md md:max-w-2xl mx-auto grid grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center py-2.5 gap-1 transition-colors active:scale-95 ${
                isActive ? 'text-[#00C853] font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[11px] tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
