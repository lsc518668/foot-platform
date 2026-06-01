import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import client from '../api/client';
import { LeaderboardEntry } from '../types';

export default function LeaderboardPage() {
  const { t } = useI18n();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    client.get('/leaderboard')
      .then(res => setLeaderboard(res.data.leaderboard))
      .catch(console.error);
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const podiumStyles = [
    { bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500', text: 'text-yellow-400', emoji: '🥇', shadow: 'podium-gold' },
    { bg: 'from-gray-300/20 to-gray-400/10', border: 'border-gray-400', text: 'text-gray-300', emoji: '🥈', shadow: 'podium-silver' },
    { bg: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500', text: 'text-orange-400', emoji: '🥉', shadow: 'podium-bronze' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">🏅 排行榜</h1>
      <p className="text-gray-400 mb-8">最强预言家榜单，实时更新</p>

      {/* Top 3 podium */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-10">
          {top3.map((entry, i) => (
            <div key={entry.userId} className={`${i === 0 ? 'order-2 -mt-4' : i === 1 ? 'order-1' : 'order-3'}`}>
              <div className={`card bg-gradient-to-b ${podiumStyles[i].bg} ${podiumStyles[i].border} border text-center ${podiumStyles[i].shadow}`}>
                <span className="text-3xl">{podiumStyles[i].emoji}</span>
                <p className={`text-lg font-bold mt-1 ${podiumStyles[i].text}`}>{entry.username}</p>
                <p className="text-2xl font-bold text-accent mt-1">{entry.totalWon.toFixed(0)}</p>
                <p className="text-xs text-gray-400">胜率 {entry.winRate}% · {entry.wonBetCount}/{entry.totalBetCount} 注</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 ? (
        <div className="card">
          <div className="space-y-2">
            {rest.map(entry => (
              <div key={entry.userId} className="flex items-center justify-between py-3 border-b border-gray-700/30 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 font-mono w-8 text-right">{entry.rank}</span>
                  <div>
                    <p className="font-medium">{entry.username}</p>
                    <p className="text-xs text-gray-500">胜率 {entry.winRate}% · {entry.wonBetCount}/{entry.totalBetCount}</p>
                  </div>
                </div>
                <p className="font-bold text-accent">{entry.totalWon.toFixed(2)} 币</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">🏆</p>
          <p>暂无排名数据</p>
          <p className="text-sm mt-2">下注后即可参与排名</p>
        </div>
      )}
    </div>
  );
}
