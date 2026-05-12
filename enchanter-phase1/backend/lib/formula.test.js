/**
 * lib/formula.test.js
 * Unit tests for the power score formula.
 * Run: node lib/formula.test.js
 *
 * Tests known boundary conditions and spec examples.
 */

const { calculatePower, seasonBonus, axisCoeff } = require('./formula');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function assertClose(label, value, expected, tolerance = 0.01) {
  const ok = Math.abs(value - expected) <= tolerance;
  assert(label, ok, `got ${value}, expected ${expected} ±${tolerance}`);
}

// ── axisCoeff ─────────────────────────────────────────────────────────────────
console.log('\naxisCoeff:');
assertClose('coeff at 0.0 normalised = 1.0', axisCoeff(0.0), 1.0);
assertClose('coeff at 0.5 normalised = 1.5', axisCoeff(0.5), 1.5);
assertClose('coeff at 1.0 normalised = 2.0', axisCoeff(1.0), 2.0);

// ── seasonBonus ───────────────────────────────────────────────────────────────
console.log('\nseasonBonus:');
assertClose('same season = 2.0', seasonBonus('summer', 'summer'), 2.0);
assertClose('adjacent season = 1.0', seasonBonus('spring', 'summer'), 1.0);
assertClose('opposite season = 0.0', seasonBonus('winter', 'summer'), 0.0);
assertClose('circular wrap: winter adjacent to spring = 1.0', seasonBonus('winter', 'spring'), 1.0);
assertClose('circular wrap: spring adjacent to winter = 1.0', seasonBonus('spring', 'winter'), 1.0);

// ── calculatePower — minimum case ─────────────────────────────────────────────
console.log('\ncalculatePower — minimum (all worst conditions):');
const minSite = {
  site_type: 'coastal',
  affinity_lunar: 'light',   // light site, new moon = worst
  affinity_geo: 'high_pressure', // high pressure site, stormy = worst
  affinity_tod: 'light',     // light site, midnight = worst
  affinity_season: 'summer', // summer site, winter = opposite
};
const minConditions = {
  lunar_phase: 0.0,   // new moon — worst for light site
  geo_value: 960,     // stormy — worst for high_pressure site
  tod_slot: 'midnight', // worst for light site
  season: 'winter',   // opposite of summer
};
const minResult = calculatePower(minSite, minConditions);
console.log('  Score:', minResult.power_score, '(expected ~1.0)');
assertClose('minimum score ≥ 1.0', minResult.power_score, 1.0, 0.5);
assert('minimum cost = 1', minResult.cost === 1);
assert('minimum tier = instant/self', minResult.duration_tier === 'instant' && minResult.range_tier === 'self');

// ── calculatePower — maximum case ─────────────────────────────────────────────
console.log('\ncalculatePower — maximum (all peak conditions):');
const maxSite = {
  site_type: 'coastal',
  affinity_lunar: 'light',
  affinity_geo: 'high_pressure',
  affinity_tod: 'light',
  affinity_season: 'summer',
};
const maxConditions = {
  lunar_phase: 1.0,   // full moon — peak for light site
  geo_value: 1030,    // serene — peak for high_pressure site
  tod_slot: 'noon',   // peak for light site
  season: 'summer',   // matches site
};
const maxResult = calculatePower(maxSite, maxConditions);
console.log('  Score:', maxResult.power_score, '(expected 10.0)');
assertClose('maximum score = 10.0', maxResult.power_score, 10.0, 0.1);
assert('maximum duration = permanent', maxResult.duration_tier === 'permanent');
assert('maximum range = far', maxResult.range_tier === 'far');
assert('maximum concentration = true', maxResult.concentration === true);

// ── calculatePower — dark site ─────────────────────────────────────────────
console.log('\ncalculatePower — dark landlocked site at peak:');
const darkSite = {
  site_type: 'landlocked',
  affinity_lunar: 'dark',
  affinity_geo: 'calm_solar',
  affinity_tod: 'dark',
  affinity_season: 'winter',
};
const darkPeak = {
  lunar_phase: 0.0,   // new moon — peak for dark
  geo_value: 0,       // Kp=0 — peak for calm_solar
  tod_slot: 'midnight', // peak for dark
  season: 'winter',   // matches
};
const darkResult = calculatePower(darkSite, darkPeak);
console.log('  Score:', darkResult.power_score, '(expected 10.0)');
assertClose('dark site peak = 10.0', darkResult.power_score, 10.0, 0.1);

// ── Mid-range case ────────────────────────────────────────────────────────────
console.log('\ncalculatePower — mid-range (quarter moon, neutral pressure, morning, autumn for summer site):');
const midSite = {
  site_type: 'coastal',
  affinity_lunar: 'light',
  affinity_geo: 'low_pressure',
  affinity_tod: 'light',
  affinity_season: 'summer',
};
const midConditions = {
  lunar_phase: 0.5,
  geo_value: 1000,    // unsettled — good for low_pressure
  tod_slot: 'morning',
  season: 'autumn',   // adjacent to summer
};
const midResult = calculatePower(midSite, midConditions);
console.log('  Score:', midResult.power_score);
assert('mid-range between 1 and 10', midResult.power_score >= 1 && midResult.power_score <= 10);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
