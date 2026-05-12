/**
 * lib/lunar.js
 * Lunar phase calculation using suncalc.
 * No external API — all computed locally.
 */
const SunCalc = require('suncalc');

/**
 * Returns the current lunar phase fraction and slot.
 * fraction: 0.0 = new moon, 1.0 = full moon (actually peaks near 0.5 waxing
 * then back — suncalc's illumination fraction goes 0→1→0 across a lunation,
 * peaking at full moon ~1.0)
 */
function getLunarPhase(date = new Date()) {
  const { fraction, phase } = SunCalc.getMoonIllumination(date);

  return {
    lunar_phase: parseFloat(fraction.toFixed(4)),
    lunar_slot: fractionToSlot(fraction),
  };
}

/**
 * Map illumination fraction to named slot.
 * Spec: new 0.0–0.06 | crescent 0.07–0.28 | quarter 0.29–0.55
 *       gibbous 0.56–0.88 | full 0.89–1.0
 */
function fractionToSlot(fraction) {
  if (fraction <= 0.06) return 'new';
  if (fraction <= 0.28) return 'crescent';
  if (fraction <= 0.55) return 'quarter';
  if (fraction <= 0.88) return 'gibbous';
  return 'full';
}

/**
 * Normalised position for formula coefficient calculation.
 * Light-affinity peaks at full (fraction=1.0) → normalised = fraction
 * Dark-affinity peaks at new (fraction=0.0) → normalised = 1 - fraction
 * Returns a value 0.0–1.0 where 1.0 = peak for this affinity type.
 */
function lunarNormalisedPosition(fraction, affinity) {
  return affinity === 'light' ? fraction : 1 - fraction;
}

module.exports = { getLunarPhase, fractionToSlot, lunarNormalisedPosition };
