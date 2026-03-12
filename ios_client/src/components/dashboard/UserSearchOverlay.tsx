import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { useDashboardStore, SearchedUser } from '../../stores/dashboard';
import { colors } from '../../theme/colors';

interface UserSearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: SearchedUser) => void;
  actionLabel?: string;
}

function UserSearchOverlay({
  visible,
  onClose,
  onSelectUser,
  actionLabel = 'Challenge',
}: UserSearchOverlayProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const {
    searchResults,
    recentSearches,
    searchLoading,
    setSearchResults,
    setSearchLoading,
    addRecentSearch,
  } = useDashboardStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when overlay appears
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setSearchResults([]);
    }
  }, [visible, setSearchResults]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.get<
          { id: string; username: string; profile_picture_url?: string }[]
        >(`/users/search?q=${encodeURIComponent(query.trim())}`);
        setSearchResults(
          results.map((u) => ({
            id: u.id,
            username: u.username,
            handle: `@${u.username.toLowerCase()}`,
            profilePictureUrl: u.profile_picture_url,
          })),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, setSearchResults, setSearchLoading]);

  const handleSelect = useCallback(
    (user: SearchedUser) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      addRecentSearch(user);
      onSelectUser(user);
    },
    [onSelectUser, addRecentSearch],
  );

  const displayList =
    query.length >= 2
      ? searchResults
      : recentSearches.length > 0
        ? recentSearches
        : [];

  const showRecentHeader = query.length < 2 && recentSearches.length > 0;

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.overlay]}
    >
      <Animated.View
        entering={SlideInDown.duration(300).springify().damping(18)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Find Friends</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search by @username..."
            placeholderTextColor={colors.text.secondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {searchLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.brand.primary} size="small" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {showRecentHeader && (
          <Text style={styles.sectionLabel}>RECENT</Text>
        )}

        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SearchResultItem
              user={item}
              actionLabel={actionLabel}
              onSelect={handleSelect}
            />
          )}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={
            query.length >= 2 && !searchLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No users found for "{query}"</Text>
              </View>
            ) : null
          }
        />
      </Animated.View>
    </Animated.View>
  );
}

function SearchResultItem({
  user,
  actionLabel,
  onSelect,
}: {
  user: SearchedUser;
  actionLabel: string;
  onSelect: (user: SearchedUser) => void;
}) {
  return (
    <View style={itemStyles.container}>
      {/* Avatar */}
      <View style={itemStyles.avatar}>
        <Text style={itemStyles.avatarText}>
          {user.username[0]?.toUpperCase()}
        </Text>
        {user.isOnline && <View style={itemStyles.onlineDot} />}
      </View>

      {/* Name + Handle */}
      <View style={itemStyles.info}>
        <Text style={itemStyles.name} numberOfLines={1}>
          {user.username}
        </Text>
        <Text style={itemStyles.handle} numberOfLines={1}>
          {user.handle}
        </Text>
        {user.mutualFriends && user.mutualFriends.length > 0 && (
          <Text style={itemStyles.mutual} numberOfLines={1}>
            Also friends with @{user.mutualFriends[0]}
          </Text>
        )}
      </View>

      {/* Action */}
      <TouchableOpacity
        style={itemStyles.actionBtn}
        onPress={() => onSelect(user)}
        activeOpacity={0.7}
      >
        <Text style={itemStyles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(UserSearchOverlay);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border + '40',
    gap: 8,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
});

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.bg.primary,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  handle: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  mutual: {
    color: colors.text.secondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
