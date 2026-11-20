'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { formatDateIndo } from '@/lib/format';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [lastDate, setLastDate] = useState<string>('');

  useEffect(() => {
    const syncStatus = () => {
      setIsOffline(!navigator.onLine);
      const saved = localStorage.getItem('sc2_last_scan');
      setLastDate(saved ? formatDateIndo(saved) : 'belum ada scan');
    };

    syncStatus();
    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);

    return () => {
      window.removeEventListener('online', syncStatus);
      window.removeEventListener('offline', syncStatus);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-50 bg-[#FF3B30] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Kamu offline, data terakhir tanggal {lastDate}</span>
    </div>
  );
}
