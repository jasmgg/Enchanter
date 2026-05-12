/**
 * lib/timeOfDay.js
 * Maps current UTC time to tod_slot and season.
 * Uses suncalc for precise sunrise/sunset times at a given location.
 * Falls back to clock-based slots if no location provided.
 */
const SunCalc = require('suncalc');

/**
 * Get time-of-day slot.
 * If lat/lng provided, uses actual sunrise/sunset for the location.
 * Spec slots: midnight / dawn / morning / noon / afternoon / dusk
 */
function getTodSlot(date = new Date(), lat = null, lng = null) {
  const hour = date.getUTCHours();

  if (lat !== null && lng !== null) {
    const times = SunCalc.getTimes(date, lat, lng);
    const sunrise = times.sunrise.getUTCHours() + times.sunrise.getUTCMinutes() / 60;
    const sunset = times.sunset.getUTCHours() + times.sunset.getUTCMinutes() / 60;
    const solarNoon = times.solarNoon.getUTCHours() + times.solarNoon.getUTCMinutes() / 60;
    const h = hour + date.getUTCMinutes() / 60;

    if (h < sunrise - 1 || h > sunset + 2) return 'midnight';
    if (h < sunrise + 1)  return 'dawn';
    if (h < solarNoon - 1) return 'morning';
    if (h < solarNoon + 1) return 'noon';
    if (h < sunset - 1)   return 'afternoon';
    return 'dusk';
  }

  // Fallback: clock-based approximation (UTC)
  if (hour >= 0  && hour < 5)  return 'midnight';
  if (hour >= 5  && hour < 8)  return 'dawn';
  if (hour >= 8  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 19) return 'afternoon';
  return 'dusk';
}

/**
 * Light vs dark classification for tod_slot.
 * light: dawn, morning, noon, afternoon
 * dark: dusk, midnight
 */
function todAffinity(slot) {
  return ['dawn', 'morning', 'noon', 'afternoon'].includes(slot) ? 'light' : 'dark';
}

/**
 * Normalised position for formula coefficient.
 * light-affinity peaks at noon, dark-affinity peaks at midnight.
 */
const TOD_POSITIONS = {
  midnight: 0.0,
  dawn:     0.25,
  morning:  0.5,
  noon:     1.0,
  afternoon: 0.75,
  dusk:     0.1,
};

function todNormalisedPosition(slot, affinity) {
  const pos = TOD_POSITIONS[slot] ?? 0.5;
  return affinity === 'light' ? pos : 1 - pos;
}

/**
 * Get current season from date (Northern Hemisphere).
 * Spec: spring / summer / autumn / winter
 */
function getSeason(date = new Date()) {
  const month = date.getUTCMonth(); // 0-indexed
  if (month >= 2  && month <= 4) return 'spring';
  if (month >= 5  && month <= 7) return 'summer';
  if (month >= 8  && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Season index for circular distance calculation (spec 3.2)
 */
const SEASON_INDEX = { spring: 0, summer: 1, autumn: 2, winter: 3 };

function seasonIndex(season) {
  return SEASON_INDEX[season] ?? 0;
}

module.exports = { getTodSlot, todAffinity, todNormalisedPosition, getSeason, seasonIndex };
