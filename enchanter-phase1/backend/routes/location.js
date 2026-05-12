/**
 * routes/location.js
 *
 * POST /api/v1/validate-location
 * Server-side GPS validation against a site's radius.
 * Spec section 5 — haversine distance, benefit-of-the-doubt on accuracy radius.
 */
const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EARTH_RADIUS_M = 6_371_000;

/**
 * Haversine distance in metres between two lat/lng points.
 */
function haversineMetres(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POST /api/v1/validate-location
 * Body: { site_id, lat, lng, accuracy? }
 * Returns: { valid: bool, distance_metres: number, site_id, site_name }
 *
 * accuracy (metres) — if provided, we give benefit of the doubt:
 * valid if (distance - accuracy) <= site.radius_metres
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { site_id, lat, lng, accuracy } = req.body;

    if (!site_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'site_id, lat and lng are required' });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ error: 'lat and lng must be valid numbers' });
    }

    const { rows } = await pool.query(
      'SELECT id, name, latitude, longitude, radius_metres FROM sites WHERE id = $1',
      [site_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const site = rows[0];
    const distance = Math.round(haversineMetres(parsedLat, parsedLng, site.latitude, site.longitude));

    // Benefit of the doubt: if the device accuracy circle overlaps the site radius, allow it
    const accuracyBuffer = accuracy ? parseFloat(accuracy) : 0;
    const effectiveDistance = Math.max(0, distance - accuracyBuffer);
    const valid = effectiveDistance <= site.radius_metres;

    res.json({
      valid,
      distance_metres: distance,
      site_id: site.id,
      site_name: site.name,
      radius_metres: site.radius_metres,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
