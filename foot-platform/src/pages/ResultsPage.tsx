import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useI18n } from '../i18n';
import { Match, STAGE_LABELS } from '../types';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

export default function ResultsPage() {
  const { t } = useI18n();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    client.get('/matches', { params: { status: 'finished', limit: 50 } })
      .then(res => setMatches(res.data.matches))
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📊 比赛结果</h1>

      {matches.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">⏳</p>
          <p>暂无完赛数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <Link key={match.id} to={`/matches/${match.id}`} className="card block hover:border-accent/50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl"><FlagImage code={fifaToIso2(match.homeTeam.short_code)} size={28} /></span>
                  <span className="font-medium text-sm">{match.homeTeam.name_zh}</span>
                  {match.home_score !== null && (
                    <span className="text-xl font-bold text-accent">
                      {match.home_score} - {match.away_score}
                    </span>
                  )}
                  <span className="font-medium text-sm">{match.awayTeam.name_zh}</span>
                  <span className="text-2xl"><FlagImage code={fifaToIso2(match.awayTeam.short_code)} size={28} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{STAGE_LABELS[match.stage] || match.stage}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(match.match_date).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
