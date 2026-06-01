import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Match, MATCH_STATUS_LABELS, STAGE_LABELS } from '../types';
import CountdownTimer from '../components/match/CountdownTimer';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

export default function DashboardPage() {
  const { t } = useI18n();
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('scheduled');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    client.get('/matches', { params: { status: status || undefined, stage: stage || undefined, page, limit: 12 } })
      .then(res => {
        setMatches(res.data.matches);
        setTotal(res.data.total);
      })
      .catch(console.error);
  }, [status, stage, page]);

  const statusTabs = [
    { key: 'scheduled', label: t('dashboard.upcoming') },
    { key: 'live', label: t('dashboard.live') },
    { key: 'finished', label: t('dashboard.finished') },
    { key: '', label: t('dashboard.all') },
  ];

  const stageTabs = [
    { key: '', label: t('dashboard.allStages') },
    { key: 'group', label: '小组赛' },
    { key: 'round_of_32', label: '32强' },
    { key: 'round_of_16', label: '16强' },
    { key: 'quarter_final', label: '1/4决赛' },
    { key: 'semi_final', label: '半决赛' },
    { key: 'final', label: '决赛' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">⚽ {t('dashboard.title')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatus(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              status === tab.key
                ? 'bg-accent text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {stageTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStage(tab.key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              stage === tab.key
                ? 'bg-primary-light text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Match grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(match => (
          <Link key={match.id} to={`/matches/${match.id}`} className="card hover:border-accent/50 group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                {new Date(match.match_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {match.status === 'scheduled' && <CountdownTimer targetDate={match.match_date} compact />}
              <span className={`text-xs px-2 py-0.5 rounded ${
                match.status === 'live' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                match.status === 'finished' ? 'bg-gray-500/20 text-gray-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {MATCH_STATUS_LABELS[match.status]}
              </span>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <FlagImage code={fifaToIso2(match.homeTeam.short_code)} size={28} />
                <span className="font-medium text-sm">{match.homeTeam.name_zh}</span>
              </div>
              {match.status === 'finished' && match.home_score !== null ? (
                <span className="text-xl font-bold mx-3">
                  {match.home_score} - {match.away_score}
                </span>
              ) : (
                <span className="text-gray-500 text-sm mx-3">VS</span>
              )}
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className="font-medium text-sm">{match.awayTeam.name_zh}</span>
                <FlagImage code={fifaToIso2(match.awayTeam.short_code)} size={28} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{STAGE_LABELS[match.stage] || match.stage}</span>
              <span className="text-xs text-gray-500">{match.venue}</span>
            </div>

            {match.odds && match.status === 'scheduled' && (
              <div className="flex gap-1 mt-3 pt-3 border-t border-gray-700/50">
                <span className="flex-1 text-center bg-gray-800 rounded py-1.5 text-xs font-medium group-hover:bg-gray-700 transition-colors">
                  主 {match.odds.home_win_odds}
                </span>
                <span className="flex-1 text-center bg-gray-800 rounded py-1.5 text-xs font-medium group-hover:bg-gray-700 transition-colors">
                  平 {match.odds.draw_odds}
                </span>
                <span className="flex-1 text-center bg-gray-800 rounded py-1.5 text-xs font-medium group-hover:bg-gray-700 transition-colors">
                  客 {match.odds.away_win_odds}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {total > 12 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.ceil(total / 12) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                page === i + 1 ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {matches.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📅</p>
          <p>{t('match.noData')}</p>
        </div>
      )}
    </div>
  );
}
