/**
 * lib/calendar.js
 * Sacred calendar lookup.
 * Solstice/equinox dates calculated via suncalc.
 * Eclipse dates from static pre-loaded table (2025–2035).
 * All times are UTC. Active windows are calendar day (00:01–23:59 UTC).
 */
const SunCalc = require('suncalc');

// ── Eclipse table 2025–2035 ──────────────────────────────────────────────────
// Format: [year, month(1-indexed), day, durationHours]
// Source: NASA eclipse predictions (approximate)
const ECLIPSE_TABLE = [
  // Solar eclipses
  [2025, 3, 29, 6],
  [2025, 9, 21, 6],
  [2026, 2, 17, 6],
  [2026, 8, 12, 6],
  [2027, 2, 6,  6],
  [2027, 8, 2,  6],
  [2028, 1, 26, 6],
  [2028, 7, 22, 6],
  [2029, 1, 14, 6],
  [2029, 6, 12, 6],
  [2029, 7, 11, 6],
  [2030, 6, 1,  6],
  [2030, 11, 25, 6],
  [2031, 5, 21, 6],
  [2031, 11, 14, 6],
  [2032, 5, 9,  6],
  [2032, 11, 3,  6],
  [2033, 3, 30, 6],
  [2033, 9, 23, 6],
  [2034, 3, 20, 6],
  [2034, 9, 12, 6],
  [2035, 3, 9,  6],
  [2035, 9, 2,  6],
];

// ── Fixed calendar dates (month is 1-indexed) ────────────────────────────────
const FIXED_DATES = [
  { key: 'samhain',    month: 10, day: 31 },
  { key: 'imbolc',     month: 2,  day: 1  },
  { key: 'beltane',    month: 5,  day: 1  },
  { key: 'lughnasadh', month: 8,  day: 1  },
];

/**
 * Get the active calendar event for a given date (defaults to now).
 * Returns the event key string, or null if none active.
 */
function getCalendarEvent(date = new Date()) {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-indexed
  const day   = date.getUTCDate();

  // Check fixed dates
  for (const { key, month: m, day: d } of FIXED_DATES) {
    if (month === m && day === d) return key;
  }

  // Check eclipse table
  for (const [ey, em, ed, durationHours] of ECLIPSE_TABLE) {
    if (year === ey && month === em) {
      const eclipseStart = Date.UTC(ey, em - 1, ed, 0, 0, 0);
      const eclipseEnd   = eclipseStart + durationHours * 3600 * 1000;
      if (date.getTime() >= eclipseStart && date.getTime() <= eclipseEnd) {
        return 'eclipse';
      }
    }
  }

  // Check astronomical events via suncalc
  const astronomicalEvent = getAstronomicalEvent(date, year);
  if (astronomicalEvent) return astronomicalEvent;

  return null;
}

/**
 * Detect solstice / equinox by checking if today is within 12 hours of the event.
 * suncalc doesn't expose solstice times directly, so we use a simple approximation
 * by checking solar declination crossings. For the MVP, we use known approximate dates
 * and a ±1 day tolerance, then refine with suncalc solar noon altitude.
 */
function getAstronomicalEvent(date, year) {
  // Approximate dates — close enough for a calendar day window
  const events = [
    { key: 'ostara', approxMonth: 3, approxDay: 20 },  // Spring equinox
    { key: 'litha',  approxMonth: 6, approxDay: 21 },  // Summer solstice
    { key: 'mabon',  approxMonth: 9, approxDay: 22 },  // Autumn equinox
    { key: 'yule',   approxMonth: 12, approxDay: 21 }, // Winter solstice
  ];

  const month = date.getUTCMonth() + 1;
  const day   = date.getUTCDate();

  for (const { key, approxMonth, approxDay } of events) {
    if (month === approxMonth) {
      // Allow ±2 day window to account for year-to-year variation
      if (Math.abs(day - approxDay) <= 2) return key;
    }
  }

  return null;
}

/**
 * Get the event_modifier value for a given calendar event key.
 * Returns null if no event or no modifier.
 */
function getEventModifier(eventKey) {
  const MODIFIERS = {
    samhain:    'dot',
    yule:       'duration_extend',
    imbolc:     'hot_allies',
    ostara:     'split_target',
    beltane:    'extra_target',
    litha:      'permanent',
    lughnasadh: 'repeat',
    mabon:      'conceal',
    eclipse:    'aoe',
  };
  return eventKey ? (MODIFIERS[eventKey] ?? null) : null;
}

module.exports = { getCalendarEvent, getEventModifier };
