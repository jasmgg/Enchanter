import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSites } from '../../hooks/useSites';
import { useCelestial } from '../../hooks/useCelestial';
import { useRouter } from 'expo-router';
import { Site } from '../../lib/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const INITIAL_REGION = {
  latitude: 52.5,
  longitude: -2.0,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const LUNAR_ICONS: Record<string, string> = {
  new:      '🌑',
  crescent: '🌒',
  quarter:  '🌓',
  gibbous:  '🌔',
  full:     '🌕',
};

// ── Site Card ──────────────────────────────────────────────────────────────

function SiteCard({
  site, onClose, celestial, pressure,
}: {
  site: Site; onClose: () => void; celestial: any; pressure: any;
}) {
  const router = useRouter();
  const isCoastal = site.site_type === 'coastal';
  const geoLabel = isCoastal
    ? `${pressure?.pressure_hpa ? `${pressure.pressure_hpa} hPa` : '—'} · ${pressure?.slot ?? '—'}`
    : `Kp ${celestial?.kp?.value ?? '—'} · ${celestial?.kp?.slot ?? '—'}`;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetDismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.siteHeader}>
              <View style={[styles.siteTypeBadge, isCoastal ? styles.badgeCoastal : styles.badgeLandlocked]}>
                <Text style={styles.siteTypeBadgeText}>{isCoastal ? '⚓ Coastal' : '⛰ Landlocked'}</Text>
              </View>
              <Text style={styles.siteName}>{site.name}</Text>
              {site.region && <Text style={styles.siteRegion}>{site.region}</Text>}
            </View>

            <View style={styles.spellBlock}>
              <Text style={styles.spellLabel}>Spell of this Place</Text>
              <Text style={styles.spellName}>{site.spell_name}</Text>
              <Text style={styles.spellEffect}>{site.effect_description}</Text>
            </View>

            {celestial && (
              <View style={styles.conditionsBlock}>
                <Text style={styles.conditionsLabel}>Current Conditions</Text>
                <View style={styles.conditionsGrid}>
                  <ConditionCell icon="moon" label="Lunar" value={`${LUNAR_ICONS[celestial.lunar.slot] ?? '🌙'} ${celestial.lunar.slot}`} />
                  <ConditionCell icon={isCoastal ? 'thunderstorm-outline' : 'planet-outline'} label={isCoastal ? 'Pressure' : 'Solar Kp'} value={geoLabel} />
                  <ConditionCell icon="time-outline" label="Time" value={celestial.tod.slot} />
                  <ConditionCell icon="leaf-outline" label="Season" value={celestial.season} />
                  {celestial.calendar_event && (
                    <ConditionCell icon="sparkles" label="Event" value={celestial.calendar_event} highlight />
                  )}
                </View>
              </View>
            )}

            <View style={styles.affinityBlock}>
              <Text style={styles.affinityLabel}>Site Affinities</Text>
              <View style={styles.affinityRow}>
                <AffinityPill label={`Lunar: ${site.affinity_lunar}`} />
                <AffinityPill label={`Geo: ${site.affinity_geo.replace(/_/g, ' ')}`} />
                <AffinityPill label={`ToD: ${site.affinity_tod}`} />
                <AffinityPill label={`Season: ${site.affinity_season}`} />
              </View>
            </View>

            {site.lore_note && (
              <View style={styles.loreBlock}>
                <Text style={styles.loreText}>{site.lore_note}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.craftButton}
              onPress={() => { onClose(); router.push('/tabs/craft'); }}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles-outline" size={16} color={Colors.bg} />
              <Text style={styles.craftButtonText}>Craft Here</Text>
            </TouchableOpacity>
            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ConditionCell({ icon, label, value, highlight = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; highlight?: boolean;
}) {
  return (
    <View style={[styles.conditionCell, highlight && styles.conditionCellHighlight]}>
      <Ionicons name={icon} size={14} color={highlight ? Colors.gold : Colors.violet} />
      <Text style={styles.conditionCellLabel}>{label}</Text>
      <Text style={[styles.conditionCellValue, highlight && { color: Colors.gold }]}>{value}</Text>
    </View>
  );
}

function AffinityPill({ label }: { label: string }) {
  return (
    <View style={styles.affinityPill}>
      <Text style={styles.affinityPillText}>{label}</Text>
    </View>
  );
}

// ── Map Screen ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { sites, loading: sitesLoading, error: sitesError } = useSites();
  const { celestial, pressure, loading: celestialLoading } = useCelestial();
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const mapRef = useRef<MapView>(null);

  const lunarDisplay = celestial ? `${LUNAR_ICONS[celestial.lunar.slot] ?? '🌙'} ${celestial.lunar.slot}` : '—';
  const geoDisplay   = celestial ? `Kp ${celestial.kp.value ?? '—'}` : '—';
  const todDisplay   = celestial ? celestial.tod.slot : '—';
  const seasonDisplay = celestial ? celestial.season : '—';

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
            pinColor={site.site_type === 'coastal' ? Colors.coastal : Colors.landlocked}
            title={site.name}
            description={site.spell_name}
          />
        ))}
      </MapView>

      {sitesLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      )}

      {sitesError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color={Colors.error} />
          <Text style={styles.errorText}>Could not load sites — {sitesError}</Text>
        </View>
      )}

      {celestial?.calendar_event && (
        <View style={styles.eventBanner}>
          <Ionicons name="sparkles" size={13} color={Colors.gold} />
          <Text style={styles.eventBannerText}>
            {celestial.calendar_event.toUpperCase()} · {celestial.event_modifier ?? ''}
          </Text>
        </View>
      )}

      <View style={styles.celestialBar}>
        <CelestialPill icon="moon-outline" label="Lunar" value={lunarDisplay} />
        <CelestialPill icon="thunderstorm-outline" label="Geo" value={geoDisplay} />
        <CelestialPill icon="time-outline" label="Time" value={todDisplay} />
        <CelestialPill icon="leaf-outline" label="Season" value={seasonDisplay} />
        {celestialLoading && <ActivityIndicator size="small" color={Colors.goldDim} />}
      </View>

      {selectedSite && (
        <SiteCard
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
          celestial={celestial}
          pressure={pressure}
        />
      )}
    </View>
  );
}

function CelestialPill({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string;
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
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(14,11,24,0.6)' },
  errorBanner: { position: 'absolute', top: 56, left: Spacing.md, right: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm, borderColor: Colors.error, borderWidth: 1 },
  errorText: { color: Colors.error, fontFamily: Typography.body, fontSize: 12 },
  eventBanner: { position: 'absolute', top: 56, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.goldGlow, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.gold },
  eventBannerText: { fontFamily: Typography.display, fontSize: 11, color: Colors.gold, letterSpacing: 2 },
  celestialBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(14,11,24,0.92)', borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  celestialPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  celestialPillLabel: { color: Colors.textMuted, fontFamily: Typography.body, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },
  celestialPillValue: { color: Colors.textPrimary, fontFamily: Typography.mono, fontSize: 10, textTransform: 'capitalize' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetDismiss: { flex: 1 },
  sheet: { backgroundColor: Colors.bgElevated, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, borderTopWidth: 1, borderTopColor: Colors.border, maxHeight: '80%', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, ...Shadow.card },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full, backgroundColor: Colors.border, marginBottom: Spacing.md },
  siteHeader: { marginBottom: Spacing.md },
  siteTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, marginBottom: Spacing.xs },
  badgeCoastal: { backgroundColor: 'rgba(74,158,187,0.2)', borderWidth: 1, borderColor: Colors.coastal },
  badgeLandlocked: { backgroundColor: 'rgba(122,158,74,0.2)', borderWidth: 1, borderColor: Colors.landlocked },
  siteTypeBadgeText: { fontSize: 10, fontFamily: Typography.body, color: Colors.textSecondary, letterSpacing: 0.5 },
  siteName: { fontFamily: Typography.display, fontSize: 26, color: Colors.textPrimary, letterSpacing: 1 },
  siteRegion: { fontFamily: Typography.body, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  spellBlock: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  spellLabel: { fontFamily: Typography.body, fontSize: 10, color: Colors.goldDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.xs },
  spellName: { fontFamily: Typography.display, fontSize: 18, color: Colors.gold, marginBottom: Spacing.xs },
  spellEffect: { fontFamily: Typography.body, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  conditionsBlock: { marginBottom: Spacing.md },
  conditionsLabel: { fontFamily: Typography.body, fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.xs },
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  conditionCell: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bgCard, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  conditionCellHighlight: { borderColor: Colors.goldDim, backgroundColor: Colors.goldGlow },
  conditionCellLabel: { fontFamily: Typography.body, fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  conditionCellValue: { fontFamily: Typography.mono, fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize', marginLeft: 2 },
  affinityBlock: { marginBottom: Spacing.md },
  affinityLabel: { fontFamily: Typography.body, fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.xs },
  affinityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  affinityPill: { backgroundColor: Colors.goldGlow, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: Colors.goldDim },
  affinityPillText: { fontFamily: Typography.body, fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize' },
  loreBlock: { marginBottom: Spacing.md, paddingLeft: Spacing.md, borderLeftWidth: 2, borderLeftColor: Colors.goldDim },
  loreText: { fontFamily: 'CormorantGaramond-Italic', fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  craftButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.gold, backgroundColor: Colors.gold },
  craftButtonText: { fontFamily: Typography.display, fontSize: 13, color: Colors.bg, letterSpacing: 1 },
});

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
