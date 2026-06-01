import { Router } from 'express';
import { z } from 'zod';
import * as adminController from '../controllers/admin.controller';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';

const router = Router();

// All admin routes require auth + admin role
router.use(auth, adminAuth);

// ---- Teams ----
router.get('/teams', adminController.getTeams);
router.post('/teams', adminController.createTeam);
router.put('/teams/:id', adminController.updateTeam);
router.delete('/teams/:id', adminController.deleteTeam);

// ---- Matches ----
router.get('/matches', adminController.getMatches);
router.post('/matches', adminController.createMatch);
router.put('/matches/:id', adminController.updateMatch);
router.delete('/matches/:id', adminController.deleteMatch);
router.put('/matches/:id/status', adminController.updateMatchStatus);

// ---- Odds ----
router.get('/odds', adminController.getOdds);
router.put('/odds/:matchId', adminController.manualOverride);
router.delete('/odds/:matchId/override', adminController.removeOverride);

// ---- Settlement ----
router.post('/settle/:matchId', adminController.settleMatch);

// ---- Users ----
router.get('/users', adminController.getUsers);
router.put('/users/:id/freeze', adminController.toggleFreeze);
router.put('/users/:id/balance', adminController.adjustBalance);

// ---- Bets ----
router.get('/bets', adminController.getBets);

// ---- Config ----
router.get('/config', adminController.getConfig);
router.put('/config', adminController.updateConfig);

// ---- Dashboard ----
router.get('/dashboard', adminController.getDashboard);

// ---- Schedule Generation ----
router.post('/generate-schedule', adminController.generateSchedule);
router.post('/generate-knockout', adminController.generateKnockout);

// ---- Export ----
router.get('/export/bets', adminController.exportBets);

// ---- Audit Logs ----
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
