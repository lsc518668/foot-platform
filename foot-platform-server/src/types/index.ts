// ============================================================
// TypeScript Interfaces for the entire application
// ============================================================

// ---- User ----
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  balance: number;
  is_frozen: number; // SQLite stores boolean as 0/1
  total_won: number;
  total_bet_count: number;
  won_bet_count: number;
  created_at: string;
  updated_at: string;
}

export type UserPublic = Omit<User, 'password_hash'>;

// ---- Team ----
export interface Team {
  id: number;
  name_zh: string;
  name_en: string;
  short_code: string;
  flag_emoji: string;
  elo_rating: number;
  group_name: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Match ----
export type MatchStage =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  venue: string;
  stage: MatchStage;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface MatchWithTeams extends Match {
  homeTeam: Team;
  awayTeam: Team;
  odds?: Odds;
}

// ---- Odds ----
export type MarketType = 'full_time' | 'first_half' | 'second_half' | 'correct_score' | 'penalty' | 'corners';

export interface Odds {
  id: number;
  match_id: number;
  market_type: MarketType;
  home_win_odds: number | null;
  draw_odds: number | null;
  away_win_odds: number | null;
  odds_data: string | null;
  is_manual_override: number;
  calculated_at: string;
}

export const MARKET_LABELS: Record<string, string> = {
  full_time: '全场胜负', first_half: '上半场', second_half: '下半场',
  correct_score: '正确比分', penalty: '点球', corners: '角球(9.5)',
};

// ---- Bet ----
export type BetType = 'home_win' | 'draw' | 'away_win';
export type BetStatus = 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';

export interface Bet {
  id: number;
  user_id: number;
  match_id: number;
  market_type: string;
  bet_type: string;
  amount: number;
  odds_at_bet: number;
  potential_payout: number;
  status: BetStatus;
  settled_at: string | null;
  created_at: string;
}

export interface BetWithMatch extends Bet {
  match: MatchWithTeams;
}

// ---- Transaction ----
export type TransactionType = 'deposit' | 'bet_placed' | 'bet_won' | 'bet_refunded' | 'admin_adjust';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: number | null;
  description: string;
  created_at: string;
}

// ---- System Config ----
export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

// ---- Leaderboard ----
export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  totalWon: number;
  totalBetCount: number;
  wonBetCount: number;
  winRate: number;
}

// ---- API Response ----
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalBets: number;
  totalBetsToday: number;
  totalRevenue: number;
  totalPaidOut: number;
  pendingSettlements: number;
  activeUsers: number;
}

// ---- JWT Payload ----
export interface JwtPayload {
  id: number;
  role: 'user' | 'admin';
}

// ---- Express Request Extension ----
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
