import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSites } from '../../hooks/useSites';
import { Site } from '../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

// Initial region centred on England
const INITIAL_REGION = {
  latitude: 52.5,
  longitude: -2.0,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// ── Site Card Sheet ────────────────────────────────────────────────────────

function SiteCard({ site, onClose }: { site: Site; onClose: () => void }) {
  const isCoastal = site.site_type === 'coastal';

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetDismiss} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.siteHeader}>
              <View style={[styles.siteTypeBadge, isCoastal ? styles.badgeCoastal : styles.badgeLandlocked]}>
                <Text style={styles.siteTypeBadgeText}>
                  {isCoastal ? '⚓ Coastal' : '⛰ Landlocked'}
                </Text>
              </View>
              <Text style={styles.siteName}>{site.name}</Text>
              {site.region && (
                <Text style={styles.siteRegion}>{site.region}</Text>
              )}
            </View>

            {/* Spell */}
            <View style={styles.spellBlock}>
              <Text style={styles.spellLabel}>Spell of this Place</Text>
              <Text style={styles.spellName}>{site.spell_name}</Text>
              <Text style={styles.spellEffect}>{site.effect_description}</Text>
            </View>

            {/* Affinities */}
            <View style={styles.affinityBlock}>
              <Text style={styles.affinityLabel}>Affinities</Text>
              <View style={styles.affinityRow}>
                <AffinityPill icon="moon" label={`Lunar: ${site.affinity_lunar}`} />
                <AffinityPill icon="planet" label={`Geo: ${site.affinity_geo.replace('_', ' ')}`} />
                <AffinityPill icon="sunny" label={`ToD: ${site.affinity_tod}`} />
                <AffinityPill icon="leaf" label={`Season: ${site.affinity_season}`} />
              </View>
            </View>

            {/* Lore */}
            {site.lore_note && (
              <View style={styles.loreBlock}>
                <Text style={styles.loreText}>{site.lore_note}</Text>
              </View>
            )}

            {/* CTA — craft disabled in Phase 1 */}
            <TouchableOpacity style={[styles.craftButton, styles.craftButtonDisabled]}>
              <Ionicons name="sparkles-outline" size={16} color={Colors.textMuted} />
              <Text style={[styles.craftButtonText, { color: Colors.textMuted }]}>
                Craft Here — coming in Phase 3
              </Text>
            </TouchableOpacity>

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AffinityPill({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.affinityPill}>
      <Ionicons name={icon} size={11} color={Colors.gold} />
      <Text style={styles.affinityPillText}>{label}</Text>
    </View>
  );
}

// ── Map Screen ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { sites, loading, error } = useSites();
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const mapRef = useRef<MapView>(null);

  const markerColor = (site: Site) =>
    site.site_type === 'coastal' ? Colors.coastal : Colors.landlocked;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        customMapStyle={darkMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {sites.map((site) => (
          <Marker
            key={site.id}
            coordinate={{ latitude: site.latitude, longitude: site.longitude }}
            onPress={() => setSelectedSite(site)}
            pinColor={markerColor(site)}
            title={site.name}
            description={site.spell_name}
          />
        ))}
      </MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color={Colors.error} />
          <Text style={styles.errorText}>Could not load sites — {error}</Text>
        </View>
      )}

      {/* Celestial bar — Phase 2 will populate live data */}
      <View style={styles.celestialBar}>
        <CelestialPill icon="moon-outline" label="Lunar" value="—" />
        <CelestialPill icon="thunderstorm-outline" label="Geo" value="—" />
        <CelestialPill icon="time-outline" label="Time" value="—" />
        <CelestialPill icon="leaf-outline" label="Season" value="—" />
      </View>

      {/* Site detail sheet */}
      {selectedSite && (
        <SiteCard site={selectedSite} onClose={() => setSelectedSite(null)} />
      )}
    </View>
  );
}

function CelestialPill({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.celestialPill}>
      <Ionicons name={icon} size={13} color={Colors.gold} />
      <View>
        <Text style={styles.celestialPillLabel}>{label}</Text>
        <Text style={styles.celestialPillValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  map: { flex: 1 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(14,11,24,0.6)',
  },

  errorBanner: {
    position: 'absolute',
    top: 56,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderColor: Colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.error,
    fontFamily: Typography.body,
    fontSize: 12,
  },

  // Celestial bar
  celestialBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(14,11,24,0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  celestialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  celestialPillLabel: {
    color: Colors.textMuted,
    fontFamily: Typography.body,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  celestialPillValue: {
    color: Colors.textPrimary,
    fontFamily: Typography.mono,
    fontSize: 11,
  },

  // Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.bgElevated,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    maxHeight: '75%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    ...Shadow.card,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },

  siteHeader: { marginBottom: Spacing.md },
  siteTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  badgeCoastal: { backgroundColor: 'rgba(74,158,187,0.2)', borderWidth: 1, borderColor: Colors.coastal },
  badgeLandlocked: { backgroundColor: 'rgba(122,158,74,0.2)', borderWidth: 1, borderColor: Colors.landlocked },
  siteTypeBadgeText: {
    fontSize: 10,
    fontFamily: Typography.body,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  siteName: {
    fontFamily: Typography.display,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  siteRegion: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },

  spellBlock: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  spellLabel: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: Colors.goldDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  spellName: {
    fontFamily: Typography.display,
    fontSize: 18,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  spellEffect: {
    fontFamily: Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  affinityBlock: { marginBottom: Spacing.md },
  affinityLabel: {
    fontFamily: Typography.body,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  affinityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  affinityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldGlow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.goldDim,
  },
  affinityPillText: {
    fontFamily: Typography.body,
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },

  loreBlock: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.goldDim,
  },
  loreText: {
    fontFamily: 'CormorantGaramond-Italic',
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },

  craftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: Colors.goldGlow,
  },
  craftButtonDisabled: {
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  craftButtonText: {
    fontFamily: Typography.display,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 1,
  },
});

// ── Dark map style (Google Maps) ───────────────────────────────────────────

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0e0b18' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9d9088' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0b18' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2e2840' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1935' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#161228' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2e2840' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0d1a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a9ebb' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#161228' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#131b0f' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#161228' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0e0b18' }] },
];
