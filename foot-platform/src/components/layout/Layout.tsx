import { Outlet } from 'react-router-dom';
import Header from './Header';
import { useAuthStore } from '../../stores/authStore';
import ParlaySlip from '../bet/ParlaySlip';

export default function Layout() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-900/50 border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>⚽ 2026世界杯模拟足彩 · 仅供娱乐，不涉及真实货币交易</p>
          <p className="mt-1 text-gray-600">Powered by Foot Platform © 2026</p>
        </div>
      </footer>
      {isAuthenticated && <ParlaySlip />}
    </div>
  );
}
