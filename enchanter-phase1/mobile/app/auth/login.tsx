import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!username.trim()) throw new Error('Username is required');
        await signUp(email.trim(), password, username.trim());
      }
      router.replace('/tabs/map');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wordmark */}
        <View style={styles.wordmark}>
          <Ionicons name="sparkles" size={28} color={Colors.gold} />
          <Text style={styles.wordmarkText}>ENCHANTER</Text>
          <Text style={styles.wordmarkSub}>
            Places of Power · Celestial Craft
          </Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
            onPress={() => { setMode('login'); setError(null); }}
          >
            <Text style={[styles.toggleBtnText, mode === 'login' && styles.toggleBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
            onPress={() => { setMode('register'); setError(null); }}
          >
            <Text style={[styles.toggleBtnText, mode === 'register' && styles.toggleBtnTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="your-caster-name"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {/* Error */}
          {error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.bg} size="small" />
              : <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'Enter the Archive' : 'Begin Your Craft'}
                </Text>
            }
          </TouchableOpacity>

          {mode === 'register' && (
            <Text style={styles.disclaimer}>
              Your username is permanent and public. Choose wisely.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={autoCorrect ?? true}
        selectionColor={Colors.gold}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  wordmark: { alignItems: 'center', marginBottom: Spacing.xxl },
  wordmarkText: {
    fontFamily: Typography.display,
    fontSize: 32,
    color: Colors.gold,
    letterSpacing: 6,
    marginTop: Spacing.sm,
  },
  wordmarkSub: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
  },

  toggle: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: Colors.goldGlow,
    borderBottomWidth: 2,
    borderBottomColor: Colors.gold,
  },
  toggleBtnText: {
    fontFamily: Typography.display,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  toggleBtnTextActive: { color: Colors.gold },

  form: { gap: Spacing.md },

  field: { gap: Spacing.xs },
  fieldLabel: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary,
    fontFamily: Typography.body,
    fontSize: 16,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(199,91,91,0.1)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  errorText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },

  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontFamily: Typography.display,
    fontSize: 14,
    color: Colors.bg,
    letterSpacing: 2,
  },

  disclaimer: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
