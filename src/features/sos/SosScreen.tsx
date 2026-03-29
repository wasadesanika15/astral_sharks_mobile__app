import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';
import AppHeader from '../../shared/components/AppHeader';
import { colors, radii, space } from '../../theme/rescueNet';

const HOLD_MS = 900;
const EMERGENCY_ID = `RES-${Math.floor(100 + Math.random() * 900)}-K`;

function formatCoords(lat: number, lng: number) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export default function SosScreen() {
  const [isSending, setIsSending] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<string>('Checking...');
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [placeLabel, setPlaceLabel] = useState('Acquiring location…');

  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringSpin = holdProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    checkNetwork();
    (async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (level != null) setBatteryPct(Math.round(level * 100));
      } catch {
        setBatteryPct(null);
      }
    })();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPlaceLabel('Location permission needed');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({ lat, lng });
      setPlaceLabel('Your approximate area');
    })();

    let sub: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      sub = Accelerometer.addListener((data) => {
        const { x, y, z } = data;
        const a = Math.sqrt(x * x + y * y + z * z);
        if (a > 3.0) triggerSos('Shake Detection');
      });
      Accelerometer.setUpdateInterval(1000);
    }
    return () => sub?.remove();
  }, []);

  const checkNetwork = async () => {
    const net = await Network.getNetworkStateAsync();
    setNetworkStatus(net.isConnected ? 'ONLINE' : 'OFFLINE');
  };

  const triggerSos = async (triggerType: string = 'Manual Button') => {
    if (isSending) return;
    setIsSending(true);

    try {
      let location = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      const batteryLevel = await Battery.getBatteryLevelAsync();
      const network = await Network.getNetworkStateAsync();

      const payload = {
        trigger: triggerType,
        location: location ? { lat: location.lat, lng: location.lng } : null,
        battery: batteryLevel,
        network: network.isConnected,
        timestamp: new Date().toISOString(),
      };

      const result = await apiService.postSOS(payload);

      if (result.queued) {
        Alert.alert(
          'Offline Mode',
          'Network unavailable. SOS queued locally and will be sent upon reconnection.'
        );
      } else {
        Alert.alert('SOS Sent', 'Successfully sent to backend. Hold tight!');
      }
    } catch {
      Alert.alert('Error', 'Failed to process SOS, queued locally.');
      await apiService.postSOS({ trigger: triggerType, error: true });
    } finally {
      setIsSending(false);
    }
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
  };

  const onSosPressIn = () => {
    if (isSending) return;
    holdProgress.setValue(0);
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: true,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdProgress.setValue(0);
      triggerSos('Hold to trigger');
    }, HOLD_MS);
  };

  const onSosPressOut = () => {
    clearHoldTimer();
  };

  const startVoiceDetection = () => {
    Alert.alert('Voice Detection', 'Listening for "Help"...');
    setTimeout(() => triggerSos('Voice Trigger'), 3000);
  };

  const online = networkStatus === 'ONLINE';

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusRow}>
          <View style={styles.statusCell}>
            <Text style={styles.statusLabel}>NETWORK</Text>
            <View style={styles.statusValueRow}>
              <View style={[styles.dot, { backgroundColor: online ? colors.green : colors.coral }]} />
              <Text style={[styles.statusValue, { color: online ? colors.green : colors.coral }]}>
                {networkStatus}
              </Text>
            </View>
          </View>
          <View style={styles.statusCell}>
            <Text style={styles.statusLabel}>POWER</Text>
            <View style={styles.statusValueRow}>
              <Ionicons name="battery-half-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.statusValue}>
                {batteryPct != null ? `${batteryPct}%` : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.statusCell}>
            <Text style={styles.statusLabel}>EMERGENCY AUTH</Text>
            <Text style={styles.authId} numberOfLines={1}>
              ID: {EMERGENCY_ID}
            </Text>
          </View>
        </View>

        <View style={styles.sosWrap}>
          <Animated.View
            style={[
              styles.ringOuter,
              { transform: [{ rotate: ringSpin }] },
            ]}
          >
            <View style={styles.ringArc} />
          </Animated.View>
          <Pressable
            onPressIn={onSosPressIn}
            onPressOut={onSosPressOut}
            disabled={isSending}
            style={({ pressed }) => [
              styles.sosButton,
              isSending && styles.sosButtonDisabled,
              pressed && !isSending && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.sosMain}>{isSending ? 'SENDING…' : 'SOS'}</Text>
            <Text style={styles.sosSub}>HOLD TO TRIGGER</Text>
          </Pressable>
        </View>

        <View style={styles.shakeRow}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.textMuted} />
          <Text style={styles.shakeText}>SHAKE TO TRIGGER ENABLED</Text>
        </View>

        <View style={styles.coordCard}>
          <View style={styles.coordHeader}>
            <Text style={styles.coordTitle}>LIVE COORDINATES</Text>
            <Ionicons name="locate" size={22} color={colors.coral} />
          </View>
          {coords ? (
            <Text style={styles.coordBig}>{formatCoords(coords.lat, coords.lng)}</Text>
          ) : (
            <Text style={styles.coordMuted}>—</Text>
          )}
          <Text style={styles.coordPlace}>{placeLabel}</Text>
          <View style={styles.mapPreview}>
            <Ionicons name="map-outline" size={32} color={colors.textMuted} />
          </View>
        </View>

        <TouchableOpacity style={styles.voiceBtn} onPress={startVoiceDetection} activeOpacity={0.88}>
          <Ionicons name="pulse-outline" size={22} color={colors.peach} />
          <Text style={styles.voiceBtnText}>TAP TO SIMULATE VOICE HELP</Text>
        </TouchableOpacity>

        <View style={styles.miniRow}>
          <View style={styles.miniCard}>
            <Ionicons name="people-outline" size={22} color={colors.blue} />
            <Text style={styles.miniCardText}>
              <Text style={styles.miniStrong}>3</Text> FAMILY NEAR
            </Text>
          </View>
          <View style={styles.miniCard}>
            <Ionicons name="shield-outline" size={22} color={colors.yellow} />
            <Text style={styles.miniCardText}>
              PULSE: <Text style={styles.miniStrong}>72</Text> BPM
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const SOS_SIZE = 220;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: space.lg,
    paddingBottom: 120,
  },
  statusRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCell: { flex: 1, alignItems: 'center', gap: 6 },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  statusValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  authId: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.peach,
    maxWidth: '100%',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sosWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space.lg,
    height: SOS_SIZE + 48,
  },
  ringOuter: {
    position: 'absolute',
    width: SOS_SIZE + 36,
    height: SOS_SIZE + 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringArc: {
    width: SOS_SIZE + 36,
    height: SOS_SIZE + 36,
    borderRadius: (SOS_SIZE + 36) / 2,
    borderWidth: 4,
    borderColor: colors.ringTrack,
    borderTopColor: colors.coral,
  },
  sosButton: {
    width: SOS_SIZE,
    height: SOS_SIZE,
    borderRadius: SOS_SIZE / 2,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  sosButtonDisabled: {
    backgroundColor: '#9B2F26',
    opacity: 0.85,
  },
  sosMain: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 6,
  },
  sosSub: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.92)',
  },
  shakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: space.xl,
  },
  shakeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  coordCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  coordTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  coordBig: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  coordMuted: { fontSize: 20, color: colors.textMuted },
  coordPlace: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  mapPreview: {
    marginTop: space.md,
    height: 72,
    borderRadius: radii.sm,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
  },
  voiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.peach,
  },
  miniRow: { flexDirection: 'row', gap: space.md },
  miniCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniCardText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  miniStrong: { color: colors.text, fontSize: 13 },
});
