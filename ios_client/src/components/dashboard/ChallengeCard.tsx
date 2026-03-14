import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import type { Challenge } from '../../stores/dashboard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

const STATUS_COLORS: Record<string, string> = {
  your_turn: '#22C55E',
  waiting: '#F59E0B',
  incoming: '#3B82F6',
  completed: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
  your_turn: 'Your Turn',
  waiting: 'Waiting',
  incoming: 'New Challenge',
  completed: 'Completed',
};

interface ChallengeCardProps {
  challenge: Challenge;
  onAccept: (challenge: Challenge) => void;
  onDecline: (challenge: Challenge) => void;
  onPress: (challenge: Challenge) => void;
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ChallengeCard({ challenge, onAccept, onDecline, onPress }: ChallengeCardProps) {
  const translateX = useSharedValue(0);
  const cardHeight = useSharedValue(80);
  const isCompleted = challenge.status === 'completed';
  const statusColor = isCompleted
    ? (challenge.won ? '#22C55E' : challenge.tied ? '#F59E0B' : '#EF4444')
    : STATUS_COLORS[challenge.status] ?? '#8B5CF6';
  const statusLabel = isCompleted
    ? (challenge.won ? 'Won' : challenge.tied ? 'Tie' : 'Lost')
    : STATUS_LABELS[challenge.status] ?? 'Done';

  const triggerAccept = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept(challenge);
  }, [challenge, onAccept]);

  const triggerDecline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDecline(challenge);
  }, [challenge, onDecline]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 });
        cardHeight.value = withTiming(0, { duration: 200 });
        runOnJS(triggerAccept)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
        cardHeight.value = withTiming(0, { duration: 200 });
        runOnJS(triggerDecline)();
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: cardHeight.value,
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.8],
      [1, 0.5],
      Extrapolation.CLAMP,
    ),
  }));

  const acceptBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const declineBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.wrapper}>
      {/* Background actions revealed on swipe */}
      <Animated.View style={[styles.swipeBg, styles.acceptBg, acceptBgStyle]}>
        <Text style={styles.swipeBgText}>✓ Accept</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeBg, styles.declineBg, declineBgStyle]}>
        <Text style={styles.swipeBgText}>✕ Decline</Text>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Color-coded left border */}
          <View style={[styles.leftBorder, { backgroundColor: statusColor }]} />

          <TouchableOpacity
            style={styles.cardInner}
            onPress={() => onPress(challenge)}
            activeOpacity={0.7}
          >
            {/* Avatar */}
            <View style={[styles.avatar, { borderColor: statusColor + '60' }]}>
              <Text style={styles.avatarText}>
                {challenge.opponentUsername[0]?.toUpperCase()}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {challenge.opponentUsername}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  {challenge.opponentHandle}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.category}>{challenge.category}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.time}>{getTimeSince(challenge.createdAt)}</Text>
              </View>
            </View>

            {/* Status + Actions */}
            <View style={styles.rightSection}>
              {isCompleted && challenge.myScore !== undefined ? (
                <Text style={[styles.scoreText, { color: statusColor }]}>
                  {challenge.myScore}–{challenge.opponentScore}
                </Text>
              ) : null}
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
              {!isCompleted && (challenge.status === 'incoming' || challenge.status === 'your_turn') && (
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onAccept(challenge);
                    }}
                  >
                    <Text style={styles.acceptBtnText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onDecline(challenge);
                    }}
                  >
                    <Text style={styles.declineBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default React.memo(ChallengeCard);

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  swipeBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  acceptBg: {
    backgroundColor: '#22C55E',
    alignItems: 'flex-start',
  },
  declineBg: {
    backgroundColor: '#EF4444',
    alignItems: 'flex-end',
  },
  swipeBgText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border + '30',
    overflow: 'hidden',
  },
  leftBorder: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  handle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '400',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  time: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#22C55E' + '25',
  },
  acceptBtnText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '800',
  },
  declineBtn: {
    backgroundColor: '#EF4444' + '25',
  },
  declineBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
