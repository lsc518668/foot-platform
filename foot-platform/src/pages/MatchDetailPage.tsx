import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useParlayStore } from '../stores/parlayStore';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useWalletStore } from '../stores/walletStore';
import { Match, BetType, BET_TYPE_LABELS, STAGE_LABELS, Odds, MarketType, MARKET_LABELS } from '../types';
import CountdownTimer from '../components/match/CountdownTimer';
import FlagImage, { fifaToIso2 } from '../components/common/FlagImage';

type SelectedBet = { market: MarketType; type: string; label: string; odds: number };

export default function MatchDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { wallet, fetchWallet } = useWalletStore();
  const { addLeg } = useParlayStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [allOdds, setAllOdds] = useState<Odds[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('full_time');
  const [selectedBet, setSelectedBet] = useState<SelectedBet | null>(null);
  const [amount, setAmount] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [limits, setLimits] = useState<{ minBet: number; maxBet: number }>({ minBet: 1, maxBet: 5000 });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      client.get(`/matches/${id}`).then(res => setMatch(res.data.match)).catch(console.error);
      client.get(`/odds/match/${id}/all`).then(res => setAllOdds(res.data.odds || [])).catch(() => {});
    }
    client.get('/config/public')
      .then(res => setLimits({ minBet: res.data.min_bet_amount || 1, maxBet: res.data.max_bet_amount || 5000 }))
      .catch(() => {});
  }, [id]);

  useEffect(() => { if (isAuthenticated) fetchWallet(); }, [isAuthenticated, fetchWallet]);

  const currentOdds = allOdds.find(o => o.market_type === selectedMarket);

  const handleBet = async () => {
    if (!selectedBet || !match) return;
    setSubmitting(true); setMessage(null);
    try {
      const res = await client.post('/bets', { matchId: match.id, betType: selectedBet.type, marketType: selectedBet.market, amount });
      setMessage({ type: 'success', text: `投注成功！潜在回报：${res.data.bet.potential_payout.toFixed(2)} 币` });
      fetchWallet(); setSelectedBet(null); setShowConfirm(false);
    } catch (err: any) { setMessage({ type: 'error', text: err.response?.data?.error || '投注失败' }); }
    finally { setSubmitting(false); }
  };

  const amountError = (() => {
    if (amount < limits.minBet) return `最小投注 ${limits.minBet} 币`;
    if (amount > limits.maxBet) return `最大投注 ${limits.maxBet} 币`;
    if (wallet && amount > wallet.balance) return `余额不足（当前 ${wallet.balance.toFixed(0)} 币）`;
    return null;
  })();

  if (!match) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
      <p className="text-gray-400">加载中...</p>
    </div>;
  }

  const quickAmounts = [limits.minBet, Math.min(50, limits.maxBet), Math.min(100, limits.maxBet), Math.min(200, limits.maxBet), Math.min(500, limits.maxBet)].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Match header */}
      <div className="card mb-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
          <span className="bg-gray-800 px-3 py-1 rounded">{STAGE_LABELS[match.stage] || match.stage}</span>
          <span className="bg-gray-800 px-3 py-1 rounded">{new Date(match.match_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-gray-500 text-sm mb-2">{match.venue}</p>
        {match.status === 'scheduled' && <div className="flex justify-center mb-4"><CountdownTimer targetDate={match.match_date} /></div>}
        <div className="flex items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <span className="text-5xl md:text-7xl mb-2 block"><FlagImage code={fifaToIso2(match.homeTeam.short_code)} size={64} /></span>
            <h2 className="text-lg md:text-2xl font-bold">{match.homeTeam.name_zh}</h2>
            <p className="text-sm text-gray-400">Elo: {match.homeTeam.elo_rating}</p>
          </div>
          <div className="text-center">
            {match.status === 'finished' ? (
              <div className="text-3xl md:text-5xl font-bold text-accent">{match.home_score} - {match.away_score}</div>
            ) : <div className="text-2xl md:text-4xl font-bold text-gray-500">VS</div>}
            <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${match.status === 'live' ? 'bg-red-500/20 text-red-400 animate-pulse' : match.status === 'finished' ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
              {{ scheduled: t('dashboard.upcoming'), live: t('dashboard.live'), finished: t('dashboard.finished'), cancelled: t('dashboard.finished') }[match.status] || match.status}
            </span>
          </div>
          <div className="text-center">
            <span className="text-5xl md:text-7xl mb-2 block"><FlagImage code={fifaToIso2(match.awayTeam.short_code)} size={64} /></span>
            <h2 className="text-lg md:text-2xl font-bold">{match.awayTeam.name_zh}</h2>
            <p className="text-sm text-gray-400">Elo: {match.awayTeam.elo_rating}</p>
          </div>
        </div>
      </div>

      {/* Market tabs */}
      {match.status === 'scheduled' && allOdds.length > 0 && (
        <div className="card mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(MARKET_LABELS) as MarketType[]).filter(m => allOdds.some(o => o.market_type === m)).map(m => (
              <button key={m} onClick={() => { setSelectedMarket(m); setSelectedBet(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedMarket === m ? 'bg-accent text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {MARKET_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Odds display based on market type */}
          {currentOdds && renderOddsPanel(currentOdds, selectedMarket, match, isAuthenticated, selectedBet, setSelectedBet, t, addLeg, MARKET_LABELS)}

          {!isAuthenticated && <p className="text-center text-gray-500 text-sm mt-3">请登录后投注</p>}
        </div>
      )}

      {/* Betting slip */}
      {isAuthenticated && match.status === 'scheduled' && selectedBet && (
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">投注单</h3>
          <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-gray-400 text-sm">盘口：</span>
              <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-bold">{MARKET_LABELS[selectedBet.market]}</span>
              <span className="text-gray-400 text-sm">选项：</span>
              <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-bold">{selectedBet.label}</span>
              <span className="text-gray-400 text-sm">赔率：</span>
              <span className="text-accent font-bold">{selectedBet.odds}</span>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-2">投注金额</label>
              <div className="flex gap-2 mb-2">
                {quickAmounts.map(a => (
                  <button key={a} onClick={() => setAmount(a)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${amount === a ? 'bg-accent text-gray-900 font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{a}</button>
                ))}
              </div>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                min={limits.minBet} max={limits.maxBet}
                className={`input-field ${amountError ? '!border-red-500/50' : ''}`} />
              {amountError && <p className="text-red-400 text-xs mt-1">⚠ {amountError}</p>}
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>余额: {wallet?.balance?.toFixed(2) || 0} 币</span>
                <span>潜在回报: <span className="text-accent font-bold">{(amount * selectedBet.odds).toFixed(2)}</span> 币</span>
              </div>
            </div>
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>{message.text}</div>
            )}
            {showConfirm && !submitting && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm">
                <p className="text-yellow-400 font-bold mb-2">⚠ 确认投注</p>
                <div className="text-gray-300 space-y-1 mb-3">
                  <p>比赛：{match.homeTeam.name_zh} vs {match.awayTeam.name_zh}</p>
                  <p>盘口：{MARKET_LABELS[selectedBet.market]}</p>
                  <p>选项：<span className="text-accent">{selectedBet.label}</span></p>
                  <p>金额：<span className="text-accent">{amount} 币</span></p>
                  <p>赔率：<span className="text-accent">{selectedBet.odds}</span></p>
                  <p>潜在回报：<span className="text-green-400 font-bold">{(amount * selectedBet.odds).toFixed(2)} 币</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleBet} className="flex-1 bg-accent text-gray-900 font-bold py-2 rounded-lg hover:bg-accent-light">确认下注</button>
                  <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg hover:bg-gray-600">取消</button>
                </div>
              </div>
            )}
            {!showConfirm && !submitting && (
              <button onClick={() => setShowConfirm(true)} disabled={!!amountError || amount <= 0}
                className="btn-accent w-full !text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {amountError || `投注 ${amount} 币`}
              </button>
            )}
            {submitting && <button disabled className="btn-accent w-full !text-lg opacity-50 cursor-not-allowed">投注中...</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function renderOddsPanel(
  odds: Odds,
  market: MarketType,
  match: Match,
  isAuth: boolean,
  selected: SelectedBet | null,
  onSelect: (b: SelectedBet) => void,
  t: (k: string) => string,
  addLeg: (leg: any) => void,
  mLabels: Record<string, string>
) {
  const addToParlay = (type: string, label: string, oddsVal: number) => {
    addLeg({ matchId: match.id, matchName: `${match.homeTeam.name_zh} vs ${match.awayTeam.name_zh}`, marketType: market, marketLabel: mLabels[market] || market, betType: type, betLabel: label, odds: oddsVal });
  };

  const btn = (type: string, label: string, oddsVal: number) => (
    <div key={type} className="relative group/btn">
      <button onClick={() => isAuth && onSelect({ market, type, label, odds: oddsVal })}
        className={`w-full p-3 rounded-xl text-center transition-all ${!isAuth ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105'} ${
          selected?.type === type && selected?.market === market ? 'bg-accent text-gray-900 scale-105 ring-2 ring-accent/50' : 'bg-gray-800 hover:bg-gray-700'}`}>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className={`text-xl font-bold ${selected?.type === type && selected?.market === market ? 'text-gray-900' : 'text-accent'}`}>{oddsVal}</p>
      </button>
      {isAuth && (
        <button onClick={() => addToParlay(type, label, oddsVal)}
          className="absolute -top-1 -right-1 bg-accent text-gray-900 text-xs w-5 h-5 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity flex items-center justify-center font-bold"
          title="加入串关">+</button>
      )}
    </div>
  );

  // Full time, first half, second half → 3 buttons
  if (['full_time', 'first_half', 'second_half'].includes(market)) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {btn('home_win', t('match.homeWin'), odds.home_win_odds!)}
        {btn('draw', t('match.draw'), odds.draw_odds!)}
        {btn('away_win', t('match.awayWin'), odds.away_win_odds!)}
      </div>
    );
  }

  // Correct score → scrollable grid
  if (market === 'correct_score') {
    let scores: { score: string; odds: number }[] = [];
    try { scores = JSON.parse(odds.odds_data || '[]'); } catch {}
    if (scores.length === 0) return <p className="text-gray-500 text-sm text-center py-4">{t('common.loading')}</p>;
    return (
      <div className="grid grid-cols-4 md:grid-cols-5 gap-2 max-h-[280px] overflow-y-auto pr-1">
        {scores.map((s) => (
          <button key={s.score} onClick={() => isAuth && onSelect({ market, type: s.score, label: s.score, odds: s.odds })}
            className={`p-2 rounded-lg text-center transition-all border border-gray-700/50 ${!isAuth ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-accent/50'} ${
              selected?.type === s.score ? 'bg-accent text-gray-900 border-accent' : 'bg-gray-800/80 text-white'}`}>
            <p className={`text-sm font-bold ${selected?.type === s.score ? 'text-gray-900' : 'text-white'}`}>{s.score}</p>
            <p className={`text-xs mt-0.5 ${selected?.type === s.score ? 'text-gray-700' : 'text-accent'}`}>{s.odds}</p>
          </button>
        ))}
      </div>
    );
  }

  // Penalty → Yes/No
  if (market === 'penalty') {
    const data = odds.odds_data ? JSON.parse(odds.odds_data) : { yesOdds: 5, noOdds: 1.05 };
    return (
      <div className="grid grid-cols-2 gap-3">
        {btn('penalty_yes', '有点球', data.yesOdds)}
        {btn('penalty_no', '无点球', data.noOdds)}
      </div>
    );
  }

  // Corners → Over/Under
  if (market === 'corners') {
    const data = odds.odds_data ? JSON.parse(odds.odds_data) : { overOdds: 1.8, underOdds: 1.9, line: 9.5 };
    return (
      <div>
        <p className="text-center text-sm text-gray-400 mb-3">角球总数 {data.line}</p>
        <div className="grid grid-cols-2 gap-3">
          {btn('corners_over', `大于 ${data.line}`, data.overOdds)}
          {btn('corners_under', `小于 ${data.line}`, data.underOdds)}
        </div>
      </div>
    );
  }

  return null;
}
