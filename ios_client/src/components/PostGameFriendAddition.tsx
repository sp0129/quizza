import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '../api/client';
import { colors } from '../theme/colors';

export interface GamePlayer {
  id: string;
  username: string;
  avatarId?: number;
  isFriend?: boolean;
}

interface PostGameFriendAdditionProps {
  visible: boolean;
  players: GamePlayer[];
  isGuest: boolean;
  onDismiss: () => void;
  onCreateAccount: () => void;
}

export default function PostGameFriendAddition({
  visible,
  players,
  isGuest,
  onDismiss,
  onCreateAccount,
}: PostGameFriendAdditionProps) {
  const insets = useSafeAreaInsets();
  const [addingAll, setAddingAll] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  // Filter to non-friend players only
  const nonFriendPlayers = players.filter((p) => !p.isFriend && !addedIds.has(p.id));
  const allAdded = nonFriendPlayers.length === 0 && addedIds.size > 0;

  const addSingleFriend = useCallback(async (player: GamePlayer) => {
    setAddingIds((prev) => new Set(prev).add(player.id));
    try {
      await api.post('/friends', { username: player.username });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedIds((prev) => new Set(prev).add(player.id));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add friend');
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(player.id);
        return next;
      });
    }
  }, []);

  const addAllFriends = useCallback(async () => {
    setAddingAll(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toAdd = players.filter((p) => !p.isFriend && !addedIds.has(p.id));
    const results = await Promise.allSettled(
      toAdd.map((p) =>
        api.post('/friends', { username: p.username }).then(() => p.id),
      ),
    );
    const newAdded = new Set(addedIds);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newAdded.add(result.value);
      }
    }
    setAddedIds(newAdded);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingAll(false);
  }, [players, addedIds]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <Animated.View
        entering={SlideInDown.duration(350).springify().damping(18)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isGuest ? 'Want to add friends?' : 'Add these players as friends?'}
          </Text>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isGuest ? (
          /* Guest CTA */
          <View style={styles.guestContainer}>
            <Text style={styles.guestIcon}>🎉</Text>
            <Text style={styles.guestText}>
              Create an account to add friends and challenge them to trivia duels!
            </Text>
            <TouchableOpacity
              style={styles.createAccountBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCreateAccount();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.createAccountBtnText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        ) : allAdded ? (
          /* All added state */
          <View style={styles.allAddedContainer}>
            <Text style={styles.allAddedIcon}>🎉</Text>
            <Text style={styles.allAddedText}>All players added as friends!</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onDismiss} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Player list */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playerScroll}
            >
              {players
                .filter((p) => !p.isFriend)
                .map((player) => {
                  const isAdded = addedIds.has(player.id);
                  const isAdding = addingIds.has(player.id);
                  return (
                    <View key={player.id} style={styles.playerCard}>
                      <View style={styles.playerAvatar}>
                        <Text style={styles.playerAvatarText}>
                          {player.username[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {player.username}
                      </Text>
                      {isAdded ? (
                        <View style={styles.addedBadge}>
                          <Text style={styles.addedBadgeText}>Added ✓</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addPlayerBtn}
                          onPress={() => addSingleFriend(player)}
                          disabled={isAdding}
                          activeOpacity={0.7}
                        >
                          {isAdding ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.addPlayerBtnText}>+ Add</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.addAllBtn}
                onPress={addAllFriends}
                disabled={addingAll}
                activeOpacity={0.85}
              >
                {addingAll ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.addAllBtnText}>Add All</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 150,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border + '30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeBtnText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Player cards
  playerScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  playerCard: {
    alignItems: 'center',
    width: 90,
    gap: 6,
  },
  playerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand.primary + '40',
  },
  playerAvatarText: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  playerName: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
  addPlayerBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  addPlayerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  addedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  addedBadgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  addAllBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    // Glow
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  addAllBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  skipBtnText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Guest
  guestContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  guestIcon: {
    fontSize: 44,
  },
  guestText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  createAccountBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    minWidth: 200,
    alignItems: 'center',
  },
  createAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // All added
  allAddedContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  allAddedIcon: {
    fontSize: 44,
  },
  allAddedText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    minWidth: 160,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
