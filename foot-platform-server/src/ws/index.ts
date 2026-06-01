import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config';

let wss: WebSocketServer | null = null;
const clients = new Map<number, WebSocket>(); // userId → ws

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via token query parameter
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: number; role: string };
      clients.set(decoded.id, ws);
      console.log(`[WS] User ${decoded.id} connected (${clients.size} total)`);

      ws.on('close', () => {
        clients.delete(decoded.id);
        console.log(`[WS] User ${decoded.id} disconnected`);
      });

      ws.on('error', () => {
        clients.delete(decoded.id);
      });

      // Send welcome
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    } catch {
      ws.close(4001, 'Invalid token');
    }
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

/**
 * Send notification to a specific user.
 */
export function notifyUser(userId: number, notification: {
  type: string;
  title: string;
  message: string;
  detail: string;
  payout?: number;
}) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'notification', ...notification }));
  }
}

/**
 * Broadcast to all connected clients (admin announcements etc.)
 */
export function broadcastAll(data: object) {
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

export { wss };
