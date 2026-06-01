import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useI18n } from '../i18n';
import { Bet, BET_TYPE_LABELS } from '../types';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

export default function MyBetsPage() {
  const { t } = useI18n();
  const [bets, setBets] = useState<Bet[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    client.get('/bets/my', { params: { status: status || undefined, page, limit: 20 } })
      .then(res => { setBets(res.data.bets); setTotal(res.data.total); })
      .catch(console.error);
  }, [status, page]);

  const tabs = [
    { key: '', label: t('bet.all') },
    { key: 'pending', label: t('bet.pending') },
    { key: 'won', label: t('bet.won') },
    { key: 'lost', label: t('bet.lost') },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    won: 'bg-green-500/20 text-green-400',
    lost: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-gray-500/20 text-gray-400',
    refunded: 'bg-blue-500/20 text-blue-400',
  };

  const statusLabels: Record<string, string> = {
    pending: t('bet.pending'),
    won: t('bet.won'),
    lost: t('bet.lost'),
    cancelled: t('bet.cancelled'),
    refunded: t('bet.refunded'),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📋 我的投注</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setStatus(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              status === tab.key ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">🎫</p>
          <p>暂无投注记录</p>
          <Link to="/dashboard" className="text-accent hover:underline mt-2 inline-block">去下注 →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map(bet => (
            <div key={bet.id} className="card">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl"><FlagImage code={fifaToIso2(bet.match.homeTeam.short_code)} size={28} /></span>
                  <div>
                    <p className="font-medium">{bet.match.homeTeam.name_zh} vs {bet.match.awayTeam.name_zh}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(bet.match.match_date).toLocaleDateString('zh-CN')} · {bet.match.stage}
                    </p>
                  </div>
                  <span className="text-2xl"><FlagImage code={fifaToIso2(bet.match.awayTeam.short_code)} size={28} /></span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-xs font-bold">
                      {BET_TYPE_LABELS[bet.bet_type]}
                    </span>
                    <p className="text-sm mt-1">
                      <span className="text-gray-400">{bet.amount} × {bet.odds_at_bet}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      潜在回报: {bet.potential_payout.toFixed(2)}
                    </p>
                  </div>

                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[bet.status]}`}>
                    {statusLabels[bet.status]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm ${
                page === i + 1 ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400'
              }`}
            >{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
