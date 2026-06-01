import { useState } from 'react';
import { useParlayStore } from '../../stores/parlayStore';
import { useWalletStore } from '../../stores/walletStore';
import client from '../../api/client';

export default function ParlaySlip() {
  const { legs, removeLeg, clearAll, totalOdds } = useParlayStore();
  const { wallet, fetchWallet } = useWalletStore();
  const [amount, setAmount] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (legs.length === 0) return null;

  const potentialPayout = Math.round(amount * totalOdds * 100) / 100;
  const minBet = 1;

  const handleSubmit = async () => {
    if (amount < minBet) return;
    setSubmitting(true); setMsg(null);
    try {
      const res = await client.post('/parlay', {
        legs: legs.map(l => ({ matchId: l.matchId, marketType: l.marketType, betType: l.betType })),
        amount,
      });
      setMsg({ type: 'success', text: res.data.message + `！潜在回报: ${res.data.ticket.potentialPayout} 币` });
      fetchWallet();
      clearAll();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.error || '投注失败' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="card !bg-surface/95 backdrop-blur !border-accent/50 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-accent">🎯 串关 ({legs.length}/8)</h3>
          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-400">清空</button>
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto mb-3">
          {legs.map((leg, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded p-2 text-xs">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{leg.matchName}</p>
                <p className="text-gray-400">{leg.marketLabel}: {leg.betLabel} @{leg.odds}</p>
              </div>
              <button onClick={() => removeLeg(i)} className="text-red-400 hover:text-red-300 ml-2 shrink-0">✕</button>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-400 mb-2">
          总赔率: <span className="text-accent font-bold text-lg">{totalOdds}</span>
          　{legs.length}串1（全中才赢）
        </div>

        <div className="flex gap-2 mb-2">
          {[50, 100, 200, 500].map(a => (
            <button key={a} onClick={() => setAmount(a)}
              className={`flex-1 py-1 rounded text-xs ${amount === a ? 'bg-accent text-gray-900 font-bold' : 'bg-gray-700 text-gray-300'}`}>{a}</button>
          ))}
        </div>

        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
          className="input-field !py-1.5 !text-sm mb-1" min={minBet} />

        <div className="flex justify-between text-xs text-gray-400 mb-3">
          <span>余额: {wallet?.balance?.toFixed(0) || 0}</span>
          <span>回报: <span className="text-green-400 font-bold">{potentialPayout.toFixed(0)} 币</span></span>
        </div>

        {msg && (
          <div className={`text-xs px-3 py-2 rounded mb-2 ${msg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting || legs.length < 2 || amount < minBet || !!(wallet && amount > wallet.balance)}
          className="btn-accent w-full !py-2 !text-sm disabled:opacity-50">
          {submitting ? '提交中...' : legs.length < 2 ? '至少选择2场' : wallet && amount > wallet.balance ? '余额不足' : `提交串关 ${amount} 币`}
        </button>
      </div>
    </div>
  );
}
