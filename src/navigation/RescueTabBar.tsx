import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, space } from '../theme/rescueNet';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon?: keyof typeof Ionicons.glyphMap }
> = {
  SOS: { label: 'SOS', icon: 'navigate-circle-outline', activeIcon: 'navigate-circle' },
  Map: { label: 'MAP', icon: 'map-outline', activeIcon: 'map' },
  Report: { label: 'REPORT', icon: 'camera-outline', activeIcon: 'camera' },
  Family: { label: 'FAMILY', icon: 'people-outline', activeIcon: 'people' },
};

export default function RescueTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const cfg = TAB_CONFIG[route.name] ?? {
          label: String(route.name).toUpperCase(),
          icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
        };
        const iconName =
          isFocused && 'activeIcon' in cfg && cfg.activeIcon ? cfg.activeIcon : cfg.icon;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.iconPill,
                isFocused && styles.iconPillActive,
              ]}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? colors.text : colors.textMuted}
              />
            </View>
            <Text
              style={[styles.label, isFocused && styles.labelActive]}
              numberOfLines={1}
            >
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.sm,
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.45)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: colors.coral,
    ...Platform.select({
      web: { boxShadow: `0 0 20px ${colors.coralGlow}` },
      default: {
        shadowColor: colors.coral,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
    }),
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.text,
  },
});
