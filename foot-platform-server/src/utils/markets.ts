/**
 * Multi-market odds calculators.
 * Supports: full_time, first_half, second_half, correct_score, penalty, corners
 */
import { expectedScore, effectiveEloDiff } from './elo';
import { calculateDrawProb } from './odds';
import { simulateScoreDistribution } from './simulate';

const MIN_ODDS = 1.05;
const MARGIN = 0.05;

// ---- Full Time (existing) ----

export function calcFullTime(homeElo: number, awayElo: number) {
  const { calculateOdds } = require('./odds');
  return calculateOdds(homeElo, awayElo);
}

// ---- First/Second Half ----
// Shorter game = more randomness = draw probability increases, favorites less dominant
function calcHalfOdds(homeElo: number, awayElo: number) {
  const diff = effectiveEloDiff(homeElo, awayElo, 50); // Reduced home advantage

  const expectedHome = expectedScore(homeElo + 50, awayElo);
  const expectedAway = 1 - expectedHome;

  // Higher max draw (shorter game = more possible draws)
  const pDraw = Math.min(0.35, calculateDrawProb(diff) * 1.5);
  const sumWin = expectedHome + expectedAway;

  const pHome = expectedHome * (1 - pDraw) / sumWin;
  const pAway = expectedAway * (1 - pDraw) / sumWin;

  return {
    homeWinOdds: Math.max(MIN_ODDS, Math.round((1 / pHome) * (1 - MARGIN) * 100) / 100),
    drawOdds: Math.max(MIN_ODDS, Math.round((1 / pDraw) * (1 - MARGIN) * 100) / 100),
    awayWinOdds: Math.max(MIN_ODDS, Math.round((1 / pAway) * (1 - MARGIN) * 100) / 100),
  };
}

export const calcFirstHalf = calcHalfOdds;
export const calcSecondHalf = calcHalfOdds;

// ---- Correct Score ----

interface ScoreOdds {
  score: string;
  odds: number;
}

export function calcCorrectScore(homeElo: number, awayElo: number): ScoreOdds[] {
  const dist = simulateScoreDistribution(homeElo, awayElo);
  const result: ScoreOdds[] = [];

  for (const [score, prob] of dist.entries()) {
    const p = prob / 100; // Convert percentage to probability
    if (p < 0.002) continue; // Skip extremely unlikely scores (< 0.2%)
    const odds = Math.max(MIN_ODDS, Math.round((1 / p) * (1 - MARGIN) * 100) / 100);
    if (odds <= 200) { // Cap at 200
      result.push({ score, odds });
    }
  }

  result.sort((a, b) => a.odds - b.odds);
  return result.slice(0, 20); // Top 20 most likely scores
}

// ---- Penalty (Yes/No) ----

export function calcPenalty(homeElo: number, awayElo: number) {
  // Base penalty probability ~15% per match, higher for closer matches
  const eloDiff = Math.abs(homeElo - awayElo);
  const baseProb = 0.15;
  const closenessBonus = Math.max(0, (200 - eloDiff) / 2000); // Closer = more pens
  const pPenalty = Math.min(0.25, baseProb + closenessBonus);

  return {
    yesOdds: Math.max(MIN_ODDS, Math.round((1 / pPenalty) * (1 - MARGIN) * 100) / 100),
    noOdds: Math.max(MIN_ODDS, Math.round((1 / (1 - pPenalty)) * (1 - MARGIN) * 100) / 100),
  };
}

// ---- Corners Over/Under (9.5) ----

export function calcCorners(homeElo: number, awayElo: number) {
  // Stronger teams generate more corners. Line at 9.5.
  const avgElo = (homeElo + awayElo) / 2;
  const expectedCorners = 8 + (avgElo - 1500) / 100; // 8-12 corners
  const line = 9.5;

  // Poisson prob of over line
  const lambda = Math.max(2, expectedCorners);
  let pOver = 0;
  for (let k = 0; k <= line; k++) {
    pOver += Math.exp(-lambda + k * Math.log(lambda) - logFact(k));
  }
  pOver = Math.max(0.15, Math.min(0.85, 1 - pOver));

  return {
    overOdds: Math.max(MIN_ODDS, Math.round((1 / pOver) * (1 - MARGIN) * 100) / 100),
    underOdds: Math.max(MIN_ODDS, Math.round((1 / (1 - pOver)) * (1 - MARGIN) * 100) / 100),
    line,
  };
}

function logFact(n: number): number {
  let r = 0;
  for (let i = 2; i <= n; i++) r += Math.log(i);
  return r;
}
