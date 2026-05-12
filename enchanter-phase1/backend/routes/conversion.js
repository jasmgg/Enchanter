/**
 * routes/conversion.js
 *
 * GET /api/v1/conversion/spell/:id
 *   Returns the 5e SRD conversion for a single Enchanter spell.
 *   Auth: none — public data (spell must not be banned).
 *
 * GET /api/v1/conversion/systems
 *   Returns available conversion systems.
 *   Auth: none.
 */

const express = require('express');
const pool    = require('../db/pool');
const { buildConversion } = require('../lib/conversionDescriptions');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/conversion/systems
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of available conversion systems.
 * Designed to be extended — just add entries to the array when Cairn etc. land.
 */
router.get('/systems', (_req, res) => {
  res.json([
    {
      id:          '5e',
      name:        'D&D 5e SRD',
      description: 'Dungeons & Dragons 5th Edition System Reference Document',
      available:   true,
    },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/conversion/spell/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the 5e conversion for a spell.
 *
 * Response:
 * {
 *   spell_id, spell_name, creator_username, site_name, crafted_at,
 *   // Original Enchanter fields preserved
 *   power_score, cost, duration_tier, range_tier, concentration,
 *   expression_incantation, expression_delivery, expression_colour,
 *   expression_sound, expression_notes,
 *   // 5e conversion block
 *   conversion: {
 *     spell_name_5e, school, level, level_num, slot,
 *     duration, range, dc, damage, concentration, description
 *   }
 * }
 */
router.get('/spell/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT
         s.id, s.name, s.power_score, s.cost,
         s.duration_tier, s.range_tier, s.concentration,
         s.expression_incantation, s.expression_delivery,
         s.expression_colour, s.expression_sound, s.expression_notes,
         s.crafted_at, s.is_banned,
         u.username AS creator_username,
         si.name AS site_name,
         si.spell_name AS site_spell_name,
         si.region
       FROM spells s
       JOIN users u  ON u.id  = s.creator_id
       JOIN sites si ON si.id = s.site_id
       WHERE s.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Spell not found' });
    }

    const spell = rows[0];

    if (spell.is_banned) {
      return res.status(403).json({ error: 'spell_banned', message: 'This spell has been banned.' });
    }

    const conversion = buildConversion(spell, spell.site_spell_name);

    if (!conversion) {
      return res.status(422).json({
        error: 'no_conversion',
        message: `No 5e conversion available for spell type "${spell.site_spell_name}".`,
      });
    }

    res.json({
      spell_id:               spell.id,
      spell_name:             spell.name,
      creator_username:       spell.creator_username,
      site_name:              spell.site_name,
      region:                 spell.region,
      crafted_at:             spell.crafted_at,
      power_score:            spell.power_score,
      cost:                   spell.cost,
      duration_tier:          spell.duration_tier,
      range_tier:             spell.range_tier,
      concentration:          spell.concentration,
      expression_incantation: spell.expression_incantation,
      expression_delivery:    spell.expression_delivery,
      expression_colour:      spell.expression_colour,
      expression_sound:       spell.expression_sound,
      expression_notes:       spell.expression_notes,
      conversion,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
