/**
 * app/tabs/spell/[id].tsx
 * Spell Detail screen — Phase 4 update.
 *
 * Changes from Phase 3:
 *   • Ban banner shown above hero when is_banned = true
 *   • Bookmark button added to nav bar (right of share)
 *   • Vote row (up / down with live counts) inserted below the sealed row
 *   • All vote / bookmark state is optimistic — UI updates instantly,
 *     rolls back silently on error
 */
import { useAuth } from '../../../hooks/useAuth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getSpell,
  voteSpell,
  removeVote,
  bookmarkSpell,
  removeBookmark,
  Spell,
  VoteDirection,
} from '../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Label maps (unchanged from Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

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

const LUNAR_LABELS: Record<string, string> = {
  new: 'New Moon',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full: 'Full Moon',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
};

const TOD_LABELS: Record<string, string> = {
  dawn: 'Dawn',
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  dusk: 'Dusk',
  evening: 'Evening',
  midnight: 'Midnight',
  night: 'Night',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SpellDetailScreen() {
  const router = useRouter();
  const { id, fromCraft } = useLocalSearchParams<{ id: string; fromCraft?: string }>();

  // ── Spell load ───────────────────────────────────────────────────────────
  const [spell, setSpell]     = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Phase 4 state ────────────────────────────────────────────────────────
  // Initialised from the spell once loaded; updated optimistically thereafter.
  const [upvotes, setUpvotes]       = useState(0);
  const [downvotes, setDownvotes]   = useState(0);
  const [isBanned, setIsBanned]     = useState(false);
  const [userVote, setUserVote]     = useState<VoteDirection | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
const { session } = useAuth();
const isOwnSpell = spell?.creator_id === session?.user?.id;

  // Prevent double-tapping while a vote/bookmark request is in flight
  const [voteLocked, setVoteLocked]         = useState(false);
  const [bookmarkLocked, setBookmarkLocked] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSpell(id)
      .then((s) => {
        setSpell(s);
        setUpvotes(s.upvotes);
        setDownvotes(s.downvotes);
        setIsBanned(s.is_banned);
        // The API doesn't return user_vote or bookmarked on the spell object yet —
        // these will be wired up once those fields are added to GET /spells/:id.
        // For now they default to null / false (safe defaults).
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Vote handler ─────────────────────────────────────────────────────────

  async function handleVote(direction: VoteDirection) {
    if (voteLocked || !spell) return;
    setVoteLocked(true);

    const prevVote     = userVote;
    const prevUpvotes  = upvotes;
    const prevDownvotes = downvotes;
    const prevBanned   = isBanned;

    try {
      if (userVote === direction) {
        // Tapping the same direction again removes the vote
        setUserVote(null);
        if (direction === 'up')   setUpvotes(v => Math.max(0, v - 1));
        if (direction === 'down') setDownvotes(v => Math.max(0, v - 1));

        const res = await removeVote(spell.id);
        setUpvotes(res.upvotes);
        setDownvotes(res.downvotes);
        setIsBanned(res.is_banned);
      } else {
        // New vote or changed direction
        const wasOpposite = userVote !== null;
        setUserVote(direction);
        if (direction === 'up') {
          setUpvotes(v => v + 1);
          if (wasOpposite) setDownvotes(v => Math.max(0, v - 1));
        } else {
          setDownvotes(v => v + 1);
          if (wasOpposite) setUpvotes(v => Math.max(0, v - 1));
        }

        const res = await voteSpell(spell.id, direction);
        setUpvotes(res.upvotes);
        setDownvotes(res.downvotes);
        setIsBanned(res.is_banned);
        setUserVote(res.user_vote);
      }
    } catch {
      // Roll back
      setUserVote(prevVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setIsBanned(prevBanned);
    } finally {
      setVoteLocked(false);
    }
  }

  // ── Bookmark handler ─────────────────────────────────────────────────────

  async function handleBookmark() {
    if (bookmarkLocked || !spell) return;
    setBookmarkLocked(true);

    const prev = bookmarked;
    setBookmarked(!prev);

    try {
      if (prev) {
        await removeBookmark(spell.id);
      } else {
        await bookmarkSpell(spell.id);
      }
    } catch {
      setBookmarked(prev); // roll back
    } finally {
      setBookmarkLocked(false);
    }
  }

  // ── Share ────────────────────────────────────────────────────────────────

  async function handleShare() {
    if (!spell) return;
    try {
      await Share.share({
        message: `"${spell.name}" — sealed at ${spell.site_name} with power ${spell.power_score?.toFixed(2)}`,
      });
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / error states
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (error || !spell) {
    return (
      <View style={styles.centred}>
        <Ionicons name="warning-outline" size={32} color={Colors.error} />
        <Text style={styles.errorText}>{error ?? 'Spell not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived display values
  // ─────────────────────────────────────────────────────────────────────────

  const powerFormatted = spell.power_score?.toFixed(2) ?? '—';
  const craftedDate = new Date(spell.crafted_at).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const craftedTime = new Date(spell.crafted_at).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  const hasExpression =
    spell.expression_incantation ||
    spell.expression_delivery ||
    spell.expression_colour ||
    spell.expression_sound ||
    spell.expression_notes;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Nav bar ───────────────────────────────────────────────────── */}
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={() => (fromCraft ? router.replace('/tabs/spellbook') : router.back())}
          style={styles.navBack}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.navBackText}>{fromCraft ? 'Spellbook' : 'Back'}</Text>
        </TouchableOpacity>

        {/* Right side: bookmark + share */}
        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={handleBookmark}
            style={styles.navIconBtn}
            disabled={bookmarkLocked}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarked ? Colors.gold : Colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.navIconBtn}>
            <Ionicons name="share-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Ban banner (Phase 4) ──────────────────────────────────────── */}
      {isBanned && (
        <View style={styles.banBanner}>
          <Ionicons name="ban" size={14} color={Colors.error} />
          <View style={styles.banTextGroup}>
            <Text style={styles.banTitle}>Community Flagged</Text>
            <Text style={styles.banSub}>
              This spell has received enough downvotes to be removed from the Library.
            </Text>
          </View>
        </View>
      )}

      {/* ── Hero — power score ─────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.powerScore}>{powerFormatted}</Text>
        <Text style={styles.powerLabel}>Power Score</Text>
      </View>

      {/* ── Spell name + site ─────────────────────────────────────────── */}
      <Text style={styles.spellName}>{spell.name}</Text>
      <Text style={styles.siteName}>{spell.site_spell_name ?? spell.site_name}</Text>
      {spell.site_name && spell.site_spell_name && (
        <Text style={styles.siteLocation}>{spell.site_name}</Text>
      )}

      {/* ── Sealed by / when ──────────────────────────────────────────── */}
      <View style={styles.sealedRow}>
        <Text style={styles.sealedBy}>Sealed by {spell.creator_username}</Text>
        <Text style={styles.sealedDate}>{craftedDate} · {craftedTime}</Text>
      </View>

      {/* ── Vote row (Phase 4) ────────────────────────────────────────── */}
      <View style={styles.voteRow}>
        {/* Upvote */}
        <TouchableOpacity
          style={[styles.voteBtn, userVote === 'up' && styles.voteBtnUpActive]}
          onPress={() => handleVote('up')}
          disabled={voteLocked}
          activeOpacity={0.75}
        >
          <Ionicons
            name={userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
            size={20}
            color={userVote === 'up' ? Colors.success : Colors.textMuted}
          />
          <Text style={[styles.voteCount, userVote === 'up' && styles.voteCountUp]}>
            {upvotes}
          </Text>
        </TouchableOpacity>

        <View style={styles.voteDivider} />

        {/* Downvote */}
        <TouchableOpacity
          style={[styles.voteBtn, userVote === 'down' && styles.voteBtnDownActive]}
          onPress={() => handleVote('down')}
          disabled={voteLocked}
          activeOpacity={0.75}
        >
          <Ionicons
            name={userVote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
            size={20}
            color={userVote === 'down' ? Colors.error : Colors.textMuted}
          />
          <Text style={[styles.voteCount, userVote === 'down' && styles.voteCountDown]}>
            {downvotes}
          </Text>
        </TouchableOpacity>
      </View>
{/* ── Transfer button (Phase 5) ───────────────────────────────── */}
{isOwnSpell && (
  <TouchableOpacity
    style={styles.transferBtn}
    onPress={() =>
      router.push({
        pathname: '/tabs/transfer/send/[spellId]',
        params: { spellId: spell!.id },
      })
    }
    activeOpacity={0.8}
  >
    <Ionicons name="git-branch-outline" size={16} color={Colors.gold} />
    <Text style={styles.transferBtnText}>Transfer Spell</Text>
  </TouchableOpacity>
)}
      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatBlock label="Duration" value={DURATION_LABELS[spell.duration_tier] ?? spell.duration_tier} />
        <View style={styles.statDivider} />
        <StatBlock label="Range" value={RANGE_LABELS[spell.range_tier] ?? spell.range_tier} />
        <View style={styles.statDivider} />
        <StatBlock label="Cost" value={spell.cost?.toFixed(1) ?? '—'} />
        <View style={styles.statDivider} />
        <StatBlock label="Focus" value={spell.concentration ? 'Yes' : 'No'} />
      </View>

      {/* ── Celestial conditions ──────────────────────────────────────── */}
      <SectionHeader title="Celestial Conditions" icon="moon-outline" />
      <View style={styles.card}>
        <ConditionRow label="Lunar" value={LUNAR_LABELS[spell.lunar_slot] ?? spell.lunar_slot} />
        <ConditionRow
          label={spell.site_type === 'coastal' ? 'Pressure' : 'Solar (Kp)'}
          value={spell.geo_slot?.replace(/_/g, ' ') ?? '—'}
        />
        <ConditionRow label="Time of Day" value={TOD_LABELS[spell.tod_slot] ?? spell.tod_slot} />
        <ConditionRow
          label="Season"
          value={spell.season ? spell.season.charAt(0).toUpperCase() + spell.season.slice(1) : '—'}
          last={!spell.calendar_event}
        />
        {spell.calendar_event && (
          <ConditionRow label="Calendar Event" value={spell.calendar_event} last />
        )}
      </View>

      {/* ── Coefficients ──────────────────────────────────────────────── */}
      {spell.coefficients && (
        <>
          <SectionHeader title="Coefficients" icon="analytics-outline" />
          <View style={styles.card}>
            <ConditionRow label="Lunar"       value={spell.coefficients.lunar.toFixed(3)} />
            <ConditionRow label="Geo"         value={spell.coefficients.geo.toFixed(3)} />
            <ConditionRow label="Time of Day" value={spell.coefficients.tod.toFixed(3)} />
            <ConditionRow label="Season Bonus" value={`+${spell.coefficients.season_bonus.toFixed(3)}`} last />
          </View>
        </>
      )}

      {/* ── Expression ────────────────────────────────────────────────── */}
      {hasExpression && (
        <>
          <SectionHeader title="Expression" icon="mic-outline" />
          <View style={styles.card}>
            {spell.expression_incantation && (
              <ConditionRow label="Incantation" value={spell.expression_incantation} />
            )}
            {spell.expression_delivery && (
              <ConditionRow
                label="Delivery"
                value={spell.expression_delivery.charAt(0).toUpperCase() + spell.expression_delivery.slice(1)}
              />
            )}
            {spell.expression_colour && (
              <ConditionRow label="Colour" value={spell.expression_colour} />
            )}
            {spell.expression_sound && (
              <ConditionRow label="Sound" value={spell.expression_sound} />
            )}
            {spell.expression_notes && (
              <ConditionRow label="Notes" value={spell.expression_notes} last />
            )}
          </View>
        </>
      )}

      {/* ── Effect ────────────────────────────────────────────────────── */}
      {spell.effect_description && (
        <>
          <SectionHeader title="Effect" icon="sparkles-outline" />
          <View style={styles.card}>
            <Text style={styles.effectText}>{spell.effect_description}</Text>
          </View>
        </>
      )}

      {/* ── Lineage ───────────────────────────────────────────────────── */}
      {spell.lineage && spell.lineage.length > 0 && (
        <>
          <SectionHeader title="Lineage" icon="git-branch-outline" badge={spell.lineage.length} />
          <View style={styles.card}>
            {spell.lineage.map((transfer, i) => (
              <View
                key={transfer.id}
                style={[styles.lineageRow, i < spell.lineage!.length - 1 && styles.lineageRowBorder]}
              >
                <Text style={styles.lineageText}>
                  {transfer.from_username} → {transfer.to_username}
                </Text>
                <Text style={styles.lineageDate}>
                  {new Date(transfer.transferred_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Fingerprint ───────────────────────────────────────────────── */}
      <SectionHeader title="Fingerprint" icon="finger-print-outline" />
      <View style={styles.card}>
        <Text style={styles.fingerprintText} selectable>
          {spell.fingerprint_hash}
        </Text>
      </View>

      <View style={{ height: Spacing.xxl * 2 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (unchanged from Phase 3 unless noted)
// ─────────────────────────────────────────────────────────────────────────────

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, icon, badge }: { title: string; icon: string; badge?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={Colors.goldDim} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {badge != null && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function ConditionRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.conditionRow, !last && styles.conditionRowBorder]}>
      <Text style={styles.conditionLabel}>{label}</Text>
      <Text style={styles.conditionValue}>{value}</Text>
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
 transferBtn: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     gap: Spacing.sm,
     borderWidth: 1,
     borderColor: Colors.gold,
     borderRadius: Radius.md,
     paddingVertical: Spacing.md,
     marginBottom: Spacing.xl,
     backgroundColor: Colors.goldGlow,
   },
   transferBtnText: {
     fontFamily: Typography.display,
     fontSize: 14,
     color: Colors.gold,
     letterSpacing: 1,
   },
  },

  // ── Nav ─────────────────────────────────────────────────────────────────
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: Spacing.lg,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navBackText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  navIconBtn: {
    padding: 4,
  },

  // ── Ban banner ───────────────────────────────────────────────────────────
  banBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(199,91,91,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(199,91,91,0.3)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  banTextGroup: {
    flex: 1,
    gap: 2,
  },
  banTitle: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.error,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  banSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  powerScore: {
    fontFamily: Typography.display,
    fontSize: 56,
    color: Colors.gold,
    letterSpacing: 2,
  },
  powerLabel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // ── Spell identity ───────────────────────────────────────────────────────
  spellName: {
    fontFamily: Typography.display,
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  siteName: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 17,
    color: Colors.gold,
    textAlign: 'center',
  },
  siteLocation: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  sealedRow: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 2,
  },
  sealedBy: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  sealedDate: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  // ── Vote row (Phase 4) ───────────────────────────────────────────────────
  voteRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  voteBtnUpActive: {
    backgroundColor: 'rgba(91,140,90,0.12)',
  },
  voteBtnDownActive: {
    backgroundColor: 'rgba(199,91,91,0.1)',
  },
  voteDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  voteCount: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  voteCountUp: {
    color: Colors.success,
  },
  voteCountDown: {
    color: Colors.error,
  },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    ...Shadow.card,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontFamily: Typography.display,
    fontSize: 14,
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

  // ── Section header ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: Colors.goldGlow,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  badgeText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.gold,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  conditionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  conditionLabel: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    paddingTop: 1,
  },
  conditionValue: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  effectText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    padding: Spacing.md,
  },

  // ── Lineage ──────────────────────────────────────────────────────────────
  lineageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  lineageRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineageText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  lineageDate: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ── Fingerprint ──────────────────────────────────────────────────────────
  fingerprintText: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    padding: Spacing.md,
    lineHeight: 16,
  },

  // ── Error / back ─────────────────────────────────────────────────────────
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
  errorText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.error,
  },
});
