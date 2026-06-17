import http from 'http';
import app from './app';
import { config } from './config';
import { initDb, getDb, closeDb } from './db/connection';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import { initWebSocket } from './ws/index';

let server: http.Server | null = null;
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

async function main() {
  await initDb();
  migrate();
  seed();

  server = http.createServer(app);

  // Initialize WebSocket on the same HTTP server
  initWebSocket(server);

  server.listen(config.port, () => {
    console.log(`\n⚽ Foot Platform Server`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   HTTP:       http://localhost:${config.port}`);
    console.log(`   API:        http://localhost:${config.port}/api`);
    console.log(`   WebSocket:  ws://localhost:${config.port}/ws\n`);

    // ============================================================
    // Auto-save: 每30秒自动持久化数据库到磁盘
    // 防止 PM2 kill/服务器重启导致数据丢失
    // ============================================================
    autoSaveTimer = setInterval(() => {
      try {
        getDb().save();
      } catch (_) { /* 静默忽略 */ }
    }, 30000);
    console.log('[DB] Auto-save enabled (every 30s)\n');
  });
}

async function shutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);

  // 停止定时器
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }

  if (server) {
    server.close(() => console.log('[Shutdown] HTTP server closed'));
  }

  // 最终保存
  try {
    const db = getDb();
    db.save();
    console.log('[Shutdown] Database saved to disk');
  } catch (_) {}

  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 未捕获异常也保存数据库
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
  try { getDb().save(); } catch (_) {}
  closeDb();
  process.exit(1);
});

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
