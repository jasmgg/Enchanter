/**
 * app/tabs/craft/express.tsx
 * Step 2 — Expression
 *
 * User names their spell and optionally fills in the expression fields
 * (incantation, delivery method, colour, sound, notes).
 * Navigates to Step 3 (Seal) with all data in params.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DeliveryMethod } from '../../../lib/api';
import { Colors, Typography, Spacing, Radius } from '../../../constants/theme';

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string; icon: string }[] = [
  { value: 'spoken',  label: 'Spoken',  icon: 'mic-outline' },
  { value: 'signed',  label: 'Signed',  icon: 'hand-left-outline' },
  { value: 'hummed',  label: 'Hummed',  icon: 'musical-notes-outline' },
  { value: 'silent',  label: 'Silent',  icon: 'eye-outline' },
];

export default function CraftExpressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    site_id: string;
    site_name: string;
    site_spell_name: string;
    site_type: string;
    lat: string;
    lng: string;
  }>();

  const [name, setName] = useState('');
  const [incantation, setIncantation] = useState('');
  const [delivery, setDelivery] = useState<DeliveryMethod | null>(null);
  const [colour, setColour] = useState('');
  const [sound, setSound] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState('');

  function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Your spell needs a name.');
      return;
    }
    if (trimmed.length > 60) {
      setNameError('Name must be 60 characters or fewer.');
      return;
    }
    setNameError('');

    router.push({
      pathname: '/tabs/craft/seal',
      params: {
        ...params,
        spell_name: trimmed,
        expression_incantation: incantation.trim() || '',
        expression_delivery: delivery ?? '',
        expression_colour: colour.trim() || '',
        expression_sound: sound.trim() || '',
        expression_notes: notes.trim() || '',
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Sites</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Step 2 of 3</Text>
        </View>

        <Text style={styles.title}>Expression</Text>
        <View style={styles.sitePill}>
          <Ionicons name="location" size={12} color={Colors.goldDim} />
          <Text style={styles.sitePillText}>{params.site_name}</Text>
        </View>
        <Text style={styles.siteSpell}>{params.site_spell_name}</Text>

        {/* Spell Name — required */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Spell Name <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>What will this spell be known as?</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="e.g. The Brightening of Low Tides"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={(t) => { setName(t); setNameError(''); }}
            maxLength={60}
            returnKeyType="next"
          />
          <View style={styles.inputMeta}>
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : (
              <View />
            )}
            <Text style={styles.charCount}>{name.length}/60</Text>
          </View>
        </View>

        {/* Incantation — optional */}
        <View style={styles.section}>
          <Text style={styles.label}>Incantation</Text>
          <Text style={styles.hint}>Words spoken or held in mind during the working</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Optional"
            placeholderTextColor={Colors.textMuted}
            value={incantation}
            onChangeText={setIncantation}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Delivery method — optional */}
        <View style={styles.section}>
          <Text style={styles.label}>Delivery</Text>
          <Text style={styles.hint}>How was the incantation expressed?</Text>
          <View style={styles.deliveryRow}>
            {DELIVERY_OPTIONS.map((opt) => {
              const selected = delivery === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.deliveryOption, selected && styles.deliveryOptionSelected]}
                  onPress={() => setDelivery(selected ? null : opt.value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={16}
                    color={selected ? Colors.gold : Colors.textMuted}
                  />
                  <Text style={[styles.deliveryLabel, selected && styles.deliveryLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Colour — optional */}
        <View style={styles.section}>
          <Text style={styles.label}>Colour</Text>
          <Text style={styles.hint}>A colour associated with this working</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional — e.g. deep amber"
            placeholderTextColor={Colors.textMuted}
            value={colour}
            onChangeText={setColour}
            maxLength={40}
          />
        </View>

        {/* Sound — optional */}
        <View style={styles.section}>
          <Text style={styles.label}>Sound</Text>
          <Text style={styles.hint}>A sound or tone present during the working</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional — e.g. low drone, silence"
            placeholderTextColor={Colors.textMuted}
            value={sound}
            onChangeText={setSound}
            maxLength={40}
          />
        </View>

        {/* Notes — optional */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.hint}>Any other details you wish to record (max 200 chars)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Optional"
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={200}
          />
          <Text style={[styles.charCount, { textAlign: 'right' }]}>{notes.length}/200</Text>
        </View>

        {/* Continue */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueText}>Continue to Seal</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.bg} />
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  sitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  sitePillText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  siteSpell: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 15,
    color: Colors.gold,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Typography.display,
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  required: {
    color: Colors.gold,
  },
  hint: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.error,
  },
  charCount: {
    fontFamily: Typography.mono,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  deliveryOptionSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldGlow,
  },
  deliveryLabel: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  deliveryLabelSelected: {
    color: Colors.gold,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  continueText: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.bg,
    letterSpacing: 1.5,
  },
});
