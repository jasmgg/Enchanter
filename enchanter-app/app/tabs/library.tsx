/**
 * app/tabs/library.tsx
 *
 * Global spell library — search, filter, sort, paginated.
 * Phase 6 implementation.
 *
 * Endpoints used:
 *   GET /api/v1/spells        — paginated library with filters/sort
 *   GET /api/v1/sites         — site list for filter picker
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { request } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LibrarySpell {
  id: string;
  name: string;
  power_score: number;
  cost: number;
  duration_tier: string;
  range_tier: string;
  concentration: boolean;
  upvotes: number;
  downvotes: number;
  is_banned: boolean;
  event_modifier: string | null;
  crafted_at: string;
  creator_username: string;
  site_name: string;
  spell_name: string;
  region: string;
  site_type: 'coastal' | 'landlocked';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface Site {
  id: string;
  name: string;
  region: string;
}

type SortOption = 'power_score_desc' | 'power_score_asc' | 'date_desc' | 'date_asc' | 'upvotes_desc';
type DurationFilter = '' | 'instant' | 'short' | 'long' | 'permanent';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'power_score_desc', label: 'Power (high → low)' },
  { value: 'power_score_asc',  label: 'Power (low → high)' },
  { value: 'date_desc',        label: 'Newest first' },
  { value: 'date_asc',         label: 'Oldest first' },
  { value: 'upvotes_desc',     label: 'Most upvoted' },
];

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: '',          label: 'Any duration' },
  { value: 'instant',   label: 'Instant' },
  { value: 'short',     label: 'Short' },
  { value: 'long',      label: 'Long' },
  { value: 'permanent', label: 'Permanent' },
];

const PAGE_LIMIT = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function scoreColour(score: number): string {
  if (score >= 8) return '#c9603a'; // fiery — powerful
  if (score >= 6) return Colors.gold;
  if (score >= 4) return Colors.goldDim;
  return Colors.textSecondary;
}

// ─────────────────────────────────────────────────────────────────────────────
// SpellCard
// ─────────────────────────────────────────────────────────────────────────────

function SpellCard({ spell, onPress }: { spell: LibrarySpell; onPress: () => void }) {
  const sc = scoreColour(spell.power_score);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Ban ribbon */}
      {spell.is_banned && (
        <View style={styles.banRibbon}>
          <Text style={styles.banRibbonText}>BANNED</Text>
        </View>
      )}

      {/* Row 1: name + score badge */}
      <View style={styles.cardRow}>
        <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="tail">
          {spell.name}
        </Text>
        <View style={[styles.scoreBadge, { borderColor: sc }]}>
          <Text style={[styles.scoreText, { color: sc }]}>
            {spell.power_score.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Row 2: spell type (italic gold) + creator */}
      <View style={styles.cardRow}>
        <Text style={styles.cardSpellType}>{spell.spell_name}</Text>
        <Text style={styles.cardCreator}>by {spell.creator_username}</Text>
      </View>

      {/* Row 3: site name */}
      <Text style={styles.cardSite} numberOfLines={1}>
        {spell.site_name}
        {spell.region ? ` · ${spell.region}` : ''}
      </Text>

      {/* Row 4: pills + date */}
      <View style={[styles.cardRow, { marginTop: Spacing.sm }]}>
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillIcon}>◷</Text>
            <Text style={styles.pillText}>{spell.duration_tier}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillIcon}>↗</Text>
            <Text style={styles.pillText}>{spell.range_tier}</Text>
          </View>
          {spell.concentration && (
            <View style={[styles.pill, styles.pillConc]}>
              <Text style={styles.pillText}>conc.</Text>
            </View>
          )}
          {spell.event_modifier && (
            <View style={[styles.pill, styles.pillEvent]}>
              <Text style={styles.pillText}>{spell.event_modifier.replace('_', ' ')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDate}>{formatDate(spell.crafted_at)}</Text>
      </View>

      {/* Row 5: upvotes */}
      <View style={[styles.cardRow, { marginTop: Spacing.xs }]}>
        <Text style={styles.upvoteCount}>▲ {spell.upvotes}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterSheet — modal bottom sheet for all filter/sort controls
// ─────────────────────────────────────────────────────────────────────────────

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  sites: Site[];
  sort: SortOption;
  setSort: (v: SortOption) => void;
  durationFilter: DurationFilter;
  setDurationFilter: (v: DurationFilter) => void;
  siteFilter: string;
  setSiteFilter: (v: string) => void;
  minScore: string;
  setMinScore: (v: string) => void;
  maxScore: string;
  setMaxScore: (v: string) => void;
  showBanned: boolean;
  setShowBanned: (v: boolean) => void;
  onApply: () => void;
  onReset: () => void;
}

function FilterSheet({
  visible, onClose, sites,
  sort, setSort,
  durationFilter, setDurationFilter,
  siteFilter, setSiteFilter,
  minScore, setMinScore,
  maxScore, setMaxScore,
  showBanned, setShowBanned,
  onApply, onReset,
}: FilterSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Filter & Sort</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Sort */}
          <Text style={styles.sheetSectionLabel}>SORT BY</Text>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sheetOption, sort === opt.value && styles.sheetOptionActive]}
              onPress={() => setSort(opt.value)}
            >
              <Text style={[styles.sheetOptionText, sort === opt.value && styles.sheetOptionTextActive]}>
                {opt.label}
              </Text>
              {sort === opt.value && <Text style={styles.sheetOptionCheck}>✦</Text>}
            </TouchableOpacity>
          ))}

          {/* Duration */}
          <Text style={styles.sheetSectionLabel}>DURATION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterPill, durationFilter === opt.value && styles.filterPillActive]}
                onPress={() => setDurationFilter(opt.value)}
              >
                <Text style={[styles.filterPillText, durationFilter === opt.value && styles.filterPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Site */}
          <Text style={styles.sheetSectionLabel}>SITE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            <TouchableOpacity
              style={[styles.filterPill, siteFilter === '' && styles.filterPillActive]}
              onPress={() => setSiteFilter('')}
            >
              <Text style={[styles.filterPillText, siteFilter === '' && styles.filterPillTextActive]}>
                Any site
              </Text>
            </TouchableOpacity>
            {sites.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterPill, siteFilter === s.id && styles.filterPillActive]}
                onPress={() => setSiteFilter(s.id)}
              >
                <Text style={[styles.filterPillText, siteFilter === s.id && styles.filterPillTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Power score range */}
          <Text style={styles.sheetSectionLabel}>POWER SCORE RANGE</Text>
          <View style={styles.scoreRangeRow}>
            <TextInput
              style={styles.scoreInput}
              placeholder="Min (1)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={minScore}
              onChangeText={setMinScore}
            />
            <Text style={styles.scoreRangeDash}>—</Text>
            <TextInput
              style={styles.scoreInput}
              placeholder="Max (10)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={maxScore}
              onChangeText={setMaxScore}
            />
          </View>

          {/* Banned toggle */}
          <TouchableOpacity style={styles.bannedToggleRow} onPress={() => setShowBanned(!showBanned)}>
            <View style={styles.bannedToggleLeft}>
              <Text style={styles.bannedToggleLabel}>Show banned spells</Text>
              <Text style={styles.bannedToggleSub}>Hidden by default</Text>
            </View>
            <View style={[styles.toggle, showBanned && styles.toggleOn]}>
              <View style={[styles.toggleThumb, showBanned && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>

        {/* Actions */}
        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const router = useRouter();

  // Search
  const [searchText, setSearchText] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSearch, setActiveSearch] = useState('');

  // Filter / sort state (applied)
  const [sort, setSort] = useState<SortOption>('power_score_desc');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('');
  const [siteFilter, setSiteFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [showBanned, setShowBanned] = useState(false);

  // Pending filter state (in-sheet, not yet applied)
  const [pendingSort, setPendingSort] = useState<SortOption>('power_score_desc');
  const [pendingDuration, setPendingDuration] = useState<DurationFilter>('');
  const [pendingSite, setPendingSite] = useState('');
  const [pendingMin, setPendingMin] = useState('');
  const [pendingMax, setPendingMax] = useState('');
  const [pendingBanned, setPendingBanned] = useState(false);

  // Sheet visibility
  const [sheetVisible, setSheetVisible] = useState(false);

  // Data
  const [spells, setSpells] = useState<LibrarySpell[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Load sites once ────────────────────────────────────────────────────────
  useEffect(() => {
    request<{ data?: Site[]; id?: string }[]>('/sites')
      .then(data => {
        // Sites endpoint returns array directly
        const list = Array.isArray(data) ? data as unknown as Site[] : [];
        setSites(list.map((s: any) => ({ id: s.id, name: s.name, region: s.region })));
      })
      .catch(() => {}); // non-fatal
  }, []);

  // ── Debounce search input ──────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setActiveSearch(searchText.trim());
      setCurrentPage(1);
    }, 400);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchText]);

  // ── Fetch spells ───────────────────────────────────────────────────────────
  const fetchSpells = useCallback(async (page: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
        sort,
        include_banned: showBanned ? 'true' : 'false',
      });
      if (activeSearch)    params.set('search', activeSearch);
      if (durationFilter)  params.set('duration_tier', durationFilter);
      if (siteFilter)      params.set('site_id', siteFilter);
      if (minScore)        params.set('min_score', minScore);
      if (maxScore)        params.set('max_score', maxScore);

      const result = await request<{ data: LibrarySpell[]; pagination: Pagination }>(
        `/spells?${params.toString()}`
      );

      setSpells(prev => append ? [...prev, ...result.data] : result.data);
      setPagination(result.pagination);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load the library.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, durationFilter, siteFilter, minScore, maxScore, showBanned, activeSearch]);

  // Trigger fetch on filter/search change
  useEffect(() => {
    setCurrentPage(1);
    fetchSpells(1, false);
  }, [fetchSpells]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const loadMore = () => {
    if (!pagination || currentPage >= pagination.total_pages || loadingMore) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchSpells(next, true);
  };

  // ── Filter sheet helpers ───────────────────────────────────────────────────
  const openSheet = () => {
    // Seed pending state from applied state
    setPendingSort(sort);
    setPendingDuration(durationFilter);
    setPendingSite(siteFilter);
    setPendingMin(minScore);
    setPendingMax(maxScore);
    setPendingBanned(showBanned);
    setSheetVisible(true);
  };

  const applyFilters = () => {
    setSort(pendingSort);
    setDurationFilter(pendingDuration);
    setSiteFilter(pendingSite);
    setMinScore(pendingMin);
    setMaxScore(pendingMax);
    setShowBanned(pendingBanned);
    setCurrentPage(1);
    setSheetVisible(false);
  };

  const resetFilters = () => {
    setPendingSort('power_score_desc');
    setPendingDuration('');
    setPendingSite('');
    setPendingMin('');
    setPendingMax('');
    setPendingBanned(false);
  };

  // Active filter count badge
  const activeFilterCount = [
    durationFilter !== '',
    siteFilter !== '',
    minScore !== '',
    maxScore !== '',
    showBanned,
    sort !== 'power_score_desc',
  ].filter(Boolean).length;

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderSpell = ({ item }: { item: LibrarySpell }) => (
    <SpellCard
      spell={item}
      onPress={() => router.push(`/spell/${item.id}`)}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <ActivityIndicator
        color={Colors.gold}
        style={{ paddingVertical: Spacing.lg }}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>✦</Text>
        <Text style={styles.emptyTitle}>No spells found</Text>
        <Text style={styles.emptyBody}>
          {activeSearch
            ? `Nothing matches "${activeSearch}"`
            : 'Try adjusting your filters'}
        </Text>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSub}>
            {pagination ? `${pagination.total.toLocaleString()} spells` : 'Global collection'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Search + filter bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search spells or creators…"
            placeholderTextColor={Colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={openSheet}>
          <Text style={styles.filterBtnIcon}>⊞</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchSpells(1, false)}>
            <Text style={styles.errorRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={spells}
          keyExtractor={item => item.id}
          renderItem={renderSpell}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter sheet */}
      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        sites={sites}
        sort={pendingSort}
        setSort={setPendingSort}
        durationFilter={pendingDuration}
        setDurationFilter={setPendingDuration}
        siteFilter={pendingSite}
        setSiteFilter={setPendingSite}
        minScore={pendingMin}
        setMinScore={setPendingMin}
        maxScore={pendingMax}
        setMaxScore={setPendingMax}
        showBanned={pendingBanned}
        setShowBanned={setPendingBanned}
        onApply={applyFilters}
        onReset={resetFilters}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.display,
    fontSize: 34,
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  headerSub: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: {
    color: Colors.textMuted,
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    color: Colors.textMuted,
    fontSize: 13,
    paddingLeft: Spacing.xs,
  },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnIcon: {
    color: Colors.gold,
    fontSize: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.bg,
    fontWeight: '700',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Spell card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  banRibbon: {
    position: 'absolute',
    top: 10,
    right: -22,
    backgroundColor: Colors.error,
    paddingHorizontal: 28,
    paddingVertical: 3,
    transform: [{ rotate: '45deg' }],
  },
  banRibbonText: {
    fontFamily: Typography.mono,
    fontSize: 8,
    color: Colors.white,
    letterSpacing: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontFamily: Typography.display,
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: Spacing.sm,
  },
  scoreBadge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  scoreText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  cardSpellType: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.gold,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardCreator: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardSite: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 3,
  },
  pillConc: {
    borderWidth: 1,
    borderColor: Colors.violetDim,
  },
  pillEvent: {
    borderWidth: 1,
    borderColor: Colors.goldDim,
  },
  pillIcon: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  pillText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  cardDate: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  upvoteCount: {
    fontFamily: Typography.mono,
    fontSize: 11,
    color: Colors.goldDim,
  },

  // Empty state
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

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(199,91,91,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  errorRetry: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.gold,
    marginLeft: Spacing.md,
  },

  // Filter sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.bgElevated,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: '80%',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  sheetSectionLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetOptionActive: {
    // no background — rely on text + check mark
  },
  sheetOptionText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  sheetOptionTextActive: {
    color: Colors.gold,
  },
  sheetOptionCheck: {
    color: Colors.gold,
    fontSize: 12,
  },
  pillScroll: {
    marginBottom: Spacing.sm,
  },
  filterPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    marginRight: Spacing.sm,
  },
  filterPillActive: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.gold,
  },
  filterPillText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.gold,
  },
  scoreRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scoreInput: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.mono,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  scoreRangeDash: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  bannedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  bannedToggleLeft: {
    flex: 1,
  },
  bannedToggleLabel: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  bannedToggleSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: Colors.goldDim,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.textMuted,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.gold,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  resetBtnText: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.gold,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: Typography.display,
    fontSize: 15,
    color: Colors.bg,
    letterSpacing: 1,
  },
});
