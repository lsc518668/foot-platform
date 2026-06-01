/**
 * Elo rating system utilities.
 * Pure functions with no side effects.
 */

/**
 * Calculate the expected score for team A against team B.
 * Returns a value between 0 and 1 representing team A's expected win probability.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Update Elo ratings after a match.
 *
 * @param ratingA - Team A's rating before the match
 * @param ratingB - Team B's rating before the match
 * @param scoreA - Actual score for team A (1 = win, 0.5 = draw, 0 = loss)
 * @param scoreB - Actual score for team B (1 = win, 0.5 = draw, 0 = loss)
 * @param kFactor - K-factor (default 32 for group stage, 40 for knockout)
 * @returns [newRatingA, newRatingB]
 */
export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  kFactor: number = 32
): [number, number] {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  const newA = Math.round(ratingA + kFactor * (scoreA - expectedA));
  const newB = Math.round(ratingB + kFactor * (scoreB - expectedB));

  return [newA, newB];
}

/**
 * Calculate the Elo difference after accounting for home advantage.
 */
export function effectiveEloDiff(homeElo: number, awayElo: number, homeAdvantage: number = 100): number {
  return (homeElo + homeAdvantage) - awayElo;
}

/**
 * Map match result to Elo scores.
 * homeWin  => [1, 0]
 * draw     => [0.5, 0.5]
 * awayWin  => [0, 1]
 */
export function resultToScores(homeScore: number, awayScore: number): [number, number] {
  if (homeScore > awayScore) return [1, 0];
  if (homeScore < awayScore) return [0, 1];
  return [0.5, 0.5];
}
