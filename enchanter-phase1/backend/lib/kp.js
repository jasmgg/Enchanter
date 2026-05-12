/**
 * lib/kp.js
 * Fetches current planetary K-index (Kp) from NOAA SWPC for landlocked sites.
 * Free API, no key required.
 */

const NOAA_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';

/**
 * Fetch the most recent Kp value.
 * Returns { geo_value, geo_slot } or { geo_value: null, geo_slot: 'quiet' } on failure.
 */
async function getKpIndex() {
  try {
    const res = await fetch(NOAA_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`NOAA responded ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty Kp response');

    // Most recent entry is last in the array
    const latest = data[data.length - 1];
    const kp = parseFloat(latest.kp_index ?? latest.Kp ?? latest[1]);

    if (isNaN(kp)) throw new Error('Could not parse Kp value');

    return {
      geo_value: parseFloat(kp.toFixed(2)),
      geo_slot: kpToSlot(kp),
    };
  } catch (err) {
    console.warn('Kp fetch failed:', err.message);
    return { geo_value: null, geo_slot: 'quiet' };
  }
}

/**
 * Map Kp value to named slot.
 * Spec: quiet 0–1 | unsettled 2–3 | active 4–5 | storm 6–7 | severe 8–9
 */
function kpToSlot(kp) {
  if (kp <= 1) return 'quiet';
  if (kp <= 3) return 'unsettled';
  if (kp <= 5) return 'active';
  if (kp <= 7) return 'storm';
  return 'severe';
}

/**
 * Normalised position for formula coefficient calculation.
 * calm_solar affinity peaks at quiet (Kp=0) → 1.0 when Kp=0
 * charged_solar affinity peaks at severe (Kp=9) → 1.0 when Kp=9
 */
function kpNormalisedPosition(kp, affinity) {
  const normalised = Math.max(0, Math.min(9, kp)) / 9; // 0=quiet, 1=severe
  return affinity === 'charged_solar' ? normalised : 1 - normalised;
}

module.exports = { getKpIndex, kpToSlot, kpNormalisedPosition };
