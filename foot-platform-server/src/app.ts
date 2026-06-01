import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';

// ---- Route imports ----
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import matchRoutes from './routes/match.routes';
import oddsRoutes from './routes/odds.routes';
import betRoutes from './routes/bet.routes';
import walletRoutes from './routes/wallet.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import adminRoutes from './routes/admin.routes';
import standingsRoutes from './routes/standings.routes';
import notificationRoutes from './routes/notification.routes';
import forumRoutes from './routes/forum.routes';
import newsRoutes from './routes/news.routes';
import parlayRoutes from './routes/parlay.routes';

const app = express();

// ---- Global Middleware ----
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5002', 'http://localhost:5003',
    'http://122.51.253.83:5002', 'http://122.51.253.83:5003',
    'http://122.51.253.83',
  ],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Health Check ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/odds', oddsRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/standings', standingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/parlay', parlayRoutes);

// Public config (bet limits, etc.)
app.get('/api/config/public', (_req, res) => {
  const { getDb } = require('./db/connection');
  const db = getDb();
  const configs = db.prepare("SELECT key, value FROM system_config WHERE key IN ('min_bet_amount', 'max_bet_amount', 'initial_balance')").all() as Array<{ key: string; value: string }>;
  const result: Record<string, string | number> = {};
  for (const c of configs) {
    result[c.key] = isNaN(Number(c.value)) ? c.value : Number(c.value);
  }
  res.json(result);
});

// ---- 404 Handler ----
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// ---- Error Handler (must be last) ----
app.use(errorHandler);

export default app;
