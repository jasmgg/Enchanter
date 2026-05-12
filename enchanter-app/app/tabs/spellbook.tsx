/**
 * app/tabs/spellbook.tsx
 * The user's personal Spellbook — all spells they have crafted.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMySpells } from '../../hooks/useSpells';
import { Spell } from '../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const DURATION_ICONS: Record<string, string> = {
  instant: 'flash-outline',
  short:   'time-outline',
  long:    'hourglass-outline',
  permanent: 'infinite-outline',
};

export default function SpellbookScreen() {
  const router = useRouter();
  const { spells, loading, refreshing, error, refresh } = useMySpells();

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
      <View style={styles.container}>
    <View style={styles.header}>
     <View>
       <Text style={styles.title}>Spellbook</Text>
       <Text style={styles.subtitle}>Your sealed workings</Text>
     </View>
     <TouchableOpacity
       onPress={() => router.push('/tabs/transfer/receive')}
       style={styles.scanBtn}
     >
       <Ionicons name="scan-outline" size={20} color={Colors.gold} />
     </TouchableOpacity>
   </View>

      {error ? (
        <View style={styles.centred}>
          <Ionicons name="warning-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : spells.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyTitle}>No spells yet</Text>
          <Text style={styles.emptyBody}>
            Visit a sacred site and seal your first working.
          </Text>
        </View>
      ) : (
        <FlatList
          data={spells}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.gold}
            />
          }
          renderItem={({ item }) => (
            <SpellCard
              spell={item}
              onPress={() =>
                router.push({ pathname: '/tabs/spell/[id]', params: { id: item.id } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function SpellCard({ spell, onPress }: { spell: Spell; onPress: () => void }) {
  const durationIcon = DURATION_ICONS[spell.duration_tier] ?? 'time-outline';
  const powerFormatted = typeof spell.power_score === 'number'
    ? spell.power_score.toFixed(2)
    : '—';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <Text style={styles.spellName} numberOfLines={1}>{spell.name}</Text>
        <View style={styles.powerBadge}>
          <Text style={styles.powerText}>{powerFormatted}</Text>
        </View>
      </View>

      <Text style={styles.siteName} numberOfLines={1}>
        {spell.site_spell_name ?? spell.site_name}
      </Text>

      <View style={styles.cardMeta}>
        <MetaChip icon={durationIcon} label={spell.duration_tier} />
        <MetaChip icon="resize-outline" label={spell.range_tier} />
        {spell.concentration && <MetaChip icon="eye-outline" label="Focus" />}
        {spell.calendar_event && (
          <MetaChip icon="star-outline" label={spell.calendar_event} />
        )}
        <View style={{ flex: 1 }} />
        <Text style={styles.dateText}>
          {new Date(spell.crafted_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon as any} size={11} color={Colors.textMuted} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  header: {
  paddingTop: 64,
  paddingHorizontal: Spacing.lg,
  paddingBottom: Spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: Colors.border,
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
},
scanBtn: {
  marginTop: Spacing.sm,
  padding: Spacing.sm,
  borderRadius: Radius.md,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.goldGlow,
},
  title: {
    fontFamily: Typography.display,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  list: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 4,
    ...Shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  spellName: {
    fontFamily: Typography.display,
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    flex: 1,
  },
  powerBadge: {
    backgroundColor: Colors.goldGlow,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  powerText: {
    fontFamily: Typography.mono,
    fontSize: 12,
    color: Colors.gold,
  },
  siteName: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 13,
    color: Colors.goldDim,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  dateText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Typography.display,
    fontSize: 20,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  emptyBody: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.error,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryText: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
