/**
 * app/tabs/craft/seal.tsx
 * Step 3 — Confirm & Seal
 *
 * Shows a summary of what the user is about to seal, then calls POST /spells.
 * Handles the 409 duplicate fingerprint case gracefully.
 * On success navigates to the new spell's detail screen.
 *
 * Error handling (Phase 7):
 *  - 409 duplicate fingerprint → named alert with option to view existing spell
 *  - Network offline           → friendly message with back option
 *  - Other server errors       → generic alert
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { craftSpell } from '../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

const DURATION_LABELS: Record<string, string> = {
  instant: 'Instant',
  short: 'Short',
  long: 'Long',
  permanent: 'Permanent',
};

const RANGE_LABELS: Record<string, string> = {
  touch: 'Touch',
  near: 'Near',
  far: 'Far',
  vast: 'Vast',
};

export default function CraftSealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    site_id: string;
    site_name: string;
    site_spell_name: string;
    site_type: string;
    lat: string;
    lng: string;
    spell_name: string;
    expression_incantation: string;
    expression_delivery: string;
    expression_colour: string;
    expression_sound: string;
    expression_notes: string;
  }>();

  const [sealing, setSealing] = useState(false);

  async function handleSeal() {
    setSealing(true);
    try {
      const spell = await craftSpell({
        site_id: params.site_id,
        name: params.spell_name,
        expression_incantation: params.expression_incantation || undefined,
        expression_delivery: (params.expression_delivery as any) || undefined,
        expression_colour: params.expression_colour || undefined,
        expression_sound: params.expression_sound || undefined,
        expression_notes: params.expression_notes || undefined,
        lat: parseFloat(params.lat),
        lng: parseFloat(params.lng),
      });

      router.replace({
        pathname: '/tabs/spell/[id]',
        params: { id: spell.id, fromCraft: '1' },
      });
    } catch (err: any) {
      if (err.status === 409 && err.body?.existing_spell) {
        // ── Duplicate fingerprint ──────────────────────────────────────────
        const existing = err.body.existing_spell;
        Alert.alert(
          'Conditions Already Sealed',
          `These exact celestial conditions were already sealed by ${existing.creator_username} as "${existing.name}" (power ${existing.power_score}). Each fingerprint can only be sealed once.\n\nYou may return and try at a different time or site.`,
          [
            {
              text: 'View Existing Spell',
              onPress: () =>
                router.replace({
                  pathname: '/tabs/spell/[id]',
                  params: { id: existing.id },
                }),
            },
            { text: 'Go Back', style: 'cancel', onPress: () => router.back() },
          ]
        );
      } else if (err.isNetworkError) {
        // ── No connection ──────────────────────────────────────────────────
        Alert.alert(
          'No Connection',
          'Your working could not be sealed — the server is unreachable. Please check your connection and try again. Nothing has been recorded.',
          [{ text: 'Try Again', onPress: handleSeal }, { text: 'Go Back', onPress: () => router.back() }]
        );
      } else {
        // ── Other server error ─────────────────────────────────────────────
        Alert.alert(
          'Sealing Failed',
          err.message ?? 'An unexpected error occurred. Please try again.'
        );
      }
    } finally {
      setSealing(false);
    }
  }

  const hasExpressions =
    params.expression_incantation ||
    params.expression_delivery ||
    params.expression_colour ||
    params.expression_sound ||
    params.expression_notes;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Expression</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Step 3 of 3</Text>
      </View>

      <Text style={styles.title}>Confirm & Seal</Text>
      <Text style={styles.subtitle}>
        Review your working before it is permanently sealed into the record.
      </Text>

      {/* Site block */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Site</Text>
        <Text style={styles.cardPrimary}>{params.site_name}</Text>
        <Text style={styles.cardSecondary}>{params.site_spell_name}</Text>
      </View>

      {/* Spell name block */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Spell Name</Text>
        <Text style={styles.cardPrimary}>{params.spell_name}</Text>
      </View>

      {/* Expression block — only shown if at least one field filled */}
      {hasExpressions ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Expression</Text>
          {params.expression_incantation ? (
            <ExpressionRow label="Incantation" value={params.expression_incantation} />
          ) : null}
          {params.expression_delivery ? (
            <ExpressionRow
              label="Delivery"
              value={params.expression_delivery.charAt(0).toUpperCase() + params.expression_delivery.slice(1)}
            />
          ) : null}
          {params.expression_colour ? (
            <ExpressionRow label="Colour" value={params.expression_colour} />
          ) : null}
          {params.expression_sound ? (
            <ExpressionRow label="Sound" value={params.expression_sound} />
          ) : null}
          {params.expression_notes ? (
            <ExpressionRow label="Notes" value={params.expression_notes} />
          ) : null}
        </View>
      ) : null}

      {/* Celestial notice */}
      <View style={styles.celestialNotice}>
        <Ionicons name="moon-outline" size={14} color={Colors.goldDim} />
        <Text style={styles.celestialNoticeText}>
          Power, cost, duration, and range will be calculated from live celestial conditions at the
          moment of sealing.
        </Text>
      </View>

      {/* Seal button */}
      <TouchableOpacity
        style={[styles.sealButton, sealing && styles.sealButtonDisabled]}
        onPress={handleSeal}
        disabled={sealing}
        activeOpacity={0.85}
      >
        {sealing ? (
          <ActivityIndicator color={Colors.bg} size="small" />
        ) : (
          <>
            <Ionicons name="sparkles" size={16} color={Colors.bg} />
            <Text style={styles.sealButtonText}>Seal the Working</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Warning */}
      <Text style={styles.warning}>
        This action is permanent. A sealed spell cannot be deleted or modified.
      </Text>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function ExpressionRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.expressionRow}>
      <Text style={styles.expressionLabel}>{label}</Text>
      <Text style={styles.expressionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  stepLabel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 4,
    ...Shadow.card,
  },
  cardLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardPrimary: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  cardSecondary: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 14,
    color: Colors.gold,
  },
  expressionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expressionLabel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    width: 90,
    paddingTop: 2,
  },
  expressionValue: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  celestialNotice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: Colors.goldGlow,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  celestialNoticeText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },
  sealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  sealButtonDisabled: {
    opacity: 0.6,
  },
  sealButtonText: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.bg,
    letterSpacing: 1.5,
  },
  warning: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
});
