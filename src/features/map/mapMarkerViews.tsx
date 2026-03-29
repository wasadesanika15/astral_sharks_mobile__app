import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Blue dot with white border — user location (reference UI). */
export function UserLocationDot() {
  return (
    <View style={userStyles.wrap}>
      <View style={userStyles.dot} />
    </View>
  );
}

const userStyles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#3B82F6',
    ...Platform.select({
      default: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 8,
        elevation: 6,
      },
      web: { boxShadow: '0 0 12px rgba(59, 130, 246, 0.65)' },
    }),
  },
});

type PinKind = 'fireGlow' | 'flood' | 'medicalAsterisk';

export function IncidentMapPin({ kind }: { kind: PinKind }) {
  const headColor = kind === 'flood' ? '#2563EB' : '#EF4444';
  const showGlow = kind === 'fireGlow';

  return (
    <View style={pinStyles.anchor}>
      {showGlow && (
        <View style={pinStyles.glowStack} pointerEvents="none">
          <View style={pinStyles.glowBlob} />
        </View>
      )}
      <View style={[pinStyles.head, { backgroundColor: headColor }]}>
        {kind === 'fireGlow' && <Ionicons name="flame" size={20} color="#FFFFFF" />}
        {kind === 'flood' && <Ionicons name="water" size={20} color="#FFFFFF" />}
        {kind === 'medicalAsterisk' && (
          <Text style={pinStyles.asterisk}>*</Text>
        )}
      </View>
      <View style={[pinStyles.tail, { borderTopColor: headColor }]} />
    </View>
  );
}

const pinStyles = StyleSheet.create({
  anchor: {
    alignItems: 'center',
    width: 56,
  },
  glowStack: {
    position: 'absolute',
    top: -8,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBlob: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.45)',
    ...Platform.select({
      default: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 12,
      },
      web: {
        boxShadow: '0 0 24px 10px rgba(239, 68, 68, 0.55)',
      },
    }),
  },
  head: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    zIndex: 2,
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -3,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    zIndex: 1,
  },
  asterisk: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '200',
    marginTop: -4,
  },
});

export function kindForIncident(
  type: 'fire' | 'flood' | 'medical' | 'manual',
  id: number
): PinKind {
  if (type === 'flood') return 'flood';
  if (type === 'medical') return 'medicalAsterisk';
  if (type === 'fire') return 'fireGlow';
  return id % 2 === 0 ? 'flood' : 'medicalAsterisk';
}
