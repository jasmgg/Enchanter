import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';

const TAB_META: Record<string, { icon: string; label: string; phase: string }> = {
  craft:     { icon: 'sparkles-outline',  label: 'Craft',     phase: 'Phase 3' },
  spellbook: { icon: 'book-outline',      label: 'Spellbook', phase: 'Phase 3' },
  library:   { icon: 'library-outline',   label: 'Library',   phase: 'Phase 4' },
  profile:   { icon: 'person-outline',    label: 'Profile',   phase: 'Phase 6' },
};

const key = 'library';
const meta = TAB_META[key];

export default function StubScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name={meta.icon as any} size={48} color={Colors.goldDim} />
      <Text style={styles.label}>{meta.label}</Text>
      <Text style={styles.phase}>Available in {meta.phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Typography.display,
    fontSize: 22,
    color: Colors.textSecondary,
    letterSpacing: 3,
  },
  phase: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
