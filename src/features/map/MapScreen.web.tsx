import React, { useEffect, useState, useMemo } from 'react';
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
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../shared/components/AppHeader';
import { colors, radii, space } from '../../theme/rescueNet';

let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let Circle: any;
let L: any;

if (Platform.OS === 'web') {
  MapContainer = require('react-leaflet').MapContainer;
  TileLayer = require('react-leaflet').TileLayer;
  Marker = require('react-leaflet').Marker;
  Popup = require('react-leaflet').Popup;
  Circle = require('react-leaflet').Circle;
  L = require('leaflet');
  import('leaflet/dist/leaflet.css');
  import('leaflet/dist/images/marker-icon.png');
  import('leaflet/dist/images/marker-shadow.png');
  if (L) {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
}

type Incident = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  type: 'fire' | 'flood' | 'medical' | 'manual';
};

const CHIPS: { key: 'all' | Incident['type']; label: string; count?: number; color: string }[] = [
  { key: 'fire', label: 'FIRE', count: 12, color: '#EF4444' },
  { key: 'flood', label: 'FLOOD', count: 4, color: colors.blue },
  { key: 'medical', label: 'MEDICAL', count: 8, color: '#2D2D2D' },
];

function buildIcons(Leaflet: typeof L) {
  const transparent = { className: 'leaflet-custom-pin', iconSize: [56, 68] as [number, number] };

  const user = Leaflet.divIcon({
    ...transparent,
    html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;position:relative;">
      <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(59,130,246,0.35);"></div>
      <div style="width:18px;height:18px;border-radius:50%;border:3px solid #fff;background:#3B82F6;box-sizing:border-box;"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -12],
    className: '',
  });

  const fireGlow = Leaflet.divIcon({
    ...transparent,
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.45);filter:blur(10px);"></div>
        <div style="width:44px;height:44px;border-radius:50%;background:#EF4444;border:2px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;z-index:1;box-shadow:0 0 22px rgba(239,68,68,0.8);">
          <span style="color:#fff;font-size:20px;">&#x1F525;</span>
        </div>
      </div>
      <div style="width:0;height:0;margin-top:-4px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #EF4444;"></div>
    </div>`,
    iconSize: [56, 68],
    iconAnchor: [28, 66],
    className: '',
  });

  const flood = Leaflet.divIcon({
    ...transparent,
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:44px;height:44px;border-radius:50%;background:#2563EB;border:2px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:18px;">&#x1F30A;</span>
      </div>
      <div style="width:0;height:0;margin-top:-3px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #2563EB;"></div>
    </div>`,
    iconSize: [48, 60],
    iconAnchor: [24, 58],
    className: '',
  });

  const medical = Leaflet.divIcon({
    ...transparent,
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:44px;height:44px;border-radius:50%;background:#EF4444;border:2px solid rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:200;">*</div>
      <div style="width:0;height:0;margin-top:-3px;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #EF4444;"></div>
    </div>`,
    iconSize: [48, 60],
    iconAnchor: [24, 58],
    className: '',
  });

  return { user, fireGlow, flood, medical };
}

function iconForIncident(icons: ReturnType<typeof buildIcons>, type: Incident['type'], id: number) {
  if (type === 'flood') return icons.flood;
  if (type === 'medical') return icons.medical;
  if (type === 'fire') return icons.fireGlow;
  return id % 2 === 0 ? icons.flood : icons.medical;
}

export default function MapScreen() {
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<'all' | Incident['type']>('all');
  const [search, setSearch] = useState('');

  const icons = useMemo(() => (L ? buildIcons(L) : null), []);

  const incidents = useMemo((): Incident[] => {
    if (!location) return [];
    const { lat, lng } = location;
    return [
      { id: 1, lat: lat + 0.018, lng: lng - 0.016, title: 'Fire incident', type: 'fire' },
      { id: 2, lat: lat - 0.014, lng: lng + 0.02, title: 'Flood alert', type: 'flood' },
      { id: 3, lat: lat + 0.011, lng: lng + 0.017, title: 'Medical', type: 'medical' },
    ];
  }, [location]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = incidents;
    if (filter !== 'all') list = list.filter((i) => i.type === filter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q));
    return list;
  }, [incidents, filter, search]);

  if (Platform.OS !== 'web') return null;

  if (!location || !icons) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.coral} />
          <Text style={styles.loadingText}>Initializing map…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.mapLayer}>
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={13}
          scrollWheelZoom
          style={{ flex: 1, height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <Circle
            center={[location.lat, location.lng]}
            radius={1100}
            pathOptions={{
              color: 'rgba(96, 165, 250, 0.45)',
              fillColor: 'rgba(37, 99, 235, 0.14)',
              fillOpacity: 1,
              weight: 1.5,
            }}
          />
          <Marker position={[location.lat, location.lng]} icon={icons.user}>
            <Popup>You are here</Popup>
          </Marker>
          {filtered.map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={iconForIncident(icons, incident.type, incident.id)}
            >
              <Popup>{incident.title}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </View>

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
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
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85}>
          <Ionicons name="locate" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85}>
          <Ionicons name="layers-outline" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 14 }]}
        onPress={() => (navigation as any).navigate('Report')}
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
  root: { flex: 1, backgroundColor: '#000000', position: 'relative' as const },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  topOverlay: {
    position: 'absolute' as const,
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
    position: 'absolute' as const,
    right: 12,
    top: '34%',
    gap: 10,
    zIndex: 15,
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
    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
  },
  fab: {
    position: 'absolute' as const,
    right: 14,
    zIndex: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.coral,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radii.xl,
    zIndex: 500,
    boxShadow: `0 10px 32px ${colors.coralGlow}`,
  },
  fabIconRow: { position: 'relative' as const },
  plusBadge: {
    position: 'absolute' as const,
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
