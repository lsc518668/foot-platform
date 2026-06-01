import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { Match } from '../types';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

export default function HomePage() {
  const { t } = useI18n();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    client.get('/matches', { params: { status: 'scheduled', limit: 4 } })
      .then(res => setMatches(res.data.matches))
      .catch(console.error);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-white">🏆 2026世界杯</span>
            <br />
            <span className="text-accent">{t('home.hero')}</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            {t('home.subtitle')}
            <br />注册即送 <span className="text-accent font-bold">1000 虚拟币</span>，体验足球竞猜的乐趣！
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/register" className="btn-accent text-lg !px-8 !py-4">
              {t('home.cta')}
            </Link>
            <Link to="/dashboard" className="border-2 border-white/30 hover:border-accent text-white font-bold py-4 px-8 rounded-lg transition-all text-lg">
              {t('home.schedule')}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured matches */}
      {matches.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="w-1 h-8 bg-accent rounded inline-block"></span>
            {t('home.featured')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {matches.map(match => (
              <Link key={match.id} to={`/matches/${match.id}`} className="card hover:border-accent/50 group">
                <div className="text-center mb-3">
                  <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                    {new Date(match.match_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center flex-1">
                    <span className="text-3xl"><FlagImage code={fifaToIso2(match.homeTeam.short_code)} size={28} /></span>
                    <p className="text-sm font-medium mt-1">{match.homeTeam.name_zh}</p>
                  </div>
                  <span className="text-gray-500 text-sm font-bold px-2">VS</span>
                  <div className="text-center flex-1">
                    <span className="text-3xl"><FlagImage code={fifaToIso2(match.awayTeam.short_code)} size={28} /></span>
                    <p className="text-sm font-medium mt-1">{match.awayTeam.name_zh}</p>
                  </div>
                </div>
                {match.odds && (
                  <div className="flex gap-1 text-xs">
                    <span className="flex-1 text-center bg-gray-800 rounded py-1 text-gray-300 group-hover:border-accent/30 border border-transparent transition-colors">
                      主 {match.odds.home_win_odds}
                    </span>
                    <span className="flex-1 text-center bg-gray-800 rounded py-1 text-gray-300 group-hover:border-accent/30 border border-transparent transition-colors">
                      平 {match.odds.draw_odds}
                    </span>
                    <span className="flex-1 text-center bg-gray-800 rounded py-1 text-gray-300 group-hover:border-accent/30 border border-transparent transition-colors">
                      客 {match.odds.away_win_odds}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/dashboard" className="text-accent hover:underline">{t('common.viewAll')}</Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="card text-center !border-accent/20">
          <h2 className="text-2xl font-bold mb-4">🏅 {t('lb.title')}</h2>
          <p className="text-gray-400 mb-6">{t('lb.subtitle')}</p>
          <Link to="/leaderboard" className="btn-primary inline-block">
            {t('nav.leaderboard')}
          </Link>
        </div>
      </section>
    </div>
  );
}
