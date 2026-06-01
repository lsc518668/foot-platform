/**
 * Odds calculation using Elo ratings.
 * Pure functions with no side effects.
 */

import { expectedScore, effectiveEloDiff } from './elo';

const MAX_DRAW_PROB = 0.28;      // Maximum draw probability when teams are perfectly equal
const DRAW_DECAY_SIGMA = 300;    // Controls how fast draw probability decays with Elo gap
const DEFAULT_MARGIN = 0.05;     // 5% bookmaker margin (house edge)
const MIN_ODDS = 1.05;           // Minimum odds (never less than 1.05)
const HOME_ADVANTAGE = 100;      // Home advantage in Elo points

export interface OddsResult {
  homeWinOdds: number;
  drawOdds: number;
  awayWinOdds: number;
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

/**
 * Calculate the draw probability based on Elo difference.
 * Uses Gaussian decay: closer teams → higher draw probability.
 */
export function calculateDrawProb(eloDiff: number): number {
  return MAX_DRAW_PROB * Math.exp(-(eloDiff * eloDiff) / (2 * DRAW_DECAY_SIGMA * DRAW_DECAY_SIGMA));
}

/**
 * Calculate full odds for a match given team Elo ratings.
 *
 * @param homeElo - Home team's Elo rating
 * @param awayElo - Away team's Elo rating
 * @param margin - Bookmaker margin (default 0.05 = 5%)
 * @returns OddsResult with decimal odds and underlying probabilities
 */
export function calculateOdds(
  homeElo: number,
  awayElo: number,
  margin: number = DEFAULT_MARGIN
): OddsResult {
  const diff = effectiveEloDiff(homeElo, awayElo, HOME_ADVANTAGE);

  // Win probabilities from Elo
  const expectedHome = expectedScore(homeElo + HOME_ADVANTAGE, awayElo);
  const expectedAway = expectedScore(awayElo, homeElo + HOME_ADVANTAGE);

  // Draw probability (Gaussian decay based on Elo gap)
  const pDraw = calculateDrawProb(diff);

  // Normalize win probabilities around the draw probability
  const sumWin = expectedHome + expectedAway;
  const pHome = expectedHome * (1 - pDraw) / sumWin;
  const pAway = expectedAway * (1 - pDraw) / sumWin;

  // Convert to decimal odds with margin
  const homeWinOdds = Math.max(MIN_ODDS, Math.round((1 / pHome) * (1 - margin) * 100) / 100);
  const drawOdds = Math.max(MIN_ODDS, Math.round((1 / pDraw) * (1 - margin) * 100) / 100);
  const awayWinOdds = Math.max(MIN_ODDS, Math.round((1 / pAway) * (1 - margin) * 100) / 100);

  return {
    homeWinOdds,
    drawOdds,
    awayWinOdds,
    probabilities: {
      homeWin: Math.round(pHome * 10000) / 10000,
      draw: Math.round(pDraw * 10000) / 10000,
      awayWin: Math.round(pAway * 10000) / 10000,
    },
  };
}

/**
 * Validate that odds have a healthy overround (> 1.0).
 * Returns the overround value. Should be > 1.0 for a profitable bookmaker.
 */
export function calculateOverround(homeOdds: number, drawOdds: number, awayOdds: number): number {
  return 1 / homeOdds + 1 / drawOdds + 1 / awayOdds;
}
