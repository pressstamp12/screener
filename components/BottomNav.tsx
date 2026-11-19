'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, Bookmark, BookOpen } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Screening', icon: Radar },
  { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/jurnal', label: 'Jurnal', icon: BookOpen },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-[#2A2A2A] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center py-3 gap-1 transition-colors active:scale-95 ${
                isActive
                  ? 'text-[#00C853] font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
