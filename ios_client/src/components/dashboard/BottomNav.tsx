import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface TabItem {
  key: string;
  icon: string;
  label: string;
}

interface BottomNavProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  badges?: { [key: string]: number };
}

const TABS: TabItem[] = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'leaderboard', icon: '🏆', label: 'Board' },
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

function BottomNav({ activeTab, onTabPress, badges = {} }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            badge={badges[tab.key]}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

export default React.memo(BottomNav);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
    height: 50,
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
});
