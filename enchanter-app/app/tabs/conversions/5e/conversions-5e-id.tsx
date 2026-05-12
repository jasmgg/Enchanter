/**
 * app/tabs/conversions/5e/[id].tsx
 *
 * Full 5e spell detail screen.
 * Fetches the conversion from GET /api/v1/conversion/spell/:id and renders
 * the complete 5e stat block alongside the original Enchanter expression data.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSpellConversion, SpellConversionResponse } from '../../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.icon}>{icon}</Text>
      <Text style={sectionStyles.label}>{label}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  icon: {
    fontSize: 13,
    color: Colors.gold,
  },
  label: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  value: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FiveESpellDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData]       = useState<SpellConversionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getSpellConversion(id);
      setData(result);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load conversion');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.gold} size="large" />
        <Text style={styles.loadingText}>Translating spell…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centred}>
        <Ionicons name="warning-outline" size={36} color={Colors.error} />
        <Text style={styles.errorText}>{error ?? 'No conversion available'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { conversion } = data;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.navBackText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Hero — power score */}
      <View style={styles.hero}>
        <Text style={styles.heroScore}>{data.power_score.toFixed(2)}</Text>
        <Text style={styles.heroLabel}>POWER SCORE</Text>
      </View>

      {/* Identity */}
      <Text style={styles.spellName}>{data.spell_name}</Text>

      {/* 5e identity row */}
      <View style={styles.fiveEIdentity}>
        <Text style={styles.fiveESpellName}>{conversion.spell_name_5e}</Text>
        <Text style={styles.fiveEDot}>·</Text>
        <Text style={styles.fiveESchool}>{conversion.school}</Text>
        <Text style={styles.fiveEDot}>·</Text>
        <Text style={styles.fiveELevel}>{conversion.level}</Text>
      </View>

      <Text style={styles.siteLine}>
        {data.site_name}{data.region ? ` · ${data.region}` : ''}
      </Text>
      <Text style={styles.creatorLine}>
        Sealed by {data.creator_username}
      </Text>

      <View style={styles.divider} />

      {/* 5e stat block */}
      <SectionHeader icon="⚔" label="5e Stat Block" />
      <View style={styles.card}>
        <InfoRow label="School"        value={conversion.school} />
        <InfoRow label="Level"         value={conversion.level} />
        <InfoRow label="Casting Time"  value="1 Action" />
        <InfoRow label="Range"         value={conversion.range} />
        <InfoRow label="Duration"      value={conversion.duration} />
        <InfoRow label="Concentration" value={conversion.concentration ? 'Yes' : 'No'} />
        <InfoRow label="Spell Slot"    value={conversion.slot === 'cantrip' ? 'None (Cantrip)' : `${conversion.slot}-level slot`} />
        <InfoRow label="Save DC"       value={conversion.level_num === 0 ? '—' : `DC ${conversion.dc}`} />
      </View>

      {/* Effect */}
      <SectionHeader icon="✦" label="Effect" />
      <View style={styles.card}>
        <Text style={styles.effectText}>{conversion.description}</Text>
      </View>

      {/* Expression — kept from original Enchanter spell */}
      {(data.expression_incantation ||
        data.expression_delivery ||
        data.expression_colour ||
        data.expression_sound ||
        data.expression_notes) && (
        <>
          <SectionHeader icon="🎙" label="Expression" />
          <View style={styles.card}>
            {data.expression_incantation && (
              <InfoRow label="Incantation" value={data.expression_incantation} />
            )}
            {data.expression_delivery && (
              <InfoRow
                label="Delivery"
                value={data.expression_delivery.charAt(0).toUpperCase() + data.expression_delivery.slice(1)}
              />
            )}
            {data.expression_colour && (
              <InfoRow label="Colour" value={data.expression_colour} />
            )}
            {data.expression_sound && (
              <InfoRow label="Sound" value={data.expression_sound} />
            )}
            {data.expression_notes && (
              <InfoRow label="Notes" value={data.expression_notes} />
            )}
          </View>
        </>
      )}

      {/* Original Enchanter metrics — for reference */}
      <SectionHeader icon="◈" label="Enchanter Reference" />
      <View style={styles.card}>
        <InfoRow label="Duration Tier" value={data.duration_tier.charAt(0).toUpperCase() + data.duration_tier.slice(1)} />
        <InfoRow label="Range Tier"    value={data.range_tier.charAt(0).toUpperCase() + data.range_tier.slice(1)} />
        <InfoRow label="Cost"          value={String(data.cost)} />
      </View>

      <View style={{ height: Spacing.xxl * 2 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centred: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
  },
  backBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Nav
  nav: {
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  navBackText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  heroScore: {
    fontFamily: Typography.display,
    fontSize: 64,
    color: Colors.gold,
    letterSpacing: 2,
  },
  heroLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 3,
    marginTop: 2,
  },

  // Identity
  spellName: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  fiveEIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  fiveESpellName: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 15,
    color: Colors.gold,
  },
  fiveEDot: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  fiveESchool: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.violet,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fiveELevel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  siteLine: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  creatorLine: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.lg,
  },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
    ...Shadow.card,
  },
  effectText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingVertical: Spacing.md,
  },
});
