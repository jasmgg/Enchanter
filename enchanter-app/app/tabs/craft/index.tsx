/**
 * app/tabs/craft/index.tsx
 * Step 1 — Check-in
 *
 * Shows the list of sites. User selects one, then we validate their GPS
 * position against the site radius. On success, navigates to Step 2.
 *
 * Error handling (Phase 7):
 *  - GPS permission denied     → Alert with settings guidance
 *  - GPS timeout (10s)         → Alert with retry option
 *  - GPS unavailable           → Alert with friendly message
 *  - Network offline           → Inline retry on site load; Alert on validate
 *  - Outside radius            → Alert with distance
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSites } from '../../../hooks/useSites';
import { validateLocation, Site } from '../../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

// GPS will time out after this many milliseconds if no fix is obtained.
const GPS_TIMEOUT_MS = 10_000;

export default function CraftCheckInScreen() {
  const router = useRouter();
  const { sites, loading, error, refetch } = useSites();
  const [checking, setChecking] = useState<string | null>(null);

  async function handleSiteSelect(site: Site) {
    setChecking(site.id);
    try {
      // ── 1. Location permission ────────────────────────────────────────────
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Enchanter needs your location to verify you are at a sacred site. You can enable it in your device settings under Privacy → Location Services.',
          [{ text: 'OK' }]
        );
        setChecking(null);
        return;
      }

      // ── 2. Get position with timeout ──────────────────────────────────────
      let loc: Location.LocationObject;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('gps_timeout')),
              GPS_TIMEOUT_MS
            )
          ),
        ]);
      } catch (gpsErr: any) {
        if (gpsErr.message === 'gps_timeout') {
          Alert.alert(
            'Location Unavailable',
            'Could not obtain a GPS fix. Make sure you are outdoors with a clear view of the sky, then try again.',
            [{ text: 'Try Again', onPress: () => handleSiteSelect(site) }, { text: 'Cancel' }]
          );
        } else {
          Alert.alert(
            'Location Unavailable',
            'Your device could not determine your location. Please check that GPS is enabled and try again.',
            [{ text: 'OK' }]
          );
        }
        setChecking(null);
        return;
      }

      // ── 3. Server-side radius validation ─────────────────────────────────
      let result;
      try {
        result = await validateLocation(
          site.id,
          loc.coords.latitude,
          loc.coords.longitude,
          loc.coords.accuracy ?? undefined
        );
      } catch (err: any) {
        if (err.isNetworkError) {
          Alert.alert(
            'No Connection',
            'Could not reach the server to validate your location. Please check your connection and try again.',
            [{ text: 'Try Again', onPress: () => handleSiteSelect(site) }, { text: 'Cancel' }]
          );
        } else {
          Alert.alert('Validation Failed', err.message ?? 'An unexpected error occurred.');
        }
        setChecking(null);
        return;
      }

      if (!result.valid) {
        const distanceDisplay =
          result.distance_metres >= 1000
            ? `${(result.distance_metres / 1000).toFixed(1)} km`
            : `${result.distance_metres} m`;

        Alert.alert(
          'Not at this site',
          `You are ${distanceDisplay} from ${site.name}. You must be within ${site.radius_metres} m to craft here.`,
          [{ text: 'Understood' }]
        );
        setChecking(null);
        return;
      }

      // ── 4. Valid — proceed to expression step ─────────────────────────────
      router.push({
        pathname: '/tabs/craft/express',
        params: {
          site_id: site.id,
          site_name: site.name,
          site_spell_name: site.spell_name,
          site_type: site.site_type,
          lat: loc.coords.latitude.toString(),
          lng: loc.coords.longitude.toString(),
        },
      });
    } catch (err: any) {
      // Catch-all for anything unexpected not handled above
      Alert.alert('Error', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setChecking(null);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  // ── Site load error (network or server) ───────────────────────────────────

  if (error) {
    return (
      <View style={styles.centred}>
        <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
        <Text style={styles.errorText}>Could not load sites</Text>
        <Text style={styles.errorSub}>
          {error.includes('network') || error.includes('Network')
            ? 'No connection. Please check your network.'
            : error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={14} color={Colors.gold} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Site list ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sacred Sites</Text>
        <Text style={styles.subtitle}>Choose a site where you stand</Text>
      </View>

      <FlatList
        data={sites}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        renderItem={({ item: site }) => {
          const isCoastal = site.site_type === 'coastal';
          const isChecking = checking === site.id;

          return (
            <TouchableOpacity
              style={styles.siteCard}
              onPress={() => handleSiteSelect(site)}
              disabled={checking !== null}
              activeOpacity={0.75}
            >
              <View style={styles.siteCardLeft}>
                <View style={[styles.typeDot, isCoastal ? styles.dotCoastal : styles.dotLandlocked]} />
                <View style={styles.siteCardText}>
                  <Text style={styles.siteName}>{site.name}</Text>
                  {site.region && <Text style={styles.siteRegion}>{site.region}</Text>}
                  <Text style={styles.siteSpell}>{site.spell_name}</Text>
                </View>
              </View>
              <View style={styles.siteCardRight}>
                {isChecking ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={checking !== null ? Colors.textMuted : Colors.goldDim}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.footerText}>
          Your GPS will be checked when you select a site
        </Text>
      </View>
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
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    letterSpacing: 0.5,
  },
  list: {
    padding: Spacing.lg,
  },
  siteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  siteCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  dotCoastal: { backgroundColor: Colors.coastal },
  dotLandlocked: { backgroundColor: Colors.landlocked },
  siteCardText: {
    flex: 1,
    gap: 2,
  },
  siteName: {
    fontFamily: Typography.display,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  siteRegion: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  siteSpell: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 13,
    color: Colors.gold,
    marginTop: 2,
  },
  siteCardRight: {
    paddingLeft: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Typography.display,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  errorSub: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  retryText: {
    fontFamily: Typography.display,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 1,
  },
});
