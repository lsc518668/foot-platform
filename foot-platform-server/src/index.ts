import http from 'http';
import app from './app';
import { config } from './config';
import { initDb, getDb, closeDb } from './db/connection';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import { initWebSocket } from './ws/index';

let server: http.Server | null = null;

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
  });
}

async function shutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(() => console.log('[Shutdown] HTTP server closed'));
  }
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
process.on('uncaughtException', (err) => {
  console.error('[Fatal] Uncaught exception:', err);
  shutdown('uncaughtException');
});

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
