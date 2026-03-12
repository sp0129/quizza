import React, { useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface TabItem {
  key: string;
  icon: string;
  label: string;
  badge?: number;
}

interface BottomNavProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  onPlayPress: () => void;
  badges?: { [key: string]: number };
}

const TABS: TabItem[] = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'leaderboard', icon: '🏆', label: 'Board' },
  { key: 'play', icon: '▶', label: 'PLAY' },
  { key: 'friends', icon: '👥', label: 'Friends' },
  { key: 'profile', icon: '👤', label: 'Profile' },
];

function TabButton({
  tab,
  isActive,
  badge,
  onPress,
}: {
  tab: TabItem;
  isActive: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    if (badge && badge > 0) {
      badgeScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    }
  }, [badge, badgeScale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
        {tab.icon}
      </Text>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {tab.label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <Animated.View style={[styles.tabBadge, badgeStyle]}>
          <Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

function BottomNav({ activeTab, onTabPress, onPlayPress, badges = {} }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const fabScale = useSharedValue(1);

  const handleFabPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fabScale.value = withSequence(
      withSpring(0.9, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    onPlayPress();
  }, [onPlayPress, fabScale]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Tab bar background */}
      <View style={styles.bar}>
        {TABS.map((tab) => {
          if (tab.key === 'play') {
            return <View key="play-spacer" style={styles.fabSpacer} />;
          }
          return (
            <TabButton
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              badge={badges[tab.key]}
              onPress={() => onTabPress(tab.key)}
            />
          );
        })}
      </View>

      {/* Center FAB */}
      <Animated.View style={[styles.fabWrapper, fabStyle]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleFabPress}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>▶</Text>
          <Text style={styles.fabLabel}>PLAY</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default React.memo(BottomNav);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  tabBadge: {
    position: 'absolute',
    top: 2,
    right: '25%',
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  fabSpacer: {
    width: 64,
  },
  fabWrapper: {
    position: 'absolute',
    top: -24,
    left: '50%',
    marginLeft: -32,
    zIndex: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.bg.primary,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: -2,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
