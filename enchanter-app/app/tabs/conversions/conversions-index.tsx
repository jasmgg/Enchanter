/**
 * app/tabs/conversions/index.tsx
 *
 * Conversions tab — landing screen.
 * Shows available TTRPG system tiles. Tapping one navigates into that
 * system's spellbook view.
 *
 * Currently: 5e SRD only.
 * Future: Cairn, Shadowrun, etc. — just add tiles to SYSTEMS.
 */
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// System tile definitions
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEMS = [
  {
    id:          '5e',
    name:        'D&D 5e SRD',
    tagline:     'Dungeons & Dragons 5th Edition',
    icon:        'shield' as const,
    available:   true,
    route:       '/tabs/conversions/5e',
  },
  // Future systems — uncomment and fill when ready
  // {
  //   id:        'cairn',
  //   name:      'Cairn',
  //   tagline:   'Into the odd-derived adventure game',
  //   icon:      'leaf' as const,
  //   available: false,
  //   route:     '/tabs/conversions/cairn',
  // },
];

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ConversionsScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Conversions</Text>
        <Text style={styles.subtitle}>Your spells, in other systems</Text>
      </View>

      <View style={styles.divider} />

      {/* System tiles */}
      <Text style={styles.sectionLabel}>AVAILABLE SYSTEMS</Text>

      {SYSTEMS.map(system => (
        <TouchableOpacity
          key={system.id}
          style={[styles.tile, !system.available && styles.tileDisabled]}
          onPress={() => system.available && router.push(system.route as any)}
          activeOpacity={system.available ? 0.75 : 1}
        >
          <View style={styles.tileIcon}>
            <Ionicons
              name={system.icon}
              size={24}
              color={system.available ? Colors.gold : Colors.textMuted}
            />
          </View>
          <View style={styles.tileText}>
            <Text style={[styles.tileName, !system.available && styles.tileNameDisabled]}>
              {system.name}
            </Text>
            <Text style={styles.tileTagline}>{system.tagline}</Text>
          </View>
          {system.available ? (
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          ) : (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      <Text style={styles.footer}>
        More systems will be added in future updates.
      </Text>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: Spacing.xxl * 2,
  },
  header: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.display,
    fontSize: 34,
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tileText: {
    flex: 1,
    gap: 2,
  },
  tileName: {
    fontFamily: Typography.display,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  tileNameDisabled: {
    color: Colors.textMuted,
  },
  tileTagline: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  comingSoonBadge: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontFamily: Typography.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  footer: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
});
