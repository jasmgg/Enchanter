/**
 * Enchanter — Phase 7 seed
 * All 10 MVP sites with verified GPS coordinates, final effect descriptions
 * and affinity profiles cross-referenced against GDD v0.6 and Product Spec v0.3.
 *
 * Coordinates sourced from: Wikipedia, Megalithic Portal, English Heritage,
 * and OS grid reference conversions. Accurate to ~10m.
 *
 * Run: node db/seed.js
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING keyed on site name.
 */
require('dotenv').config();
const pool = require('./pool');

const SITES = [
  // ─── COASTAL (barometric pressure input) ─────────────────────────────────

  {
    name: 'Tintagel',
    latitude: 50.6660,
    longitude: -4.7630,
    radius_metres: 200,
    site_type: 'coastal',
    effect_description:
      'Beams of light descend from the sky to burn any undead beings for an initial burst and damage over time.',
    spell_name: 'Smite',
    lore_note:
      'The cliff-top ruins carry memories of a kingdom that may never have been. The sea below never calms.',
    region: 'Cornwall',
    affinity_lunar: 'light',
    affinity_geo: 'low_pressure',
    affinity_tod: 'light',
    affinity_season: 'summer',
  },
  {
    // Anchored to Housesteads Roman Fort — the most visited, most intact
    // section of the wall and the most dramatically positioned.
    name: "Hadrian's Wall",
    latitude: 55.0133,
    longitude: -2.3302,
    radius_metres: 200,
    site_type: 'coastal',
    effect_description:
      'An immovable ward of force forms around the caster or a target, absorbing incoming damage and preventing forced movement.',
    spell_name: 'Bulwark',
    lore_note:
      'The northernmost edge of an empire. The wall does not defend a line — it defines one.',
    region: 'Northumberland',
    affinity_lunar: 'light',
    affinity_geo: 'low_pressure',
    affinity_tod: 'light',
    affinity_season: 'autumn',
  },
  {
    name: 'Westminster Abbey',
    latitude: 51.4994,
    longitude: -0.1273,
    radius_metres: 200,
    site_type: 'coastal',
    effect_description:
      'A warm pulse of restorative light flows from the caster into a touched ally, recovering lost vitality. Cannot target the caster.',
    spell_name: 'Heal Other',
    lore_note:
      'The coronation church. Consecrated ground layered so deep that history becomes geology.',
    region: 'London',
    affinity_lunar: 'light',
    affinity_geo: 'high_pressure',
    affinity_tod: 'light',
    affinity_season: 'summer',
  },
  {
    name: 'Whitby Abbey',
    latitude: 54.4884,
    longitude: -0.6080,
    radius_metres: 200,
    site_type: 'coastal',
    effect_description:
      'Thick shadowed roots erupt from the ground around a target point, restraining creatures within. Movement drops to zero for the duration.',
    spell_name: 'Entangling Roots',
    lore_note:
      'It inspired Bram Stoker. The cliff was always here. The ruin just gave it a name.',
    region: 'North Yorkshire',
    affinity_lunar: 'dark',
    affinity_geo: 'low_pressure',
    affinity_tod: 'dark',
    affinity_season: 'autumn',
  },
  {
    // Isle of Lewis. Coastal classification: Atlantic exposure, genuine
    // barometric variability, open ocean pressure systems.
    name: 'Callanish Stones',
    latitude: 58.1978,
    longitude: -6.7441,
    radius_metres: 200,
    site_type: 'coastal',
    effect_description:
      'A quiet celestial favour settles on up to three allies, adding a bonus to attack rolls and saving throws for the duration.',
    spell_name: 'Bless',
    lore_note:
      'Older than Stonehenge. The stones were buried under peat for three thousand years. What the peat preserved, the sky still remembers.',
    region: 'Outer Hebrides',
    affinity_lunar: 'dark',
    affinity_geo: 'low_pressure',
    affinity_tod: 'dark',
    affinity_season: 'winter',
  },

  // ─── LANDLOCKED (solar Kp index input) ───────────────────────────────────

  {
    name: 'Abney Park Cemetery',
    latitude: 51.5636,
    longitude: -0.0784,
    radius_metres: 200,
    site_type: 'landlocked',
    effect_description:
      "The earth splits and a skeletal warrior claws free, bound to serve the caster for the spell's duration.",
    spell_name: 'Summon Skeleton',
    lore_note:
      'A Victorian garden cemetery that became a nature reserve. The memorials lean. The trees have swallowed the paths.',
    region: 'London',
    affinity_lunar: 'dark',
    affinity_geo: 'calm_solar',
    affinity_tod: 'dark',
    affinity_season: 'winter',
  },
  {
    name: 'Rievaulx Abbey',
    latitude: 54.2526,
    longitude: -1.1188,
    radius_metres: 200,
    site_type: 'landlocked',
    effect_description:
      'The caster or a touched target fades from sight entirely, becoming invisible until the duration expires or a hostile action is taken.',
    spell_name: 'Invisibility',
    lore_note:
      'The valley hides it until you are almost upon it. The Cistercians chose silence and found it.',
    region: 'North Yorkshire',
    affinity_lunar: 'light',
    affinity_geo: 'charged_solar',
    affinity_tod: 'light',
    affinity_season: 'spring',
  },
  {
    name: 'Stonehenge',
    latitude: 51.1789,
    longitude: -1.8262,
    radius_metres: 200,
    site_type: 'landlocked',
    effect_description:
      'Three darts of pure arcane force streak unerringly toward targets within range, each dealing force damage on impact. The darts never miss.',
    spell_name: 'Magic Missile',
    lore_note:
      'The most visited prehistoric monument in the world. Familiarity has not explained it.',
    region: 'Wiltshire',
    affinity_lunar: 'dark',
    affinity_geo: 'charged_solar',
    affinity_tod: 'dark',
    affinity_season: 'winter',
  },
  {
    name: 'Glastonbury Tor',
    latitude: 51.1444,
    longitude: -2.6987,
    radius_metres: 200,
    site_type: 'landlocked',
    effect_description:
      'A wave of sacred golden light radiates from the caster. Weaker undead are destroyed outright; stronger undead are turned and compelled to flee.',
    spell_name: 'Banish Undead',
    lore_note:
      'The hill rises out of the Somerset Levels like a thought that refuses to sink. The tower at the top is all that remains of a church struck by earthquake.',
    region: 'Somerset',
    affinity_lunar: 'light',
    affinity_geo: 'charged_solar',
    affinity_tod: 'light',
    affinity_season: 'summer',
  },
  {
    // The chalk figure on the Marlborough Downs escarpment, Wiltshire.
    // OS grid: SU047700. Coordinates verified against OS data.
    name: 'Cherhill White Horse',
    latitude: 51.4203,
    longitude: -1.9370,
    radius_metres: 200,
    site_type: 'landlocked',
    effect_description:
      'The caster or a touched ally is suffused with supernatural speed. Movement increases significantly, an additional action is granted and difficult terrain costs no extra movement.',
    spell_name: 'Swiftness',
    lore_note:
      'Cut into the chalk in 1780, it faces north-east across a plain that has been walked for ten thousand years. The figure has been re-chalked many times. The hill does not need it.',
    region: 'Wiltshire',
    affinity_lunar: 'light',
    affinity_geo: 'calm_solar',
    affinity_tod: 'light',
    affinity_season: 'spring',
  },
];

// ── Audit log ────────────────────────────────────────────────────────────────
// Expected state after seeding:
//   Coastal (pressure):   Tintagel, Hadrian's Wall, Westminster Abbey,
//                         Whitby Abbey, Callanish Stones
//   Landlocked (solar):   Abney Park Cemetery, Rievaulx Abbey, Stonehenge,
//                         Glastonbury Tor, Cherhill White Horse
//
// Affinity audit vs GDD v0.6 §5.1:
//   Tintagel          light / low_pressure  / light / summer   ✓
//   Hadrian's Wall    light / low_pressure  / light / autumn   ✓
//   Westminster Abbey light / high_pressure / light / summer   ✓
//   Whitby Abbey      dark  / low_pressure  / dark  / autumn   ✓
//   Callanish Stones  dark  / low_pressure  / dark  / winter   ✓
//   Abney Park        dark  / calm_solar    / dark  / winter   ✓
//   Rievaulx Abbey    light / charged_solar / light / spring   ✓
//   Stonehenge        dark  / charged_solar / dark  / winter   ✓
//   Glastonbury Tor   light / charged_solar / light / summer   ✓
//   Cherhill          light / calm_solar    / light / spring   ✓

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding MVP sites (Phase 7 — all 10)…\n');

    for (const site of SITES) {
      const result = await client.query(
        `INSERT INTO sites (
          name, latitude, longitude, radius_metres, site_type,
          effect_description, spell_name, lore_note, region,
          affinity_lunar, affinity_geo, affinity_tod, affinity_season
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name, site_type, affinity_geo`,
        [
          site.name, site.latitude, site.longitude, site.radius_metres,
          site.site_type, site.effect_description, site.spell_name,
          site.lore_note, site.region,
          site.affinity_lunar, site.affinity_geo, site.affinity_tod,
          site.affinity_season,
        ]
      );

      if (result.rows.length > 0) {
        const { id, name, site_type, affinity_geo } = result.rows[0];
        console.log(`  ✓ ${name.padEnd(24)} ${site_type.padEnd(12)} ${affinity_geo.padEnd(16)} ${id}`);
      } else {
        console.log(`  – Skipped (already exists): ${site.name}`);
      }
    }

    const countRes = await client.query('SELECT COUNT(*) FROM sites');
    console.log(`\nSeed complete. Total sites in DB: ${countRes.rows[0].count}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
