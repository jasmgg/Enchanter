/**
 * app/tabs/transfer/send/[spellId].tsx
 * Transfer — Send screen.
 *
 * Generates a transfer token for the given spell and displays it as a QR code.
 * Shows a live 15-minute countdown.  Expired tokens can be regenerated.
 * Phase 6: shows transfer quality block — conditions matched vs site affinities,
 * and the degraded metrics the recipient will receive.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import QRCode from 'react-native-qrcode-svg';
import {
  generateTransfer,
  TransferGenerateResponse,
  TransferDegradation,
} from '../../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../../constants/theme';

const TOKEN_TTL_MS = 15 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Quality block
// ─────────────────────────────────────────────────────────────────────────────

function qualityColour(quality: number): string {
  if (quality >= 0.85) return Colors.success;
  if (quality >= 0.70) return Colors.gold;
  if (quality >= 0.60) return '#c9843a'; // amber-orange
  return Colors.error;
}

function qualityLabel(quality: number): string {
  if (quality >= 0.85) return 'Excellent';
  if (quality >= 0.70) return 'Good';
  if (quality >= 0.60) return 'Weakened';
  return 'Poor';
}

function AxisRow({
  label,
  matched,
}: {
  label: string;
  matched: boolean;
}) {
  return (
    <View style={qualityStyles.axisRow}>
      <Text style={[qualityStyles.axisIcon, { color: matched ? Colors.gold : Colors.textMuted }]}>
        {matched ? '✦' : '◇'}
      </Text>
      <Text style={[qualityStyles.axisLabel, { color: matched ? Colors.textSecondary : Colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[qualityStyles.axisStatus, { color: matched ? Colors.gold : Colors.textMuted }]}>
        {matched ? 'aligned' : 'off'}
      </Text>
    </View>
  );
}

function TransferQualityBlock({ transfer }: { transfer: TransferDegradation }) {
  const qc = qualityColour(transfer.quality);
  const pct = Math.round(transfer.quality * 100);

  return (
    <View style={qualityStyles.container}>
      {/* Header row */}
      <View style={qualityStyles.headerRow}>
        <Text style={qualityStyles.title}>Transfer Quality</Text>
        <View style={[qualityStyles.badge, { borderColor: qc }]}>
          <Text style={[qualityStyles.badgePct, { color: qc }]}>{pct}%</Text>
          <Text style={[qualityStyles.badgeLabel, { color: qc }]}>
            {qualityLabel(transfer.quality)}
          </Text>
        </View>
      </View>

      <Text style={qualityStyles.sub}>
        Conditions matched at time of generation
      </Text>

      {/* Axis indicators */}
      <View style={qualityStyles.axisBlock}>
        <AxisRow label="Lunar"  matched={transfer.axis_detail.lunar}  />
        <AxisRow label="Geo"    matched={transfer.axis_detail.geo}    />
        <AxisRow label="Time"   matched={transfer.axis_detail.tod}    />
        <AxisRow label="Season" matched={transfer.axis_detail.season} />
      </View>

      {/* Divider */}
      <View style={qualityStyles.divider} />

      {/* Recipient gets */}
      <Text style={qualityStyles.recipientLabel}>RECIPIENT RECEIVES</Text>
      <View style={qualityStyles.statsRow}>
        <DegradedStat
          label="Power"
          value={transfer.degraded_power_score.toFixed(2)}
          colour={qc}
        />
        <DegradedStat
          label="Duration"
          value={transfer.degraded_duration_tier}
        />
        <DegradedStat
          label="Range"
          value={transfer.degraded_range_tier}
        />
        <DegradedStat
          label="Cost"
          value={String(transfer.degraded_cost)}
        />
      </View>
    </View>
  );
}

function DegradedStat({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour?: string;
}) {
  return (
    <View style={qualityStyles.stat}>
      <Text style={[qualityStyles.statValue, colour ? { color: colour } : {}]}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </Text>
      <Text style={qualityStyles.statLabel}>{label}</Text>
    </View>
  );
}

const qualityStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgePct: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  badgeLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  sub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  axisBlock: {
    gap: 2,
    marginBottom: Spacing.sm,
  },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  axisIcon: {
    fontSize: 10,
    width: 12,
    textAlign: 'center',
  },
  axisLabel: {
    fontFamily: Typography.body,
    fontSize: 13,
    flex: 1,
  },
  axisStatus: {
    fontFamily: Typography.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  recipientLabel: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.display,
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function TransferSendScreen() {
  const router = useRouter();
  const { spellId } = useLocalSearchParams<{ spellId: string }>();

  const [transfer, setTransfer]       = useState<TransferGenerateResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_TTL_MS / 1000);
  const [expired, setExpired]         = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Generate token ─────────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!spellId) return;
    setLoading(true);
    setError(null);
    setExpired(false);

    try {
      const result = await generateTransfer(spellId);
      setTransfer(result);

      const expiresAt = new Date(result.expires_at).getTime();
      const tick = () => {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) {
          setExpired(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      };
      tick();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, 1000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to generate transfer token');
    } finally {
      setLoading(false);
    }
  }, [spellId]);

  useEffect(() => {
    generate();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generate]);

  // ── Countdown ──────────────────────────────────────────────────────────────

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdownStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const urgency = secondsLeft < 60;

  // ── Render ─────────────────────────────────────────────────────────────────

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

      {/* Header */}
      <View style={styles.headerBlock}>
        <Ionicons name="git-branch-outline" size={28} color={Colors.gold} />
        <Text style={styles.title}>Transfer Spell</Text>
        <Text style={styles.subtitle}>
          Ask the recipient to scan this code with their Enchanter app
        </Text>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={styles.loadingText}>Conjuring token…</Text>
        </View>
      ) : error ? (
        <View style={styles.centred}>
          <Ionicons name="warning-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={generate} style={styles.actionBtn}>
            <Ionicons name="refresh" size={16} color={Colors.gold} />
            <Text style={styles.actionBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : transfer ? (
        <>
          {/* Spell info */}
          <View style={styles.spellInfo}>
            <Text style={styles.spellName}>{transfer.spell.name}</Text>
            <Text style={styles.spellType}>{transfer.spell.site_spell_name}</Text>
            <View style={styles.powerBadge}>
              <Text style={styles.powerText}>
                {transfer.spell.power_score.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* QR code */}
          <View style={[styles.qrContainer, expired && styles.qrContainerExpired]}>
            {expired ? (
              <View style={styles.expiredOverlay}>
                <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.expiredText}>Token Expired</Text>
              </View>
            ) : (
              <QRCode
                value={transfer.token}
                size={220}
                color={Colors.textPrimary}
                backgroundColor={Colors.bgCard}
              />
            )}
          </View>

          {/* Countdown */}
          <View style={styles.countdownRow}>
            <Ionicons
              name="timer-outline"
              size={14}
              color={urgency ? Colors.error : Colors.textMuted}
            />
            <Text style={[styles.countdown, urgency && styles.countdownUrgent]}>
              {expired ? 'Expired' : `Expires in ${countdownStr}`}
            </Text>
          </View>

          {/* Regenerate */}
          {expired && (
            <TouchableOpacity onPress={generate} style={styles.actionBtn}>
              <Ionicons name="refresh" size={16} color={Colors.gold} />
              <Text style={styles.actionBtnText}>Generate New Code</Text>
            </TouchableOpacity>
          )}

          {/* Transfer quality block */}
          {!expired && transfer.transfer && (
            <TransferQualityBlock transfer={transfer.transfer} />
          )}

          {/* Instructions */}
          {!expired && (
            <View style={styles.instructionCard}>
              <InstructionStep
                n="1"
                text="Show this QR code to the person you want to transfer the spell to."
              />
              <InstructionStep
                n="2"
                text="They open Enchanter, tap the scan icon, and point their camera at the code."
              />
              <InstructionStep
                n="3"
                text="Once they accept, the spell appears in their Spellbook. The transfer is recorded in the spell's lineage."
                last
              />
            </View>
          )}

          {/* Note */}
          <Text style={styles.note}>
            You keep your copy of the spell after transferring.
          </Text>
        </>
      ) : null}

      <View style={{ height: Spacing.xxl * 2 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InstructionStep({
  n,
  text,
  last,
}: {
  n: string;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[instructionStyles.row, !last && instructionStyles.rowBorder]}>
      <View style={instructionStyles.bubble}>
        <Text style={instructionStyles.bubbleText}>{n}</Text>
      </View>
      <Text style={instructionStyles.text}>{text}</Text>
    </View>
  );
}

const instructionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bubble: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubbleText: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.gold,
  },
  text: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
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
  headerBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  centred: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
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
  spellInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  spellName: {
    fontFamily: Typography.display,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  spellType: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 15,
    color: Colors.gold,
  },
  powerBadge: {
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    marginTop: Spacing.xs,
  },
  powerText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.gold,
  },
  qrContainer: {
    alignSelf: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  qrContainerExpired: {
    opacity: 0.4,
  },
  expiredOverlay: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  expiredText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  countdown: {
    fontFamily: Typography.mono,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  countdownUrgent: {
    color: Colors.error,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: Colors.goldGlow,
    marginBottom: Spacing.lg,
  },
  actionBtnText: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 1,
  },
  instructionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  note: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
