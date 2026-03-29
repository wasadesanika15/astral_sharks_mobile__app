import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AppHeader from '../../shared/components/AppHeader';
import { colors, radii, space } from '../../theme/rescueNet';
import { DARK_MAP_STYLE } from './mapDarkStyle';
import { UserLocationDot, IncidentMapPin, kindForIncident } from './mapMarkerViews';

type Incident = {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  type: 'fire' | 'flood' | 'medical' | 'manual';
};

const CHIPS: { key: 'all' | Incident['type']; label: string; count?: number; color: string }[] = [
  { key: 'fire', label: 'FIRE', count: 12, color: '#EF4444' },
  { key: 'flood', label: 'FLOOD', count: 4, color: colors.blue },
  { key: 'medical', label: 'MEDICAL', count: 8, color: '#2D2D2D' },
];

export default function MapScreen() {
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | Incident['type']>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      });
    })();
  }, []);

  /** Pins placed around user so the map matches the reference layout. */
  const incidents = useMemo((): Incident[] => {
    if (!region) return [];
    const { latitude: lat, longitude: lng } = region;
    return [
      {
        id: 1,
        latitude: lat + 0.018,
        longitude: lng - 0.016,
        title: 'Fire incident',
        type: 'fire',
      },
      {
        id: 2,
        latitude: lat - 0.014,
        longitude: lng + 0.02,
        title: 'Flood alert',
        type: 'flood',
      },
      {
        id: 3,
        latitude: lat + 0.011,
        longitude: lng + 0.017,
        title: 'Medical',
        type: 'medical',
      },
    ];
  }, [region]);

  const filtered = useMemo(() => {
    let list = incidents;
    if (filter !== 'all') list = list.filter((i) => i.type === filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q));
    return list;
  }, [incidents, filter, search]);

  const recenter = () => {
    if (region && mapRef.current) {
      mapRef.current.animateToRegion(region, 400);
    }
  };

  const zoom = (factor: number) => {
    if (!region) return;
    const next = {
      ...region,
      latitudeDelta: Math.max(0.004, region.latitudeDelta * factor),
      longitudeDelta: Math.max(0.004, region.longitudeDelta * factor),
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 280);
  };

  const openReportTab = () => {
    (navigation as any).navigate('Report');
  };

  if (!region) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.coral} />
          <Text style={styles.loadingText}>Fetching location…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle="dark"
      >
        <Circle
          center={{ latitude: region.latitude, longitude: region.longitude }}
          radius={1100}
          fillColor="rgba(37, 99, 235, 0.14)"
          strokeColor="rgba(96, 165, 250, 0.45)"
          strokeWidth={1.5}
        />

        <Marker
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <UserLocationDot />
        </Marker>

        {filtered.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
            title={incident.title}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <IncidentMapPin kind={kindForIncident(incident.type, incident.id)} />
          </Marker>
        ))}
      </MapView>

      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topOverlayInner} pointerEvents="box-none">
          <AppHeader variant="overlay" />
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search safety zones..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7}>
              <Ionicons name="options-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {CHIPS.map((c) => {
              const active = filter === c.key;
              const baseBg = c.key === 'medical' && !active ? '#2D2D2D' : colors.card;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setFilter(active ? 'all' : c.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? c.color : baseBg },
                    c.key === 'medical' && !active && { borderWidth: 1, borderColor: '#3F3F46' },
                  ]}
                  activeOpacity={0.85}
                >
                  {c.key === 'fire' && (
                    <Ionicons name="flame" size={16} color={active ? '#fff' : '#F87171'} />
                  )}
                  {c.key === 'flood' && (
                    <Ionicons name="water" size={16} color={active ? '#fff' : colors.blue} />
                  )}
                  {c.key === 'medical' && (
                    <Ionicons name="medkit" size={16} color={active ? '#fff' : '#E5E5E5'} />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextOn,
                      !active && c.key === 'medical' && { color: '#D4D4D4' },
                    ]}
                  >
                    {c.label}
                    {c.count != null ? ` (${c.count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.mapControls} pointerEvents="box-none">
        <TouchableOpacity style={styles.ctrlBtn} onPress={recenter} activeOpacity={0.85}>
          <Ionicons name="locate" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85}>
          <Ionicons name="layers-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => zoom(0.62)} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => zoom(1.5)} activeOpacity={0.85}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 14 }]}
        onPress={openReportTab}
        activeOpacity={0.92}
      >
        <View style={styles.fabIconRow}>
          <Ionicons name="camera-outline" size={22} color={colors.text} />
          <View style={styles.plusBadge}>
            <Ionicons name="add" size={14} color={colors.coral} />
          </View>
        </View>
        <Text style={styles.fabText}>Report Incident</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topOverlayInner: {
    backgroundColor: 'rgba(8, 8, 10, 0.88)',
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingBottom: space.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: '#1A1A1C',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    paddingHorizontal: space.md,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 16,
  },
  filterIconBtn: { padding: 6 },
  chipsRow: {
    paddingHorizontal: space.lg,
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radii.pill,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#A3A3A3',
  },
  chipTextOn: { color: '#FFFFFF' },
  mapControls: {
    position: 'absolute',
    right: 12,
    top: '34%',
    zIndex: 15,
    gap: 10,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(22, 22, 24, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(0,0,0,0.5)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  fab: {
    position: 'absolute',
    right: 14,
    zIndex: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.coral,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radii.xl,
    ...Platform.select({
      web: { boxShadow: `0 10px 32px ${colors.coralGlow}` },
      default: {
        shadowColor: colors.coral,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  fabIconRow: { position: 'relative' },
  plusBadge: {
    position: 'absolute',
    right: -10,
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.coral,
  },
  fabText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
