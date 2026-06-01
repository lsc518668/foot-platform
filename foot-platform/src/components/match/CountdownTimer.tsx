import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string; // ISO 8601
  compact?: boolean;
}

export default function CountdownTimer({ targetDate, compact = false }: CountdownProps) {
  const [now, setNow] = useState(Date.now());
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (diff <= 0) {
    return (
      <span className={`text-red-400 font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
        🔴 进行中
      </span>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (compact) {
    return (
      <span className="text-accent font-mono text-xs font-medium">
        {days > 0 && `${days}d `}{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">距开赛</span>
      <div className="flex gap-1">
        {days > 0 && (
          <span className="bg-gray-800 px-2 py-0.5 rounded text-accent font-mono font-bold">{days}<span className="text-xs text-gray-500 ml-0.5">天</span></span>
        )}
        <span className="bg-gray-800 px-2 py-0.5 rounded text-accent font-mono font-bold">{String(hours).padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span className="bg-gray-800 px-2 py-0.5 rounded text-accent font-mono font-bold">{String(minutes).padStart(2, '0')}</span>
        <span className="text-gray-500">:</span>
        <span className="bg-gray-800 px-2 py-0.5 rounded text-accent font-mono font-bold">{String(seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
