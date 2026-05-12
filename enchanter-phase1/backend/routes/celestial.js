const express = require('express');
const { getLunarPhase } = require('../lib/lunar');
const { getPressure } = require('../lib/pressure');
const { getKpIndex } = require('../lib/kp');
const { getTodSlot, getSeason } = require('../lib/timeOfDay');
const { getCalendarEvent, getEventModifier } = require('../lib/calendar');

const router = express.Router();

/**
 * GET /api/v1/celestial/current
 * Returns current celestial conditions — lunar, Kp, time slot, season, calendar event.
 * Auth: none — public data.
 *
 * Query params (optional):
 *   lat, lng — if provided, used for precise sunrise/sunset calculation
 */
router.get('/current', async (req, res, next) => {
  try {
    const now = new Date();
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;

    const { lunar_phase, lunar_slot } = getLunarPhase(now);
    const { geo_value: kp_value, geo_slot: kp_slot } = await getKpIndex();
    const tod_slot = getTodSlot(now, lat, lng);
    const season   = getSeason(now);
    const calendar_event = getCalendarEvent(now);
    const event_modifier = getEventModifier(calendar_event);

    res.json({
      timestamp: now.toISOString(),
      lunar: {
        phase:  lunar_phase,
        slot:   lunar_slot,
      },
      kp: {
        value: kp_value,
        slot:  kp_slot,
      },
      tod: {
        slot: tod_slot,
      },
      season,
      calendar_event,
      event_modifier,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/celestial/pressure?lat=&lng=
 * Returns current barometric pressure for a given location.
 * Used for coastal sites.
 * Auth: none — public data.
 */
router.get('/pressure', async (req, res, next) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  try {
    const { geo_value, geo_slot } = await getPressure(parsedLat, parsedLng);
    res.json({
      latitude:  parsedLat,
      longitude: parsedLng,
      pressure_hpa: geo_value,
      slot: geo_slot,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
