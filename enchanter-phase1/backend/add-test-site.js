require('dotenv').config();
const pool = require('./db/pool');

pool.query(`
  INSERT INTO sites (name, latitude, longitude, radius_metres, site_type, effect_description, spell_name, lore_note, region, affinity_lunar, affinity_geo, affinity_tod, affinity_season)
  VALUES ('The Hanwell Threshold', 51.50652, -0.33351, 200, 'landlocked', 'A ripple of protective energy emanates from the caster, forming an invisible ward that slows and weakens those who pass through it uninvited.', 'Ward', 'A quiet street in Ealing, unremarkable to most. But the ley lines do not care for appearances.', 'London', 'dark', 'calm_solar', 'dark', 'autumn')
`).then(() => {
  console.log('Site added!');
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});