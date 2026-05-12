/**
 * app/tabs/transfer/receive.tsx
 * Transfer — Receive screen.
 *
 * Opens the device camera to scan a QR code from another Enchanter user.
 * On a valid scan, fetches a preview of the spell, then lets the user accept.
 * Phase 6: shows original spell stats alongside degraded "you will receive"
 * metrics before the recipient commits to accepting.
 *
 * Error handling (Phase 7):
 *  - Camera permission denied  → "Open Settings" button alongside "Grant Permission"
 *  - Network offline           → mapped in ERROR_MESSAGES, same error state as other failures
 *  - Token expired/used/banned → specific messages via ERROR_MESSAGES map
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  previewTransfer,
  acceptTransfer,
  TransferPreviewResponse,
  TransferAcceptResponse,
} from '../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

type ScreenState =
  | 'scanner'
  | 'previewing'
  | 'preview_ready'
  | 'accepting'
  | 'success'
  | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  token_expired:        'This transfer code has expired. Ask the sender to generate a new one.',
  token_used:           'This transfer code has already been used.',
  cannot_self_transfer: 'You cannot transfer a spell to yourself.',
  already_owned:        'You already have a copy of this spell in your Spellbook.',
  spell_banned:         'This spell has been flagged by the community and cannot be transferred.',
  network_unavailable:  'No connection. Please check your network and try again.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Quality helpers
// ─────────────────────────────────────────────────────────────────────────────

function qualityColour(quality: number): string {
  if (quality >= 0.85) return Colors.success;
  if (quality >= 0.70) return Colors.gold;
  if (quality >= 0.60) return '#c9843a';
  return Colors.error;
}

function qualityLabel(quality: number): string {
  if (quality >= 0.85) return 'Excellent';
  if (quality >= 0.70) return 'Good';
  if (quality >= 0.60) return 'Weakened';
  return 'Poor';
}

// ─────────────────────────────────────────────────────────────────────────────
// DegradedPreviewBlock — shown in preview_ready before accepting
// ─────────────────────────────────────────────────────────────────────────────

function DegradedPreviewBlock({
  original,
  transfer,
}: {
  original: { power_score: number; duration_tier: string; range_tier: string; cost: number };
  transfer: TransferPreviewResponse['transfer'];
}) {
  const qc  = qualityColour(transfer.quality);
  const pct = Math.round(transfer.quality * 100);

  return (
    <View style={degradedStyles.container}>
      <View style={degradedStyles.headerRow}>
        <Text style={degradedStyles.title}>You Will Receive</Text>
        <View style={[degradedStyles.badge, { borderColor: qc }]}>
          <Text style={[degradedStyles.badgePct, { color: qc }]}>{pct}%</Text>
          <Text style={[degradedStyles.badgeLabel, { color: qc }]}>
            {qualityLabel(transfer.quality)}
          </Text>
        </View>
      </View>

      <Text style={degradedStyles.sub}>
        Conditions at time of transfer affected this spell's potency
      </Text>

      <View style={degradedStyles.grid}>
        <CompareRow
          label="Power Score"
          original={original.power_score.toFixed(2)}
          degraded={transfer.degraded_power_score.toFixed(2)}
          colour={qc}
        />
        <CompareRow
          label="Duration"
          original={original.duration_tier}
          degraded={transfer.degraded_duration_tier}
          colour={qc}
        />
        <CompareRow
          label="Range"
          original={original.range_tier}
          degraded={transfer.degraded_range_tier}
          colour={qc}
        />
        <CompareRow
          label="Cost"
          original={String(original.cost)}
          degraded={String(transfer.degraded_cost)}
          colour={qc}
          last
        />
      </View>
    </View>
  );
}

function CompareRow({
  label,
  original,
  degraded,
  colour,
  last,
}: {
  label: string;
  original: string;
  degraded: string;
  colour: string;
  last?: boolean;
}) {
  const same = original === degraded;
  return (
    <View style={[degradedStyles.compareRow, !last && degradedStyles.compareRowBorder]}>
      <Text style={degradedStyles.compareLabel}>{label}</Text>
      <Text style={degradedStyles.compareOriginal}>
        {original.charAt(0).toUpperCase() + original.slice(1)}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={11}
        color={same ? Colors.textMuted : colour}
        style={{ marginHorizontal: Spacing.xs }}
      />
      <Text style={[degradedStyles.compareDegraded, { color: same ? Colors.textMuted : colour }]}>
        {degraded.charAt(0).toUpperCase() + degraded.slice(1)}
      </Text>
    </View>
  );
}

const degradedStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingBottom: Spacing.xs,
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  grid: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  compareRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compareLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    flex: 1,
    textTransform: 'uppercase',
  },
  compareOriginal: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  compareDegraded: {
    fontFamily: Typography.display,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function TransferReceiveScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [screen, setScreen]             = useState<ScreenState>('scanner');
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [preview, setPreview]           = useState<TransferPreviewResponse | null>(null);
  const [accepted, setAccepted]         = useState<TransferAcceptResponse | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  const scanLock = useRef(false);

  // ── Camera permission ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ── QR scan handler ────────────────────────────────────────────────────────

  const handleScan = useCallback(async ({ data }: { data: string }) => {
    if (scanLock.current || screen !== 'scanner') return;
    scanLock.current = true;

    const token = data.trim();
    setScannedToken(token);
    setScreen('previewing');

    try {
      const result = await previewTransfer(token);
      setPreview(result);
      setScreen('preview_ready');
    } catch (err: any) {
      const code = err.body?.error ?? '';
      setErrorMsg(ERROR_MESSAGES[code] ?? (err.message || 'Something went wrong. Please try again.'));
      setScreen('error');
    }
  }, [screen]);

  // ── Accept handler ─────────────────────────────────────────────────────────

  const handleAccept = useCallback(async () => {
    if (!scannedToken) return;
    setScreen('accepting');

    try {
      const result = await acceptTransfer(scannedToken);
      setAccepted(result);
      setScreen('success');
    } catch (err: any) {
      const code = err.body?.error ?? '';
      setErrorMsg(ERROR_MESSAGES[code] ?? (err.message || 'Transfer failed. Please try again.'));
      setScreen('error');
    }
  }, [scannedToken]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetToScanner = useCallback(() => {
    scanLock.current = false;
    setScannedToken(null);
    setPreview(null);
    setAccepted(null);
    setErrorMsg(null);
    setScreen('scanner');
  }, []);

  // ── Open device settings (camera permissions) ──────────────────────────────

  function openSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render — scanner
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === 'scanner') {
    if (!permission) {
      return (
        <View style={styles.centred}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centred}>
          <Ionicons name="camera-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.permissionText}>
            Camera access is needed to scan transfer codes.
          </Text>
          {/* Only show "Grant Permission" if the system prompt hasn't been
              permanently denied — canAskAgain is false after a hard denial */}
          {permission.canAskAgain ? (
            <TouchableOpacity onPress={requestPermission} style={styles.actionBtn}>
              <Ionicons name="camera-outline" size={16} color={Colors.gold} />
              <Text style={styles.actionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={[styles.permissionText, { marginTop: Spacing.sm }]}>
                Permission was denied. Open Settings to allow camera access for Enchanter.
              </Text>
              <TouchableOpacity onPress={openSettings} style={styles.actionBtn}>
                <Ionicons name="settings-outline" size={16} color={Colors.gold} />
                <Text style={styles.actionBtnText}>Open Settings</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => router.back()} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={styles.scannerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.white} />
            <Text style={[styles.navBackText, { color: Colors.white }]}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>Scan Code</Text>
          <View style={{ width: 60 }} />
        </View>

        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />

        <View style={styles.scannerOverlay} pointerEvents="none">
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>
            Point at the sender's Enchanter QR code
          </Text>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render — loading states
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === 'previewing' || screen === 'accepting') {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.gold} size="large" />
        <Text style={styles.loadingText}>
          {screen === 'previewing' ? 'Reading spell…' : 'Completing transfer…'}
        </Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render — error
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === 'error') {
    return (
      <View style={[styles.centred, { paddingHorizontal: Spacing.xl }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.navBackText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Ionicons name="warning-outline" size={40} color={Colors.error} />
        <Text style={styles.errorTitle}>Transfer Failed</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity onPress={resetToScanner} style={styles.actionBtn}>
          <Ionicons name="scan-outline" size={16} color={Colors.gold} />
          <Text style={styles.actionBtnText}>Scan Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render — success
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === 'success' && accepted) {
    const qc = qualityColour(accepted.transfer_quality ?? 0.9);
    const pct = accepted.transfer_quality ? Math.round(accepted.transfer_quality * 100) : null;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successHeader}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
          <Text style={styles.successTitle}>Spell Received</Text>
          <Text style={styles.successSub}>
            Added to your Spellbook from {accepted.transferred_from}
            {pct ? ` · ${pct}% quality` : ''}
          </Text>
        </View>

        <SpellPreviewCard spell={accepted} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            router.replace({
              pathname: '/tabs/spell/[id]',
              params: { id: accepted.id },
            })
          }
        >
          <Ionicons name="book-outline" size={16} color={Colors.gold} />
          <Text style={styles.actionBtnText}>View in Spellbook</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/tabs/spellbook')} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Go to Spellbook</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render — preview_ready
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === 'preview_ready' && preview) {
    const { spell, from_username, expires_at, transfer } = preview;
    const expiresIn = Math.max(
      0,
      Math.floor((new Date(expires_at).getTime() - Date.now()) / 1000)
    );
    const mins = Math.floor(expiresIn / 60);
    const secs = expiresIn % 60;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nav}>
          <TouchableOpacity onPress={resetToScanner} style={styles.navBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.navBackText}>Scan Again</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewHeader}>
          <Text style={styles.previewFrom}>
            <Text style={styles.previewFromName}>{from_username}</Text>
            {' '}wants to transfer a spell
          </Text>
          <Text style={styles.previewExpiry}>
            Code expires in {mins}m {String(secs).padStart(2, '0')}s
          </Text>
        </View>

        <SectionHeader title="Original Spell" />
        <SpellPreviewCard spell={spell} />

        {transfer && (
          <DegradedPreviewBlock
            original={{
              power_score:   spell.power_score,
              duration_tier: spell.duration_tier,
              range_tier:    spell.range_tier,
              cost:          spell.cost,
            }}
            transfer={transfer}
          />
        )}

        {spell.lineage && spell.lineage.length > 0 && (
          <>
            <SectionHeader title="Lineage" />
            <View style={styles.lineageCard}>
              <View style={styles.lineageOriginRow}>
                <Ionicons name="sparkles-outline" size={13} color={Colors.goldDim} />
                <Text style={styles.lineageOriginText}>
                  Crafted by {spell.creator_username}
                </Text>
              </View>
              {spell.lineage.map((t) => (
                <View key={t.id} style={styles.lineageTransferRow}>
                  <Ionicons name="arrow-forward-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.lineageTransferText}>
                    {t.from_username} → {t.to_username}
                  </Text>
                  <Text style={styles.lineageDate}>
                    {new Date(t.transferred_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity onPress={handleAccept} style={styles.acceptBtn} activeOpacity={0.8}>
          <Ionicons name="git-branch-outline" size={18} color={Colors.bg} />
          <Text style={styles.acceptBtnText}>Accept Spell</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetToScanner} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          The received copy reflects conditions at the time of transfer. Original crafting lineage is preserved.
        </Text>

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SpellPreviewCard
// ─────────────────────────────────────────────────────────────────────────────

function SpellPreviewCard({ spell }: { spell: any }) {
  return (
    <View style={previewCardStyles.card}>
      <View style={previewCardStyles.hero}>
        <Text style={previewCardStyles.powerScore}>
          {spell.power_score?.toFixed(2) ?? '—'}
        </Text>
        <Text style={previewCardStyles.powerLabel}>Power Score</Text>
      </View>

      <Text style={previewCardStyles.spellName}>{spell.name}</Text>
      <Text style={previewCardStyles.spellType}>
        {spell.site_spell_name ?? spell.site_name}
      </Text>
      {spell.site_name && spell.site_spell_name && (
        <Text style={previewCardStyles.siteName}>{spell.site_name}</Text>
      )}

      <View style={previewCardStyles.divider} />

      <View style={previewCardStyles.statsRow}>
        <MiniStat label="Duration" value={spell.duration_tier} />
        <MiniStat label="Range"    value={spell.range_tier} />
        <MiniStat label="Cost"     value={String(spell.cost)} />
      </View>

      {spell.effect_description && (
        <>
          <View style={previewCardStyles.divider} />
          <Text style={previewCardStyles.effectText}>{spell.effect_description}</Text>
        </>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={previewCardStyles.miniStat}>
      <Text style={previewCardStyles.miniStatValue}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </Text>
      <Text style={previewCardStyles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const previewCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  powerScore: {
    fontFamily: Typography.display,
    fontSize: 44,
    color: Colors.gold,
    letterSpacing: 2,
  },
  powerLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  spellName: {
    fontFamily: Typography.display,
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  spellType: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 15,
    color: Colors.gold,
    textAlign: 'center',
    marginTop: 2,
  },
  siteName: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    fontFamily: Typography.display,
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  miniStatLabel: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  effectText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={sectionStyles.header}>{title}</Text>;
}

const sectionStyles = StyleSheet.create({
  header: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
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
  centred: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
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
  scannerNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(14,11,24,0.6)',
  },
  scannerTitle: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Colors.white,
    letterSpacing: 2,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 80,
    gap: Spacing.xl,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  scanHint: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.white,
    textAlign: 'center',
    maxWidth: 240,
  },
  previewHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  previewFrom: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  previewFromName: {
    color: Colors.textPrimary,
    fontFamily: Typography.display,
  },
  previewExpiry: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  lineageCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  lineageOriginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineageOriginText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lineageTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineageTransferText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  lineageDate: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.md,
  },
  acceptBtnText: {
    fontFamily: Typography.display,
    fontSize: 16,
    color: Colors.bg,
    letterSpacing: 1.5,
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
  },
  actionBtnText: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 1,
  },
  ghostBtn: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  ghostBtnText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  successHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  successTitle: {
    fontFamily: Typography.display,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  successSub: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  permissionText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  loadingText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorTitle: {
    fontFamily: Typography.display,
    fontSize: 20,
    color: Colors.error,
    letterSpacing: 1,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  note: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});
