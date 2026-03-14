import React, { useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { colors } from '../../theme/colors';
import ChallengeCard from './ChallengeCard';
import EmptyState from './EmptyState';
import type { Challenge } from '../../stores/dashboard';

interface ChallengesFeedProps {
  challenges: Challenge[];
  loading: boolean;
  onAccept: (challenge: Challenge) => void;
  onDecline: (challenge: Challenge) => void;
  onPress: (challenge: Challenge) => void;
  onRefresh: () => void;
  onChallengeNewFriend: () => void;
  maxVisible?: number;
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.7 }}
      transition={{ type: 'timing', duration: 800, loop: true }}
      style={skeletonStyles.card}
    >
      <View style={skeletonStyles.leftBorder} />
      <View style={skeletonStyles.inner}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.info}>
          <View style={skeletonStyles.nameLine} />
          <View style={skeletonStyles.detailLine} />
        </View>
        <View style={skeletonStyles.badge} />
      </View>
    </MotiView>
  );
}

function SkeletonLoader() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

function ChallengesFeed({
  challenges,
  loading,
  onAccept,
  onDecline,
  onPress,
  onRefresh,
  onChallengeNewFriend,
  maxVisible = 5,
}: ChallengesFeedProps) {
  const visibleChallenges = challenges.slice(0, maxVisible);
  const hasMore = challenges.length > maxVisible;

  const renderItem = useCallback(
    ({ item }: { item: Challenge }) => (
      <ChallengeCard
        challenge={item}
        onAccept={onAccept}
        onDecline={onDecline}
        onPress={onPress}
      />
    ),
    [onAccept, onDecline, onPress],
  );

  const keyExtractor = useCallback((item: Challenge) => item.id, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionIcon}>⚔️</Text>
          <Text style={styles.sectionTitle}>PENDING CHALLENGES</Text>
        </View>
        <SkeletonLoader />
      </View>
    );
  }

  if (challenges.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionIcon}>⚔️</Text>
          <Text style={styles.sectionTitle}>CHALLENGES</Text>
        </View>
        <EmptyState
          icon="🎯"
          title="Ready for a challenge?"
          description="Pick a friend and put your knowledge to the test."
          ctaLabel="Challenge a Friend"
          onCtaPress={onChallengeNewFriend}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionIcon}>⚔️</Text>
        <Text style={styles.sectionTitle}>CHALLENGES</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{challenges.length}</Text>
        </View>
      </View>

      <FlashList
        data={visibleChallenges}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={80}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
          />
        }
      />

      {hasMore && (
        <View style={styles.viewMore}>
          <Text style={styles.viewMoreText}>
            +{challenges.length - maxVisible} more challenges
          </Text>
        </View>
      )}
    </View>
  );
}

export default React.memo(ChallengesFeed);

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  viewMore: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewMoreText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonContainer: {
    gap: 8,
    paddingHorizontal: 16,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    overflow: 'hidden',
    height: 72,
  },
  leftBorder: {
    width: 4,
    backgroundColor: colors.bg.elevated,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  nameLine: {
    height: 14,
    width: '60%',
    backgroundColor: colors.bg.elevated,
    borderRadius: 4,
  },
  detailLine: {
    height: 10,
    width: '40%',
    backgroundColor: colors.bg.elevated,
    borderRadius: 4,
  },
  badge: {
    width: 60,
    height: 22,
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
  },
});
