import { getDb } from '../db/connection';
import { Bet, BetType } from '../types';
import { AppError } from '../utils/errors';
import { resultToScores, updateElo } from '../utils/elo';
import * as matchService from './match.service';
import * as teamService from './team.service';
import * as oddsService from './odds.service';
import { notifyUser } from '../ws/index';

interface SettlementResult {
  matchId: number;
  result: BetType;
  homeScore: number;
  awayScore: number;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  totalPaidOut: number;
}

/**
 * Settle a match: determine winner, process all pending bets, update Elo, credit winners.
 * Everything runs in a single transaction.
 */
export function settleMatch(matchId: number, homeScore: number, awayScore: number): SettlementResult {
  const db = getDb();

  const result = db.transaction(() => {
    // 1. Verify match exists and is finished
    const match = matchService.getById(matchId);
    if (match.status !== 'finished') {
      matchService.updateStatus(matchId, 'finished', homeScore, awayScore);
    }

    // 2. Determine result
    let betResult: BetType;
    if (homeScore > awayScore) {
      betResult = 'home_win';
    } else if (homeScore < awayScore) {
      betResult = 'away_win';
    } else {
      betResult = 'draw';
    }

    // 3. Query all pending bets for this match
    const pendingBets = db.prepare(
      "SELECT * FROM bets WHERE match_id = ? AND status = 'pending'"
    ).all(matchId) as Bet[];

    if (pendingBets.length === 0) {
      throw new AppError('该比赛没有待结算的投注');
    }

    let wonBets = 0;
    let lostBets = 0;
    let totalPaidOut = 0;

    // 4. Process each bet (inline, within transaction)
    for (const bet of pendingBets) {
      if (bet.bet_type === betResult) {
        // Winner!
        const payout = bet.potential_payout;
        const winner = db.prepare('SELECT balance FROM users WHERE id = ?').get(bet.user_id) as { balance: number };
        const newBalance = Math.round((winner.balance + payout) * 100) / 100;

        db.prepare("UPDATE users SET balance = ?, total_won = total_won + ?, total_bet_count = total_bet_count + 1, won_bet_count = won_bet_count + 1, updated_at = datetime('now') WHERE id = ?")
          .run(newBalance, payout, bet.user_id);

        db.prepare('INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(bet.user_id, 'bet_won', payout, winner.balance, newBalance, bet.id, `投注获胜: 赔付 ${payout.toFixed(2)} 币`);

        db.prepare("UPDATE bets SET status = 'won', settled_at = datetime('now') WHERE id = ?").run(bet.id);

        // WebSocket notification
        try {
          const homeName = match.homeTeam?.name_zh || '';
          const awayName = match.awayTeam?.name_zh || '';
          notifyUser(bet.user_id, {
            type: 'bet_won',
            title: '🎉 投注获胜！',
            message: `${homeName} ${homeScore}-${awayScore} ${awayName}`,
            detail: `+${payout.toFixed(2)} 币`,
            payout,
          });
        } catch (_) { /* WebSocket may not be connected */ }

        totalPaidOut += payout;
        wonBets++;
      } else {
        // Lost
        db.prepare("UPDATE users SET total_bet_count = total_bet_count + 1, updated_at = datetime('now') WHERE id = ?")
          .run(bet.user_id);

        db.prepare("UPDATE bets SET status = 'lost', settled_at = datetime('now') WHERE id = ?").run(bet.id);

        try {
          const homeName = match.homeTeam?.name_zh || '';
          const awayName = match.awayTeam?.name_zh || '';
          notifyUser(bet.user_id, {
            type: 'bet_lost',
            title: '😞 投注失利',
            message: `${homeName} ${homeScore}-${awayScore} ${awayName}`,
            detail: `-${bet.amount.toFixed(2)} 币`,
          });
        } catch (_) {}

        lostBets++;
      }
    }

    // 5. Update Elo ratings
    const homeTeam = teamService.getById(match.home_team_id);
    const awayTeam = teamService.getById(match.away_team_id);

    const isKnockout = !['group'].includes(match.stage);
    const kFactor = isKnockout ? 40 : 32;

    const [scoreA, scoreB] = resultToScores(homeScore, awayScore);
    const [newHomeElo, newAwayElo] = updateElo(
      homeTeam.elo_rating,
      awayTeam.elo_rating,
      scoreA,
      scoreB,
      kFactor
    );

    teamService.updateElo(homeTeam.id, newHomeElo);
    teamService.updateElo(awayTeam.id, newAwayElo);

    // 6. Recalculate odds for future matches involving these teams
    oddsService.recalculateForTeam(homeTeam.id);
    oddsService.recalculateForTeam(awayTeam.id);

    console.log(`[Settlement] Match ${matchId} settled: ${betResult} | Won: ${wonBets} | Lost: ${lostBets} | Paid: ${totalPaidOut.toFixed(2)} | Elo: ${homeTeam.elo_rating}→${newHomeElo}, ${awayTeam.elo_rating}→${newAwayElo}`);

    return {
      matchId,
      result: betResult,
      homeScore,
      awayScore,
      totalBets: pendingBets.length,
      wonBets,
      lostBets,
      totalPaidOut: Math.round(totalPaidOut * 100) / 100,
    };
  })();

  return result;
}

export function hasPendingBets(matchId: number): boolean {
  const db = getDb();
  const count = db.prepare(
    "SELECT COUNT(*) as count FROM bets WHERE match_id = ? AND status = 'pending'"
  ).get(matchId) as { count: number };
  return count.count > 0;
}
