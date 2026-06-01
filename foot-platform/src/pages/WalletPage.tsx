import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useWalletStore } from '../stores/walletStore';

const typeLabels: Record<string, string> = {
  deposit: '充值',
  bet_placed: '下注',
  bet_won: '获胜',
  bet_refunded: '退款',
  admin_adjust: '调整',
};

export default function WalletPage() {
  const { t } = useI18n();
  const { wallet, transactions, loading, fetchWallet, fetchTransactions } = useWalletStore();

  useEffect(() => {
    fetchWallet();
    fetchTransactions(1);
  }, [fetchWallet, fetchTransactions]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">💰 我的钱包</h1>

      {/* Balance card */}
      {wallet && (
        <div className="card mb-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">当前余额</p>
            <p className="text-4xl md:text-5xl font-bold text-accent">{wallet.balance.toFixed(2)}</p>
            <p className="text-gray-500 text-sm mt-1">虚拟币</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700/50">
            <div className="text-center">
              <p className="text-gray-400 text-sm">生涯赢取</p>
              <p className="text-xl font-bold text-green-400">{wallet.totalWon.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">总投注</p>
              <p className="text-xl font-bold">{wallet.totalBetCount} 注</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">胜率</p>
              <p className="text-xl font-bold text-accent">{wallet.winRate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">交易记录</h2>
        {loading ? (
          <p className="text-center text-gray-400 py-8">加载中...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">暂无交易记录</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-700/30 last:border-0">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                    tx.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {typeLabels[tx.type] || tx.type}
                  </span>
                  <span className="text-sm text-gray-400">{tx.description}</span>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(tx.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
