import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  jwtSecret: process.env.JWT_SECRET || 'foot-platform-world-cup-2026-secret-key-change-in-production',
  jwtExpiresIn: '7d',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'football.db'),
  bcryptRounds: 10,
  defaultBalance: 1000,
  minBetAmount: 1,
  maxBetAmount: 5000,
  oddsMargin: 0.05,
  eloKFactor: 32,
  eloHomeAdvantage: 100,
};
