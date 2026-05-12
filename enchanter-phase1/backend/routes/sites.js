const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

/**
 * GET /api/v1/sites
 * Returns all sites with full affinity data.
 * Auth: none — public data.
 */
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        name,
        latitude,
        longitude,
        radius_metres,
        site_type,
        spell_name,
        effect_description,
        lore_note,
        region,
        affinity_lunar,
        affinity_geo,
        affinity_tod,
        affinity_season
      FROM sites
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sites/:id
 * Returns a single site.
 * Auth: none — public data.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT
        id,
        name,
        latitude,
        longitude,
        radius_metres,
        site_type,
        spell_name,
        effect_description,
        lore_note,
        region,
        affinity_lunar,
        affinity_geo,
        affinity_tod,
        affinity_season
      FROM sites
      WHERE id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
