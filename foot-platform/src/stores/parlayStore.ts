import { create } from 'zustand';

export interface ParlayLeg {
  matchId: number;
  matchName: string;
  marketType: string;
  marketLabel: string;
  betType: string;
  betLabel: string;
  odds: number;
}

interface ParlayState {
  legs: ParlayLeg[];
  addLeg: (leg: ParlayLeg) => void;
  removeLeg: (index: number) => void;
  clearAll: () => void;
  totalOdds: number;
}

export const useParlayStore = create<ParlayState>((set, get) => ({
  legs: [],
  addLeg: (leg) => {
    const { legs } = get();
    // Prevent duplicate match in same market
    const exists = legs.find(l => l.matchId === leg.matchId && l.marketType === leg.marketType);
    if (exists) return; // Already added this match+market
    if (legs.length >= 8) return; // Max 8 legs
    set({ legs: [...legs, leg] });
  },
  removeLeg: (index) => {
    set({ legs: get().legs.filter((_, i) => i !== index) });
  },
  clearAll: () => set({ legs: [] }),
  get totalOdds() {
    return Math.round(get().legs.reduce((acc, l) => acc * l.odds, 1) * 100) / 100;
  },
}));
