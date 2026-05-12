/**
 * lib/pressure.js
 * Fetches current barometric pressure from Open-Meteo for coastal sites.
 * Free API, no key required.
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch current mean sea level pressure (hPa) at a given location.
 * Returns { geo_value, geo_slot } or { geo_value: null, geo_slot: 'neutral' } on failure.
 */
async function getPressure(lat, lng) {
  try {
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&current=pressure_msl`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);

    const data = await res.json();
    const hPa = data?.current?.pressure_msl;

    if (typeof hPa !== 'number') throw new Error('No pressure_msl in response');

    return {
      geo_value: parseFloat(hPa.toFixed(1)),
      geo_slot: hPaToSlot(hPa),
    };
  } catch (err) {
    console.warn('Pressure fetch failed:', err.message);
    return { geo_value: null, geo_slot: 'neutral' };
  }
}

/**
 * Map hPa value to named pressure slot.
 * Spec: stormy <990 | unsettled 990–1004 | neutral 1005–1012
 *       clear 1013–1024 | serene 1025+
 */
function hPaToSlot(hPa) {
  if (hPa < 990)  return 'stormy';
  if (hPa < 1005) return 'unsettled';
  if (hPa < 1013) return 'neutral';
  if (hPa < 1025) return 'clear';
  return 'serene';
}

/**
 * Normalised position for formula coefficient calculation.
 * high_pressure affinity peaks at serene (hPa ≥ 1025) → maps to 1.0
 * low_pressure affinity peaks at stormy (hPa < 990) → inverted
 *
 * We normalise to 0–1 across the full realistic range 960–1050.
 */
function pressureNormalisedPosition(hPa, affinity) {
  const MIN_HPA = 960;
  const MAX_HPA = 1050;
  const clamped = Math.max(MIN_HPA, Math.min(MAX_HPA, hPa));
  const normalised = (clamped - MIN_HPA) / (MAX_HPA - MIN_HPA); // 0=low, 1=high
  return affinity === 'high_pressure' ? normalised : 1 - normalised;
}

module.exports = { getPressure, hPaToSlot, pressureNormalisedPosition };
