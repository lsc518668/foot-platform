import { useEffect, useRef, useState, useCallback } from 'react';

interface WsNotification {
  type: string;
  title: string;
  message: string;
  detail: string;
  payout?: number;
}

export function useWebSocket(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [notification, setNotification] = useState<WsNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const url = `${protocol}//${host}:5001/ws?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => console.log('[WS] Connected');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            setNotification(data);
            setUnreadCount(prev => prev + 1);
          }
        } catch {}
      };
      ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting in 5s...');
        setTimeout(connect, 5000);
      };
      ws.onerror = () => ws.close();
    } catch (err) {
      console.error('[WS] Connection failed:', err);
    }
  }, [token]);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  const clearNotification = useCallback(() => setNotification(null), []);
  const resetUnread = useCallback(() => setUnreadCount(0), []);

  return { notification, unreadCount, clearNotification, resetUnread };
}
