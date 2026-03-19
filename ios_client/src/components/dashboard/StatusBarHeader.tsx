import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { getAvatar } from '../../utils/avatars';
import type { UserMetrics } from '../../stores/dashboard';

interface StatusBarHeaderProps {
  username: string;
  metrics: UserMetrics;
  avatarInitial: string;
  onProfilePress: () => void;
  avatarId?: number;
  greeting?: string;
}

function StatusBarHeader({
  username,
  metrics,
  avatarInitial,
  greeting,
  avatarId,
  onProfilePress,
}: StatusBarHeaderProps) {
  const insets = useSafeAreaInsets();
  const streakScale = useSharedValue(1);

  useEffect(() => {
    if (metrics.streak > 0) {
      streakScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    }
  }, [metrics.streak, streakScale]);

  const streakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
  }));

  const avatar = getAvatar(avatarId);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {/* Left: Avatar + Level */}
        <TouchableOpacity style={styles.left} onPress={onProfilePress} activeOpacity={0.7}>
          <View style={styles.avatar}>
            {avatar ? (
              <Image source={avatar.image} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            )}
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv.{metrics.level}</Text>
          </View>
        </TouchableOpacity>

        {/* Center: Welcome */}
        <View style={styles.center}>
          <Text style={styles.welcomeText} numberOfLines={1}>
            {greeting ?? 'Welcome back'}
          </Text>
          <Text style={styles.usernameText} numberOfLines={1}>
            @{username}
          </Text>
        </View>

        {/* Right: Gems + Streak */}
        <View style={styles.right}>
          <View style={styles.gemsPill}>
            <Text style={styles.gemsIcon}>💎</Text>
            <Text style={styles.gemsText}>{metrics.gems}</Text>
          </View>
          <Animated.View style={[styles.streakPill, streakStyle]}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{metrics.streak}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export default React.memo(StatusBarHeader);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand.primary,
    overflow: 'hidden',
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  levelBadge: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  welcomeText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  usernameText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gemsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  gemsIcon: {
    fontSize: 12,
  },
  gemsText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316' + '25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  streakIcon: {
    fontSize: 12,
  },
  streakText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '800',
  },
});
