import { create } from 'zustand';
import client from '../api/client';

interface AdminState {
  token: string | null;
  username: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => void;
}

export const useAdminAuthStore = create<AdminState>((set, get) => ({
  token: localStorage.getItem('admin_token'),
  username: localStorage.getItem('admin_username') || '',
  loading: true,

  login: async (email, password) => {
    const res = await client.post('/auth/admin/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_username', user.username);
    set({ token, username: user.username });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    set({ token: null, username: '' });
  },

  init: () => {
    set({ loading: false });
  },
}));
