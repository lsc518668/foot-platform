/**
 * Poisson-distribution based football score simulation.
 * Uses Elo ratings to estimate expected goals, then samples from Poisson distribution.
 */

const LEAGUE_AVG_GOALS = 2.75; // Average goals per match in international football
const AVG_ELO = 1700;          // Average Elo rating
const ELO_SCALE = 400;         // How much Elo difference affects goal expectation

/**
 * Poisson probability mass function.
 * P(X = k) = (lambda^k * e^(-lambda)) / k!
 */
function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * Sample from Poisson distribution using inverse CDF method.
 */
function poissonSample(lambda: number): number {
  // Clamp lambda to avoid extreme values
  const lam = Math.max(0.1, Math.min(8, lambda));
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 15);
  return k - 1;
}

/**
 * Estimate expected goals for a team based on Elo rating.
 * Higher Elo → more goals, lower Elo → fewer goals.
 *
 * lambda = LEAGUE_AVG_GOALS * exp((elo - AVG_ELO) / ELO_SCALE)
 *
 * Example: Elo 1950 → lambda ≈ 2.75 * exp(250/400) ≈ 5.1
 *          Elo 1350 → lambda ≈ 2.75 * exp(-350/400) ≈ 1.1
 */
function expectedGoals(elo: number): number {
  return LEAGUE_AVG_GOALS * Math.exp((elo - AVG_ELO) / ELO_SCALE);
}

/**
 * Simulate a match score using Poisson distribution.
 * Includes home advantage (home team gets a slight boost).
 *
 * @returns [homeGoals, awayGoals]
 */
export function simulateScore(homeElo: number, awayElo: number): [number, number] {
  const homeAdvantage = 0.15; // Home team gets ~15% more expected goals

  const homeLambda = expectedGoals(homeElo) * (1 + homeAdvantage);
  const awayLambda = expectedGoals(awayElo);

  const homeGoals = poissonSample(homeLambda);
  const awayGoals = poissonSample(awayLambda);

  return [homeGoals, awayGoals];
}

/**
 * Simulate a score with weighted probabilities for more realistic results.
 * Returns a map of {homeGoals}-{awayGoals} → probability (0-100).
 */
export function simulateScoreDistribution(homeElo: number, awayElo: number): Map<string, number> {
  const homeAdvantage = 0.15;
  const homeLambda = expectedGoals(homeElo) * (1 + homeAdvantage);
  const awayLambda = expectedGoals(awayElo);

  const dist = new Map<string, number>();

  // Sample up to 8 goals each, weighted by Poisson PMF
  for (let h = 0; h <= 8; h++) {
    const pH = poissonPmf(homeLambda, h);
    if (pH < 0.001) continue;
    for (let a = 0; a <= 8; a++) {
      const pA = poissonPmf(awayLambda, a);
      if (pA < 0.001) continue;
      dist.set(`${h}-${a}`, Math.round(pH * pA * 10000) / 100);
    }
  }

  return dist;
}
