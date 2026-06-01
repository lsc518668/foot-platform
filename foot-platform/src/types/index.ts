// Mirror backend types for frontend use

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  balance: number;
  is_frozen: number;
  total_won: number;
  total_bet_count: number;
  won_bet_count: number;
  created_at: string;
  updated_at: string;
}

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

export interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  venue: string;
  stage: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  homeTeam: Team;
  awayTeam: Team;
  odds?: Odds;
}

export type BetType = 'home_win' | 'draw' | 'away_win';

export interface Bet {
  id: number;
  user_id: number;
  match_id: number;
  market_type: string;
  bet_type: string;
  amount: number;
  odds_at_bet: number;
  potential_payout: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
  settled_at: string | null;
  created_at: string;
  match: Match;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: number | null;
  description: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  totalWon: number;
  totalBetCount: number;
  wonBetCount: number;
  winRate: number;
}

export interface WalletInfo {
  balance: number;
  totalWon: number;
  totalBetCount: number;
  wonBetCount: number;
  winRate: number;
}

export const BET_TYPE_LABELS: Record<string, string> = {
  home_win: '主胜',
  draw: '平局',
  away_win: '客胜',
};

export const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: '未开始',
  live: '进行中',
  finished: '已结束',
  cancelled: '已取消',
};

export const STAGE_LABELS: Record<string, string> = {
  group: '小组赛',
  round_of_32: '32强赛',
  round_of_16: '16强赛',
  quarter_final: '1/4决赛',
  semi_final: '半决赛',
  third_place: '三四名决赛',
  final: '决赛',
};
