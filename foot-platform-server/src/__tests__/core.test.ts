/**
 * Unit tests for core business logic.
 * Run with: npx tsx src/__tests__/core.test.ts
 */

import { expectedScore, updateElo, resultToScores } from '../utils/elo';
import { calculateOdds, calculateDrawProb, calculateOverround } from '../utils/odds';
import { simulateScore, simulateScoreDistribution } from '../utils/simulate';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

function assertClose(actual: number, expected: number, tolerance: number, name: string) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✅ ${name} (${actual} ≈ ${expected})`);
    passed++;
  } else {
    console.error(`  ❌ ${name}: expected ${expected} ± ${tolerance}, got ${actual}`);
    failed++;
  }
}

// ==================== Elo Tests ====================
console.log('\n📊 Elo Rating Tests');

// Equal teams: 50% each
assertClose(expectedScore(1500, 1500), 0.5, 0.01, 'Equal teams have 50% win probability');
// 400 point difference: ~91% for stronger team
assertClose(expectedScore(1900, 1500), 0.909, 0.01, '400 Elo diff → 91% win prob');
// Home advantage check
assertClose(expectedScore(1600, 1500), 0.64, 0.02, '100 Elo diff → ~64% win prob');

// Elo update: winner gains, loser loses
const [newA, newB] = updateElo(1500, 1500, 1, 0, 32);
assert(newA > 1500, `Winner Elo increases: 1500 → ${newA}`);
assert(newB < 1500, `Loser Elo decreases: 1500 → ${newB}`);
assertClose(newA + newB, 3000, 1, 'Total Elo points are conserved');

// Draw: ratings barely change for equal teams
const [drawA, drawB] = updateElo(1500, 1500, 0.5, 0.5, 32);
assertClose(drawA, 1500, 1, 'Draw between equals: no change');
assertClose(drawB, 1500, 1, 'Draw between equals: no change');

// Underdog winning: big swing
const [upsetA, upsetB] = updateElo(1900, 1500, 0, 1, 32);
assert(upsetB > 1500, `Underdog wins → Elo increases: 1500 → ${upsetB}`);
assert(upsetA < 1900, `Favorite loses → Elo decreases: 1900 → ${upsetA}`);

// resultToScores
const [s1, s2] = resultToScores(3, 1);
assert(s1 === 1 && s2 === 0, '3-1 → (1, 0) home win');
const [s3, s4] = resultToScores(1, 1);
assert(s3 === 0.5 && s4 === 0.5, '1-1 → (0.5, 0.5) draw');
const [s5, s6] = resultToScores(0, 2);
assert(s5 === 0 && s6 === 1, '0-2 → (0, 1) away win');

// ==================== Odds Tests ====================
console.log('\n📊 Odds Calculation Tests');

// Equal teams (with home advantage: home=1600, away=1500)
const equalOdds = calculateOdds(1500, 1500);
assertClose(equalOdds.homeWinOdds, 2.02, 0.1, 'Equal teams + home adv: home odds ≈ 2.02');
assert(equalOdds.awayWinOdds > 3.0, `Away underdog odds > 3.0 (got ${equalOdds.awayWinOdds})`);
assert(equalOdds.homeWinOdds < equalOdds.drawOdds, 'Draw odds > win odds for equal teams');

// Strong home favorite
const favOdds = calculateOdds(1950, 1400);
assert(favOdds.homeWinOdds < 2.0, `Strong favorite: home odds < 2.0 (got ${favOdds.homeWinOdds})`);
assert(favOdds.awayWinOdds > 4.0, `Strong favorite: away odds > 4.0 (got ${favOdds.awayWinOdds})`);

// Overround check (should be > 1.0 for house edge)
const overround = calculateOverround(equalOdds.homeWinOdds, equalOdds.drawOdds, equalOdds.awayWinOdds);
assert(overround > 1.0, `Overround > 1.0 (got ${overround.toFixed(4)})`);

// Draw probability symmetry
const draw1 = calculateDrawProb(0);
const draw2 = calculateDrawProb(400);
assert(draw1 > draw2, `Draw prob higher for equal teams (${draw1.toFixed(3)} vs ${draw2.toFixed(3)})`);

// ==================== Simulation Tests ====================
console.log('\n📊 Score Simulation Tests');

// Run many simulations to check distribution properties
const results: string[] = [];
const SIM_COUNT = 1000;
for (let i = 0; i < SIM_COUNT; i++) {
  const [h, a] = simulateScore(1800, 1500);
  results.push(`${h}-${a}`);
}

// Strong team should win more often
const homeWins = results.filter(r => {
  const [h, a] = r.split('-').map(Number);
  return h > a;
}).length;
assert(homeWins > SIM_COUNT * 0.4, `Home wins > 40% with 300 Elo advantage (${((homeWins / SIM_COUNT) * 100).toFixed(1)}%)`);

// Score should rarely exceed 15 goals total
const maxGoals = Math.max(...results.map(r => {
  const [h, a] = r.split('-').map(Number);
  return h + a;
}));
assert(maxGoals <= 15, `Max total goals ≤ 15 (got ${maxGoals})`);

// Distribution function works
const dist = simulateScoreDistribution(1800, 1500);
assert(dist.size > 0, 'Score distribution has entries');
assert(dist.size > 10, `Score distribution has > 10 entries (got ${dist.size})`);

// ==================== Summary ====================
console.log(`\n📋 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('🎉 All tests passed!\n');
} else {
  console.error(`❌ ${failed} test(s) failed\n`);
  process.exit(1);
}
