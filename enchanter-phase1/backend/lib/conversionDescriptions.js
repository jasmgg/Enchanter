/**
 * lib/conversionDescriptions.js
 *
 * 5e SRD conversion data keyed by Enchanter site spell type.
 *
 * Each entry defines:
 *   spell_name   — the matched 5e SRD spell name
 *   school       — school of magic
 *   description  — bespoke flavour + mechanics template
 *
 * Template tokens (substituted at runtime):
 *   {{level}}         — spell level string e.g. "3rd-level" or "Cantrip"
 *   {{duration}}      — 5e duration string e.g. "1 minute"
 *   {{range}}         — 5e range string e.g. "30 feet"
 *   {{dc}}            — saving throw DC (8 + proficiency + spellcasting mod, derived from power score)
 *   {{damage}}        — damage expression e.g. "2d8"
 *   {{concentration}} — "Requires concentration." or "" (empty string)
 *   {{slot}}          — spell slot level e.g. "1st" or "cantrip"
 */

const descriptions = {

  Smite: {
    spell_name: 'Divine Smite',
    school: 'Evocation',
    description:
      'Evocation ({{level}}). When you hit a creature with a melee weapon attack, ' +
      'you can expend a {{slot}}-level spell slot to deal an extra {{damage}} radiant ' +
      'damage to the target, in addition to the weapon\'s damage. The damage increases ' +
      'by 1d8 for each spell slot level above 1st. Duration: {{duration}}. {{concentration}}',
  },

  Bulwark: {
    spell_name: 'Shield',
    school: 'Abjuration',
    description:
      'Abjuration ({{level}}). An invisible barrier of magical force appears and ' +
      'protects you. Until the start of your next turn, you have a +5 bonus to AC, ' +
      'including against the triggering attack, and you take no damage from Magic Missile. ' +
      'Range: {{range}}. Duration: {{duration}}. {{concentration}}',
  },

  'Heal Other': {
    spell_name: 'Cure Wounds',
    school: 'Evocation',
    description:
      'Evocation ({{level}}). A creature you touch regains {{damage}} hit points. ' +
      'This spell has no effect on undead or constructs. ' +
      'Range: {{range}}. Duration: {{duration}}. {{concentration}}',
  },

  'Summon Skeleton': {
    spell_name: 'Animate Dead',
    school: 'Necromancy',
    description:
      'Necromancy ({{level}}). This spell creates an undead servant. Choose a pile ' +
      'of bones or a corpse of a Medium or Small humanoid within {{range}}. Your spell ' +
      'imbues the target with a foul mimicry of life, raising it as an undead creature. ' +
      'The target becomes a skeleton if you chose bones. On each of your turns, you can ' +
      'use a bonus action to mentally command any creature you made with this spell. ' +
      'The creature obeys your commands for {{duration}}, after which it crumbles. ' +
      'DC {{dc}} Wisdom saving throw to resist compulsion. {{concentration}}',
  },

  'Entangling Roots': {
    spell_name: 'Entangle',
    school: 'Conjuration',
    description:
      'Conjuration ({{level}}). Grasping weeds and vines sprout from the ground in ' +
      'a 20-foot square starting from a point within {{range}}. For {{duration}}, these ' +
      'plants turn the ground in the area into difficult terrain. A creature in the area ' +
      'when you cast the spell must succeed on a DC {{dc}} Strength saving throw or be ' +
      'restrained by the entangling plants until the spell ends. {{concentration}}',
  },

  Invisibility: {
    spell_name: 'Invisibility',
    school: 'Illusion',
    description:
      'Illusion ({{level}}). A creature you touch becomes invisible until the spell ends. ' +
      'Anything the target is wearing or carrying is invisible as long as it is on the ' +
      'target\'s person. The spell ends for a target that attacks or casts a spell. ' +
      'Range: {{range}}. Duration: {{duration}}. {{concentration}}',
  },

  Bless: {
    spell_name: 'Bless',
    school: 'Enchantment',
    description:
      'Enchantment ({{level}}). You bless up to three creatures of your choice within ' +
      '{{range}}. Whenever a target makes an attack roll or a saving throw before the ' +
      'spell ends, the target can roll a d4 and add the number rolled to the attack roll ' +
      'or saving throw. Duration: {{duration}}. {{concentration}}',
  },

  'Magic Missile': {
    spell_name: 'Magic Missile',
    school: 'Evocation',
    description:
      'Evocation ({{level}}). You create three glowing darts of magical force. Each dart ' +
      'hits a creature of your choice that you can see within {{range}}. A dart deals ' +
      '1d4+1 force damage to its target. The darts all strike simultaneously, and you ' +
      'can direct them to hit one creature or several. At higher levels, the spell ' +
      'creates one more dart for each slot level above 1st. ' +
      'Total damage at this level: {{damage}}. Duration: {{duration}}. {{concentration}}',
  },

  'Banish Undead': {
    spell_name: 'Banishment',
    school: 'Abjuration',
    description:
      'Abjuration ({{level}}). You attempt to send one creature that you can see within ' +
      '{{range}} to another plane of existence. The target must succeed on a DC {{dc}} ' +
      'Charisma saving throw or be banished. If the target is native to the plane of ' +
      'existence you\'re on, you banish the target to a harmless demiplane for {{duration}}. ' +
      'While there, the target is incapacitated. When the spell ends, the target reappears ' +
      'in the space it left or in the nearest unoccupied space. {{concentration}}',
  },

  Swiftness: {
    spell_name: 'Expeditious Retreat',
    school: 'Transmutation',
    description:
      'Transmutation ({{level}}). This spell allows you to move at an incredible pace. ' +
      'When you cast this spell, and then as a bonus action on each of your turns until ' +
      'the spell ends, you can take the Dash action. Duration: {{duration}}. ' +
      'Range: {{range}}. {{concentration}}',
  },

};

/**
 * Derive 5e spell level string from Enchanter power score.
 *
 * @param {number} score
 * @returns {{ levelStr: string, slotStr: string, levelNum: number }}
 */
function spellLevel(score) {
  if (score <= 2.0) return { levelStr: 'Cantrip',    slotStr: 'cantrip', levelNum: 0 };
  if (score <= 3.5) return { levelStr: '1st-level',  slotStr: '1st',     levelNum: 1 };
  if (score <= 5.0) return { levelStr: '2nd-level',  slotStr: '2nd',     levelNum: 2 };
  if (score <= 6.5) return { levelStr: '3rd-level',  slotStr: '3rd',     levelNum: 3 };
  if (score <= 7.5) return { levelStr: '4th-level',  slotStr: '4th',     levelNum: 4 };
  if (score <= 8.5) return { levelStr: '5th-level',  slotStr: '5th',     levelNum: 5 };
  if (score <= 9.2) return { levelStr: '6th-level',  slotStr: '6th',     levelNum: 6 };
  if (score <= 9.7) return { levelStr: '7th-level',  slotStr: '7th',     levelNum: 7 };
  if (score <= 9.9) return { levelStr: '8th-level',  slotStr: '8th',     levelNum: 8 };
  return               { levelStr: '9th-level',  slotStr: '9th',     levelNum: 9 };
}

/**
 * Derive 5e duration string from Enchanter duration tier.
 */
function fiveDuration(tier) {
  switch (tier) {
    case 'instant':   return 'Instantaneous';
    case 'short':     return '1 minute';
    case 'long':      return '1 hour';
    case 'permanent': return 'Until dispelled';
    default:          return tier;
  }
}

/**
 * Derive 5e range string from Enchanter range tier.
 */
function fiveRange(tier) {
  switch (tier) {
    case 'self':  return 'Self';
    case 'touch': return 'Touch';
    case 'near':  return '30 feet';
    case 'far':   return '60 feet';
    case 'vast':  return '120 feet';
    default:      return tier;
  }
}

/**
 * Derive saving throw DC from power score.
 * Approximates 8 + proficiency bonus + spellcasting modifier.
 * power 1–3 → DC 10, scales to DC 19 at power 10.
 */
function saveDC(score) {
  return Math.round(10 + (score - 1) * (9 / 9));
}

/**
 * Derive damage expression from power score and spell level.
 * Used for damage-dealing spells; healing spells reuse the same dice.
 */
function damageExpression(score, levelNum) {
  if (levelNum === 0) return '1d6';
  if (levelNum === 1) return '2d6';
  if (levelNum === 2) return '3d6';
  if (levelNum === 3) return '4d8';
  if (levelNum === 4) return '5d8';
  if (levelNum === 5) return '6d10';
  if (levelNum === 6) return '7d10';
  if (levelNum === 7) return '8d10';
  if (levelNum === 8) return '9d12';
  return '10d12';
}

/**
 * Build the full 5e conversion for a spell.
 *
 * @param {Object} spell  - Spell row (power_score, duration_tier, range_tier, concentration, cost)
 * @param {string} spellType - site.spell_name (e.g. "Smite")
 * @returns {Object|null}
 */
function buildConversion(spell, spellType) {
  const entry = descriptions[spellType];
  if (!entry) return null;

  const { levelStr, slotStr, levelNum } = spellLevel(spell.power_score);
  const duration   = fiveDuration(spell.duration_tier);
  const range      = fiveRange(spell.range_tier);
  const dc         = saveDC(spell.power_score);
  const damage     = damageExpression(spell.power_score, levelNum);
  const concStr    = spell.concentration ? 'Requires concentration.' : '';

  const description = entry.description
    .replace(/{{level}}/g,         levelStr)
    .replace(/{{slot}}/g,          slotStr)
    .replace(/{{duration}}/g,      duration)
    .replace(/{{range}}/g,         range)
    .replace(/{{dc}}/g,            String(dc))
    .replace(/{{damage}}/g,        damage)
    .replace(/{{concentration}}/g, concStr)
    .trim();

  return {
    spell_name_5e:  entry.spell_name,
    school:         entry.school,
    level:          levelStr,
    level_num:      levelNum,
    slot:           slotStr,
    duration,
    range,
    dc,
    damage,
    concentration:  spell.concentration,
    description,
  };
}

module.exports = { buildConversion, spellLevel, fiveDuration, fiveRange };
