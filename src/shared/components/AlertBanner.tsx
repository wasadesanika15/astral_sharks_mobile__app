import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { socketService } from '../../services/socketService';
import { colors, radii, space } from '../../theme/rescueNet';

export default function AlertBanner() {
  const insets = useSafeAreaInsets();
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const slideAnim = useState(new Animated.Value(-120))[0];

  useEffect(() => {
    socketService.connect();

    socketService.on('emergency_broadcast', (data: any) => {
      setAlertMsg(data.message || 'EMERGENCY ALERT ISSUED FOR YOUR AREA');
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 280,
          useNativeDriver: true,
        }).start(() => setAlertMsg(null));
      }, 6000);
    });

    return () => {
      socketService.off('emergency_broadcast');
    };
  }, []);

  if (!alertMsg) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Ionicons name="warning" size={22} color={colors.text} style={styles.icon} />
      <Text style={styles.text}>{alertMsg}</Text>
      <TouchableOpacity
        onPress={() => {
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setAlertMsg(null));
        }}
        hitSlop={12}
      >
        <Ionicons name="close" size={22} color={colors.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.coral,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      web: { boxShadow: `0 12px 40px ${colors.coralGlow}` },
      default: {
        shadowColor: colors.coral,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
    }),
  },
  icon: { marginRight: 4 },
  text: {
    flex: 1,
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 19,
  },
});
