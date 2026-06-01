import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useEffect, useState, useRef } from 'react';
import client from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';

export default function Header() {
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const { wallet, fetchWallet } = useWalletStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { notification, unreadCount, clearNotification, resetUnread } = useWebSocket(token);
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    }
  }, [isAuthenticated, fetchWallet]);

  // Show toast when new notification arrives
  useEffect(() => {
    if (notification) {
      setShowToast(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        setShowToast(false);
        clearNotification();
      }, 5000);
    }
  }, [notification, clearNotification]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-primary-dark/95 backdrop-blur-sm border-b border-primary/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-white hover:text-accent transition-colors">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-lg hidden sm:block">2026世界杯</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">{t('nav.dashboard')}</Link>
          <Link to="/standings" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">{t('nav.standings')}</Link>
          <Link to="/bracket" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">{t('nav.bracket')}</Link>
          <Link to="/results" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">{t('nav.results')}</Link>
          <Link to="/leaderboard" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">{t('nav.leaderboard')}</Link>
          <Link to="/news" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">📰 {lang === 'zh' ? '新闻' : 'News'}</Link>
          <Link to="/forum" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">💬 {lang === 'zh' ? '论坛' : 'Forum'}</Link>
          {isAuthenticated && (
            <Link to="/my-bets" className="text-gray-300 hover:text-accent transition-colors text-sm font-medium">{t('nav.myBets')}</Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {unreadCount > 0 && (
                <Link to="/my-bets" className="relative" title="新通知">
                  <span className="text-lg">🔔</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </Link>
              )}
              {wallet && (
                <Link to="/wallet" className="hidden sm:flex items-center gap-1 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-accent/20 transition-colors">
                  <span>💰</span>
                  <span>{wallet.balance.toFixed(0)} 币</span>
                </Link>
              )}
              <Link to="/profile" className="hidden sm:block text-gray-400 text-sm hover:text-accent transition-colors">{user?.username}</Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 text-sm transition-colors"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">{t('nav.login')}</Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 !text-sm">{t('nav.register')}</Link>
            </>
          )}

          {/* Lang toggle */}
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="text-gray-400 hover:text-accent transition-colors text-xs font-bold px-1"
            title="Switch language"
          >{lang === 'zh' ? 'EN' : '中'}</button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="text-gray-400 hover:text-accent transition-colors text-lg" title={theme === 'dark' ? '切换亮色' : '切换暗色'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-t border-gray-800 px-4 py-3 space-y-2">
          <Link to="/dashboard" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{t('nav.dashboard')}</Link>
          <Link to="/standings" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{t('nav.standings')}</Link>
          <Link to="/bracket" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{t('nav.bracket')}</Link>
          <Link to="/results" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{t('nav.results')}</Link>
          <Link to="/leaderboard" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{t('nav.leaderboard')}</Link>
          <Link to="/forum" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>💬 {lang === 'zh' ? '论坛' : 'Forum'}</Link>
          {isAuthenticated && (
            <>
              <Link to="/my-bets" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{t('nav.myBets')}</Link>
              <Link to="/wallet" className="block text-gray-300 hover:text-accent py-2" onClick={() => setMobileMenuOpen(false)}>{'💰 ' + t('nav.wallet')}</Link>
            </>
          )}
        </div>
      )}

      {showToast && notification && (
        <div className={`${notification.type === 'bet_won' ? 'bg-green-600' : 'bg-red-600'} text-white px-4 py-2 text-sm font-medium text-center`}>
          {notification.title} {notification.message} — {notification.detail}
        </div>
      )}
    </header>
  );
}
