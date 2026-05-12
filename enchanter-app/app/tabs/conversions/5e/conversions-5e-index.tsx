/**
 * app/tabs/conversions/5e/index.tsx
 *
 * 5e Spellbook — the user's spells rendered as D&D 5e stat blocks.
 * Fetches the user's spells from /spells/mine, then for each card
 * derives the 5e display values client-side using the same conversion
 * logic as the detail screen (no extra API call per card — just the
 * level/school/duration mapping).
 *
 * Tapping a card navigates to the full 5e spell detail.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getMySpells, Spell } from '../../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Inline conversion helpers (level + school only — no API needed for list view)
// ─────────────────────────────────────────────────────────────────────────────

const SCHOOL_MAP: Record<string, string> = {
  'Smite':             'Evocation',
  'Bulwark':           'Abjuration',
  'Heal Other':        'Evocation',
  'Summon Skeleton':   'Necromancy',
  'Entangling Roots':  'Conjuration',
  'Invisibility':      'Illusion',
  'Bless':             'Enchantment',
  'Magic Missile':     'Evocation',
  'Banish Undead':     'Abjuration',
  'Swiftness':         'Transmutation',
};

const SPELL_NAME_5E: Record<string, string> = {
  'Smite':             'Divine Smite',
  'Bulwark':           'Shield',
  'Heal Other':        'Cure Wounds',
  'Summon Skeleton':   'Animate Dead',
  'Entangling Roots':  'Entangle',
  'Invisibility':      'Invisibility',
  'Bless':             'Bless',
  'Magic Missile':     'Magic Missile',
  'Banish Undead':     'Banishment',
  'Swiftness':         'Expeditious Retreat',
};

function levelLabel(score: number): string {
  if (score <= 2.0) return 'Cantrip';
  if (score <= 3.5) return '1st';
  if (score <= 5.0) return '2nd';
  if (score <= 6.5) return '3rd';
  if (score <= 7.5) return '4th';
  if (score <= 8.5) return '5th';
  if (score <= 9.2) return '6th';
  if (score <= 9.7) return '7th';
  if (score <= 9.9) return '8th';
  return '9th';
}

function durationLabel(tier: string): string {
  switch (tier) {
    case 'instant':   return 'Instantaneous';
    case 'short':     return '1 min';
    case 'long':      return '1 hr';
    case 'permanent': return 'Until dispelled';
    default:          return tier;
  }
}

function rangeLabel(tier: string): string {
  switch (tier) {
    case 'self':  return 'Self';
    case 'touch': return 'Touch';
    case 'near':  return '30 ft';
    case 'far':   return '60 ft';
    case 'vast':  return '120 ft';
    default:      return tier;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spell card
// ─────────────────────────────────────────────────────────────────────────────

function FiveESpellCard({ spell, onPress }: { spell: Spell; onPress: () => void }) {
  const spellType = spell.site_spell_name ?? '';
  const school    = SCHOOL_MAP[spellType] ?? 'Unknown';
  const name5e    = SPELL_NAME_5E[spellType] ?? spellType;
  const level     = levelLabel(spell.power_score);
  const duration  = durationLabel(spell.duration_tier);
  const range     = rangeLabel(spell.range_tier);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Header band */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardSpellName}>{spell.name}</Text>
          <Text style={styles.card5eName}>{name5e}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>

      {/* School + site */}
      <View style={styles.cardMeta}>
        <Text style={styles.cardSchool}>{school}</Text>
        <Text style={styles.cardDot}>·</Text>
        <Text style={styles.cardSite}>{spell.site_name}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.cardStats}>
        <MiniStat label="Duration" value={duration} />
        <View style={styles.statDivider} />
        <MiniStat label="Range"    value={range} />
        <View style={styles.statDivider} />
        <MiniStat label="Focus"    value={spell.concentration ? 'Yes' : 'No'} />
      </View>
    </TouchableOpacity>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FiveESpellbookScreen() {
  const router = useRouter();

  const [spells, setSpells]   = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMySpells();
      setSpells(result.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load spells');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: Spell }) => (
    <FiveESpellCard
      spell={item}
      onPress={() =>
        router.push({
          pathname: '/tabs/conversions/5e/[id]',
          params: { id: item.id },
        })
      }
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>✦</Text>
        <Text style={styles.emptyTitle}>No spells yet</Text>
        <Text style={styles.emptyBody}>
          Craft your first spell on the Map to see it converted here.
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Text style={styles.navBackText}>‹ Conversions</Text>
        </TouchableOpacity>
        <Text style={styles.title}>D&D 5e SRD</Text>
        <Text style={styles.subtitle}>Your spells as 5th Edition magic</Text>
      </View>

      <View style={styles.divider} />

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ flex: 1 }} />
      ) : error ? (
        <View style={styles.centred}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={spells}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  navBack: {
    marginBottom: Spacing.sm,
  },
  navBackText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardSpellName: {
    fontFamily: Typography.display,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  card5eName: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.gold,
    fontStyle: 'italic',
    marginTop: 1,
  },
  levelBadge: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  levelText: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  cardSchool: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.violet,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardDot: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  cardSite: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  miniStatValue: {
    fontFamily: Typography.display,
    fontSize: 12,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  miniStatLabel: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  // Empty / error
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
    color: Colors.goldDim,
  },
  emptyTitle: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  emptyBody: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.error,
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
