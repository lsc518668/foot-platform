import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../i18n';
import client from '../api/client';

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少6个字符' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await client.put('/auth/change-password', { oldPassword, newPassword });
      setMessage({ type: 'success', text: t('profile.pwdSuccess') });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || '修改失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">👤 个人中心</h1>

      {/* User info card */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">基本信息</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">用户名</p>
            <p className="font-medium">{user.username}</p>
          </div>
          <div>
            <p className="text-gray-400">邮箱</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-gray-400">余额</p>
            <p className="font-bold text-accent">{user.balance.toFixed(2)} 币</p>
          </div>
          <div>
            <p className="text-gray-400">注册时间</p>
            <p className="font-medium">{new Date(user.created_at).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <p className="text-gray-400">生涯赢取</p>
            <p className="font-bold text-green-400">{user.total_won.toFixed(2)} 币</p>
          </div>
          <div>
            <p className="text-gray-400">胜率</p>
            <p className="font-medium">{user.total_bet_count > 0 ? `${((user.won_bet_count / user.total_bet_count) * 100).toFixed(1)}%` : '-'} ({user.won_bet_count}/{user.total_bet_count})</p>
          </div>
        </div>
      </div>

      {/* Betting Charts */}
      {user.total_bet_count > 0 && (
        <BettingCharts userId={user.id} />
      )}

      {/* Change password */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">修改密码</h2>
        {message && (
          <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">当前密码</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
              className="input-field" placeholder="输入当前密码" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">新密码</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="input-field" placeholder="至少6个字符" minLength={6} required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">确认新密码</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="input-field" placeholder="再次输入新密码" minLength={6} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('common.loading') : t('profile.changePwd')}
          </button>
        </form>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm underline">
        退出登录
      </button>
    </div>
  );
}

/** SVG line chart for win rate trend and balance history */
function BettingCharts({ userId }: { userId: number }) {
  const [bets, setBets] = useState<any[]>([]);

  useEffect(() => {
    client.get('/bets/my', { params: { limit: 100 } })
      .then(res => setBets(res.data.bets || []))
      .catch(() => {});
  }, [userId]);

  if (bets.length === 0) return null;

  // Calculate cumulative win rate over time
  const settled = bets.filter((b: any) => b.status === 'won' || b.status === 'lost').reverse();
  const points: { label: number; winRate: number; balance: number }[] = [];
  let won = 0, total = 0, balance = 0;

  for (const b of settled) {
    total++;
    if (b.status === 'won') { won++; balance += b.potential_payout; }
    else { balance -= b.amount; }
    points.push({ label: total, winRate: Math.round((won / total) * 100), balance });
  }

  const W = 320, H = 100, pad = 5;
  const maxWR = Math.max(10, ...points.map(p => p.winRate));
  const minWR = Math.min(0, ...points.map(p => p.winRate));
  const rangeWR = maxWR - minWR || 1;

  const bals = points.map(p => p.balance);
  const maxBal = Math.max(100, ...bals);
  const minBal = Math.min(0, ...bals);
  const rangeBal = maxBal - minBal || 1;

  const xStep = points.length > 1 ? (W - 2 * pad) / (points.length - 1) : 0;

  const winLine = points.map((p, i) =>
    `${pad + i * xStep},${H - pad - ((p.winRate - minWR) / rangeWR) * (H - 2 * pad)}`
  ).join(' ');

  const balLine = points.map((p, i) =>
    `${pad + i * xStep},${H - pad - ((p.balance - minBal) / rangeBal) * (H - 2 * pad)}`
  ).join(' ');

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-bold mb-4">📈 投注分析</h2>

      {/* Win rate chart */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">胜率走势 <span className="text-green-400 font-bold">{points[points.length - 1]?.winRate ?? 0}%</span></p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-gray-800/50 rounded">
          <polyline points={winLine} fill="none" stroke="#22c55e" strokeWidth="2" />
          {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 10)) === 0 || i === points.length - 1).map((p, i) => (
            <circle key={i} cx={pad + i * xStep * Math.max(1, Math.floor(points.length / 10))}
              cy={H - pad - ((p.winRate - minWR) / rangeWR) * (H - 2 * pad)} r="2" fill="#22c55e" />
          ))}
        </svg>
      </div>

      {/* Balance chart */}
      <div>
        <p className="text-xs text-gray-400 mb-1">余额变化 <span className="text-accent font-bold">{points[points.length - 1]?.balance?.toFixed(0) ?? 0} 币</span></p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-gray-800/50 rounded">
          <polyline points={balLine} fill="none" stroke="#ffd700" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
