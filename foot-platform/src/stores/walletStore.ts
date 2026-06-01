import { create } from 'zustand';
import client from '../api/client';
import { WalletInfo, Transaction } from '../types';

interface WalletState {
  wallet: WalletInfo | null;
  transactions: Transaction[];
  transactionsTotal: number;
  loading: boolean;

  fetchWallet: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  transactions: [],
  transactionsTotal: 0,
  loading: false,

  fetchWallet: async () => {
    try {
      const res = await client.get('/wallet');
      set({ wallet: res.data.wallet });
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  },

  fetchTransactions: async (page = 1) => {
    set({ loading: true });
    try {
      const res = await client.get('/wallet/transactions', { params: { page, limit: 20 } });
      set({
        transactions: res.data.transactions,
        transactionsTotal: res.data.total,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      set({ loading: false });
    }
  },
}));
