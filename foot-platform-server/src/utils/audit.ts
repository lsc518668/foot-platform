import { getDb } from '../db/connection';

export function auditLog(adminId: number, action: string, target: string, targetId?: number, details?: string) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (admin_id, action, target, target_id, details) VALUES (?, ?, ?, ?, ?)'
    ).run(adminId, action, target, targetId || null, details || null);
  } catch (err) {
    console.error('[Audit] Failed to log:', err);
  }
}
