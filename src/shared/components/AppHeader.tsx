import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, space } from '../../theme/rescueNet';

type Props = {
  onMenuPress?: () => void;
  /** Transparent bar for full-screen map overlays (reference UI). */
  variant?: 'default' | 'overlay';
};

export default function AppHeader({ onMenuPress, variant = 'default' }: Props) {
  const insets = useSafeAreaInsets();

  const openMenu = () => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    if (Platform.OS === 'web') {
      window.alert('Menu — connect settings / profile here.');
      return;
    }
    Alert.alert('Menu', 'Settings and profile coming soon.');
  };

  return (
    <View
      style={[
        styles.wrap,
        variant === 'overlay' && styles.wrapOverlay,
        { paddingTop: Math.max(insets.top, 12) },
      ]}
    >
      <TouchableOpacity onPress={openMenu} style={styles.iconBtn} hitSlop={12}>
        <Ionicons name="menu" size={26} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>RescueNet SOS</Text>
      <TouchableOpacity style={styles.avatarWrap} onPress={() => openMenu()}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.peach} />
        </View>
        <View style={[styles.onlineDot, variant === 'overlay' && styles.onlineDotOverlay]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.bg,
  },
  wrapOverlay: {
    backgroundColor: 'transparent',
    paddingBottom: space.sm,
  },
  iconBtn: { padding: 4 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.peach,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  onlineDotOverlay: {
    borderColor: 'rgba(12,12,14,0.95)',
  },
});
