/**
 * lib/formula.js
 *
 * Spell power score formula — spec section 3.
 * Isolated module so weights can be adjusted without touching other systems.
 *
 * power_score = (lunar_coeff × geo_coeff × tod_coeff) + season_bonus
 * power_score = clamp(power_score, 1.0, 10.0)
 * cost        = round(power_score)
 *
 * Each coefficient is 1.0–2.0:
 *   light-affinity: coeff = 1.0 + (1.0 - normalised_position)  → wait, spec says:
 *   light: coeff = 1.0 + (1.0 - normalised_position) — but normalised_position
 *          for light affinity is already fraction (peaks at 1.0), so:
 *          coeff = 1.0 + normalised_position (peaks at 2.0 when position=1.0)
 *
 * Re-reading spec 3.1:
 *   Light-affinity: coeff = 1.0 + (1.0 - normalised_position)  -- wrong, gives min at peak
 *   Actually spec says "1.0 at worst, 2.0 at peak"
 *   For light: normalised_position = fraction (1.0 at full moon = peak)
 *              coeff = 1.0 + normalised_position → 2.0 at peak ✓
 *   For dark:  normalised_position = 1 - fraction (1.0 at new moon = peak)
 *              coeff = 1.0 + normalised_position → 2.0 at peak ✓
 *
 * The spec formula text appears to have a typo. The intent is clear: 1.0 at worst, 2.0 at peak.
 * We implement: coeff = 1.0 + normalisedPosition (where normalisedPosition is already
 * adjusted for affinity polarity by the individual modules).
 */

const { lunarNormalisedPosition } = require('./lunar');
const { pressureNormalisedPosition } = require('./pressure');
const { kpNormalisedPosition } = require('./kp');
const { todNormalisedPosition, seasonIndex } = require('./timeOfDay');

/**
 * Calculate coefficient for any axis.
 * normalisedPosition: 0.0–1.0 where 1.0 = peak for this site's affinity
 * Returns: 1.0–2.0
 */
function axisCoeff(normalisedPosition) {
  return 1.0 + Math.max(0, Math.min(1, normalisedPosition));
}

/**
 * Season bonus — circular distance from site's peak season.
 * Spec 3.2: dist = min(|input_idx - peak_idx|, 4 - |input_idx - peak_idx|)
 *           season_bonus = max(0, 2.0 - dist)
 * Returns: 0.0 (opposite), 1.0 (adjacent), 2.0 (peak)
 */
function seasonBonus(currentSeason, sitePeakSeason) {
  const inputIdx = seasonIndex(currentSeason);
  const peakIdx  = seasonIndex(sitePeakSeason);
  const abs = Math.abs(inputIdx - peakIdx);
  const dist = Math.min(abs, 4 - abs);
  return Math.max(0, 2.0 - dist);
}

/**
 * Main formula entry point.
 *
 * @param {Object} site         - Site record with affinity fields
 * @param {Object} conditions   - { lunar_phase, geo_value, tod_slot, season }
 * @returns {Object}            - Full power profile
 */
function calculatePower(site, conditions) {
  const { lunar_phase, geo_value, tod_slot, season } = conditions;

  // ── Lunar coefficient ──────────────────────────────────────────────────────
  const lunarPos   = lunarNormalisedPosition(lunar_phase, site.affinity_lunar);
  const lunarCoeff = axisCoeff(lunarPos);

  // ── Geo coefficient ────────────────────────────────────────────────────────
  let geoPos;
  const affGeo = site.affinity_geo;

  if (site.site_type === 'coastal') {
    // pressure-based: high_pressure or low_pressure
    const hPa = geo_value ?? 1013; // default to neutral if unavailable
    geoPos = pressureNormalisedPosition(hPa, affGeo);
  } else {
    // landlocked: calm_solar or charged_solar
    const kp = geo_value ?? 3; // default to mid-range if unavailable
    geoPos = kpNormalisedPosition(kp, affGeo);
  }
  const geoCoeff = axisCoeff(geoPos);

  // ── Time-of-day coefficient ────────────────────────────────────────────────
  const todPos   = todNormalisedPosition(tod_slot, site.affinity_tod);
  const todCoeff = axisCoeff(todPos);

  // ── Season bonus ───────────────────────────────────────────────────────────
  const bonus = seasonBonus(season, site.affinity_season);

  // ── Final score ────────────────────────────────────────────────────────────
  const raw   = (lunarCoeff * geoCoeff * todCoeff) + bonus;
  const score = parseFloat(Math.max(1.0, Math.min(10.0, raw)).toFixed(2));
  const cost  = Math.round(score);

  // ── Output tiers (spec 3.4) ────────────────────────────────────────────────
  const tiers = scoreTiers(score);

  return {
    power_score:    score,
    cost,
    lunar_coeff:    parseFloat(lunarCoeff.toFixed(3)),
    geo_coeff:      parseFloat(geoCoeff.toFixed(3)),
    tod_coeff:      parseFloat(todCoeff.toFixed(3)),
    season_bonus:   parseFloat(bonus.toFixed(3)),
    ...tiers,
  };
}

/**
 * Map power score to duration, range, and concentration tiers.
 * Spec 3.4.
 *
 * Exported so transfer degradation can re-derive tiers from a degraded score.
 */
function scoreTiers(score) {
  if (score <= 2.0) {
    return { duration_tier: 'instant', range_tier: 'self',  concentration: false };
  }
  if (score <= 4.0) {
    return { duration_tier: 'short',   range_tier: 'touch', concentration: false };
  }
  if (score <= 6.0) {
    return { duration_tier: 'long',    range_tier: 'near',  concentration: false };
  }
  if (score <= 8.0) {
    return { duration_tier: 'long',    range_tier: 'far',   concentration: true  };
  }
  return   { duration_tier: 'permanent', range_tier: 'far', concentration: true  };
}

module.exports = { calculatePower, seasonBonus, axisCoeff, scoreTiers };
