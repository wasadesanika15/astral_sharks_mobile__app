import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { socketService } from '../../services/socketService';
import AppHeader from '../../shared/components/AppHeader';
import { colors, radii, space } from '../../theme/rescueNet';

type Contact = {
  id: string;
  name: string;
  phone: string;
  status: 'Safe' | 'Need Help' | 'Unknown';
  location: string | null;
  lastSeen?: string;
};

const INITIAL: Contact[] = [
  {
    id: '1',
    name: 'Sarah',
    phone: '+1 234 567 8901',
    status: 'Safe',
    location: 'Central Park, North Entrance',
  },
  {
    id: '2',
    name: 'Mom',
    phone: '+1 987 654 3210',
    status: 'Need Help',
    location: '88 Market St (Home)',
  },
  {
    id: '3',
    name: 'Dad',
    phone: '+1 555 010 2030',
    status: 'Unknown',
    location: null,
    lastSeen: 'Last seen 2h ago at Office',
  },
];

function Avatar({ name, tone }: { name: string; tone: 'safe' | 'help' | 'unknown' }) {
  const initial = name.charAt(0).toUpperCase();
  const border =
    tone === 'safe' ? colors.green : tone === 'help' ? colors.coral : colors.textMuted;
  return (
    <View style={[styles.avatar, { borderColor: border }]}>
      <Text style={styles.avatarText}>{initial}</Text>
      <View
        style={[
          styles.avatarDot,
          {
            backgroundColor:
              tone === 'safe' ? colors.green : tone === 'help' ? colors.coral : colors.textMuted,
          },
        ]}
      />
    </View>
  );
}

export default function FamilyScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState<Contact[]>(INITIAL);
  const [myStatus, setMyStatus] = useState<'Safe' | 'Need Help'>('Safe');

  useEffect(() => {
    socketService.connect();
    socketService.on('family_status_update', (data: any) => {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === data.userId
            ? { ...c, status: data.status as Contact['status'], location: data.location }
            : c
        )
      );
    });
    return () => {
      socketService.off('family_status_update');
    };
  }, []);

  const broadcastMyStatus = async (status: 'Safe' | 'Need Help') => {
    setMyStatus(status);
    let locationStr = 'Unknown';
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      locationStr = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
    }
    socketService.emit('update_status', {
      userId: 'my_id',
      status,
      location: locationStr,
    });
    Alert.alert('Status updated', `Broadcast to family: ${status}`);
  };

  const tone = (s: Contact['status']): 'safe' | 'help' | 'unknown' =>
    s === 'Safe' ? 'safe' : s === 'Need Help' ? 'help' : 'unknown';

  const badgeStyle = (s: Contact['status']) => {
    if (s === 'Safe') return { bg: colors.greenMuted, text: colors.green };
    if (s === 'Need Help') return { bg: 'rgba(255, 92, 77, 0.25)', text: colors.coral };
    return { bg: 'rgba(115,115,115,0.35)', text: colors.textMuted };
  };

  const renderItem = ({ item }: { item: Contact }) => {
    const b = badgeStyle(item.status);
    const t = tone(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Avatar name={item.name} tone={t} />
          <View style={styles.cardBody}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {item.location ? (
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={16} color={colors.peach} />
                <Text style={styles.locText}>{item.location}</Text>
              </View>
            ) : (
              <View style={styles.locRow}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={styles.lastSeen}>{item.lastSeen || 'Loc unknown'}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.badge, { backgroundColor: b.bg }]}>
              <Text style={[styles.badgeText, { color: b.text }]}>
                {item.status === 'Need Help' ? 'NEED HELP' : item.status.toUpperCase()}
              </Text>
            </View>
            {item.status === 'Need Help' && (
              <TouchableOpacity
                style={styles.callUrgent}
                onPress={() => Linking.openURL(`tel:${item.phone.replace(/\s/g, '')}`)}
              >
                <Ionicons name="call" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader />
      <FlatList
        data={contacts}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.statusLabel}>YOUR PERSONAL STATUS</Text>
                <View style={styles.gpsPill}>
                  <View style={styles.gpsDot} />
                  <Text style={styles.gpsText}>GPS Enabled</Text>
                </View>
              </View>
              <Text style={styles.statusMain}>
                Currently: <Text style={{ color: colors.text }}>Active</Text>
              </Text>
              <View style={styles.statusBtns}>
                <TouchableOpacity
                  style={[styles.safeBtn, myStatus === 'Safe' && styles.safeBtnActive]}
                  onPress={() => broadcastMyStatus('Safe')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="checkmark-circle" size={22} color={colors.text} />
                  <Text style={styles.safeBtnText}>I'm Safe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.helpBtn, myStatus === 'Need Help' && styles.helpBtnActive]}
                  onPress={() => broadcastMyStatus('Need Help')}
                  activeOpacity={0.9}
                >
                  <Ionicons name="warning" size={22} color={colors.text} />
                  <Text style={styles.helpBtnText}>Need Help</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionTitle}>Family Circle</Text>
                <Text style={styles.sectionSub}>3 members active</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Platform.OS === 'web'
                    ? alert('Add family member')
                    : Alert.alert('Add member', 'Invite flow coming soon.')
                }
              >
                <Text style={styles.addLink}>+ Add Member</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.trackingCard}
            onPress={() => (navigation as any).navigate('Map')}
            activeOpacity={0.9}
          >
            <View style={styles.trackingInner}>
              <View>
                <Text style={styles.trackingTitle}>Live Tracking</Text>
                <Text style={styles.trackingSub}>All members on grid</Text>
              </View>
              <View style={styles.trackingIcon}>
                <Ionicons name="map" size={22} color={colors.text} />
              </View>
            </View>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: space.lg, paddingBottom: 120 },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  gpsText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusMain: { fontSize: 22, fontWeight: '800', color: colors.textSecondary, marginBottom: space.lg },
  statusBtns: { flexDirection: 'row', gap: space.md },
  safeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: radii.md,
    opacity: 0.85,
  },
  safeBtnActive: { opacity: 1 },
  safeBtnText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  helpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.coral,
    paddingVertical: 16,
    borderRadius: radii.md,
    opacity: 0.85,
  },
  helpBtnActive: { opacity: 1 },
  helpBtnText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.md,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  addLink: { fontSize: 14, fontWeight: '700', color: colors.blue, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.text },
  avatarDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.card,
  },
  cardBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  phone: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  locText: { flex: 1, fontSize: 13, color: colors.peach, fontWeight: '600' },
  lastSeen: { flex: 1, fontSize: 13, color: colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  callUrgent: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingCard: {
    marginTop: space.lg,
    marginBottom: space.xl,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  trackingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
  },
  trackingTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  trackingSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  trackingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
