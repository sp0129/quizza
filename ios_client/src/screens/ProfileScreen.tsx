import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import { AVATARS, getAvatar } from '../utils/avatars';
import { isSoundEnabled, setSoundEnabled } from '../utils/sounds';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface Friend {
  id: string;
  username: string;
  avatar_id?: number;
}

interface UserSearch {
  id: string;
  username: string;
  avatar_id?: number;
  is_friend: boolean;
}

export function UserAvatar({ avatarId, username, size }: { avatarId?: number; username: string; size: number }) {
  const avatar = getAvatar(avatarId);
  if (avatar) {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: 'rgba(124,58,237,0.12)',
        overflow: 'hidden',
        borderWidth: 2, borderColor: 'rgba(124,58,237,0.3)',
      }}>
        <Image
          source={avatar.image}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(124,58,237,0.3)',
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: colors.textPrimary, fontSize: size * 0.4, fontWeight: '700' }}>
        {username[0]?.toUpperCase()}
      </Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { user, refreshUser, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState(user?.username ?? '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<UserSearch[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    api.get<Friend[]>('/friends').then(setFriends).catch(console.error).finally(() => setFriendsLoading(false));
  }, []);

  useEffect(() => {
    if (addQuery.trim().length < 2) { setAddResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await api.get<UserSearch[]>(`/users/search?q=${encodeURIComponent(addQuery.trim())}`);
        setAddResults(results);
      } catch { setAddResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [addQuery]);

  const saveUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === user?.username) return;
    if (trimmed.length < 3) { setUsernameError('Minimum 3 characters'); return; }
    setUsernameError('');
    setUsernameLoading(true);
    try {
      const updated = await api.put<{ username: string }>('/users/me', { username: trimmed });
      refreshUser({ username: updated.username });
    } catch (err: any) {
      setUsernameError(err.message);
    } finally {
      setUsernameLoading(false);
    }
  };

  const selectAvatar = async (avatarId: number) => {
    setSavingAvatarId(avatarId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updated = await api.put<{ avatar_id: number }>('/users/me', { avatarId });
      refreshUser({ avatar_id: updated.avatar_id });
      setShowAvatarPicker(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingAvatarId(null);
    }
  };

  const addFriend = async (friendUsername: string) => {
    setAddLoading(true);
    try {
      await api.post('/friends', { username: friendUsername });
      const updated = await api.get<Friend[]>('/friends');
      setFriends(updated);
      setAddQuery('');
      setAddResults([]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const removeFriend = (friend: Friend) => {
    Alert.alert('Remove friend', `Remove ${friend.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete<void>(`/friends/${friend.id}`);
            setFriends(prev => prev.filter(f => f.id !== friend.id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={gradients.bg} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ width: 36 }} />
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <TouchableOpacity
            onPress={() => setShowAvatarPicker(!showAvatarPicker)}
            style={s.avatarWrap}
          >
            <UserAvatar avatarId={user?.avatar_id} username={user?.username ?? '?'} size={90} />
            <View style={s.avatarEditBadge}>
              <Text style={s.avatarEditText}>✏️</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.avatarHint}>Tap to change avatar</Text>
        </View>

        {/* Avatar picker */}
        {showAvatarPicker && (
          <View style={s.avatarPickerCard}>
            <Text style={s.cardLabel}>Choose your avatar</Text>
            <View style={s.avatarGrid}>
              {AVATARS.map((a) => {
                const isSelected = user?.avatar_id === a.id;
                const isSaving = savingAvatarId === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.avatarOption, isSelected && s.avatarOptionSelected]}
                    onPress={() => selectAvatar(a.id)}
                    disabled={savingAvatarId !== null}
                    activeOpacity={0.7}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.textPrimary} size="small" />
                    ) : (
                      <Image source={a.image} style={s.avatarOptionImage} resizeMode="contain" />
                    )}
                    <Text style={[s.avatarOptionLabel, isSelected && s.avatarOptionLabelSelected]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Sound toggle */}
        <View style={s.card}>
          <View style={s.soundRow}>
            <Text style={s.cardLabel}>Sound Effects</Text>
            <TouchableOpacity
              style={[s.soundToggle, soundOn && s.soundToggleOn]}
              onPress={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <View style={[s.soundToggleThumb, soundOn && s.soundToggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Username */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Username</Text>
          <Text style={s.cardHint}>This is how other players find and challenge you.</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, s.flex1]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={saveUsername}
            />
            <TouchableOpacity
              style={[s.saveBtn, (usernameLoading || username.trim() === user?.username) && s.saveBtnDisabled]}
              onPress={saveUsername}
              disabled={usernameLoading || username.trim() === user?.username}
            >
              {usernameLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
          {usernameError ? <Text style={s.error}>{usernameError}</Text> : null}
        </View>

        {/* Add friend */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Add Friend</Text>
          <TextInput
            style={s.input}
            placeholder="Search by username..."
            placeholderTextColor={colors.textMuted}
            value={addQuery}
            onChangeText={setAddQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {addResults.map(u => (
            <View key={u.id} style={s.searchRow}>
              <UserAvatar avatarId={u.avatar_id} username={u.username} size={36} />
              <Text style={s.searchName}>{u.username}</Text>
              {u.is_friend
                ? <Text style={s.alreadyFriend}>Friends ✓</Text>
                : (
                  <TouchableOpacity
                    style={s.addBtn}
                    onPress={() => addFriend(u.username)}
                    disabled={addLoading}
                  >
                    <Text style={s.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                )
              }
            </View>
          ))}
        </View>

        {/* Friends list */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Friends ({friends.length})</Text>
          {friendsLoading && <ActivityIndicator color={colors.textMuted} style={{ marginTop: 8 }} />}
          {!friendsLoading && friends.length === 0 && (
            <Text style={s.emptyText}>No friends yet. Add some above!</Text>
          )}
          {friends.map(f => (
            <View key={f.id} style={s.friendRow}>
              <UserAvatar avatarId={f.avatar_id} username={f.username} size={36} />
              <Text style={s.friendName}>{f.username}</Text>
              <TouchableOpacity onPress={() => removeFriend(f)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={() => {
            Alert.alert('Log out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: () => logout() },
            ]);
          }}
        >
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity onPress={() => Linking.openURL('https://quizza-eta.vercel.app/privacy.html')} style={s.privacyLink}>
          <Text style={s.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { color: colors.textPrimary, fontSize: 20 },
  headerTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarWrap: { position: 'relative' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.surface, borderRadius: 12,
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  avatarEditText: { fontSize: 12 },
  avatarHint: { color: colors.textMuted, fontSize: 13 },
  // Avatar picker
  avatarPickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    gap: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 76, height: 84,
    borderRadius: 14,
    backgroundColor: 'rgba(30,41,59,0.6)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    gap: 4,
  },
  avatarOptionSelected: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  avatarOptionImage: { width: 44, height: 44 },
  avatarOptionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  avatarOptionLabelSelected: { color: colors.textPrimary },
  // Sound toggle
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundToggle: {
    width: 50, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  soundToggleOn: {
    backgroundColor: colors.green,
  },
  soundToggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  soundToggleThumbOn: {
    alignSelf: 'flex-end' as const,
  },
  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    gap: 10,
  },
  cardLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  cardHint: { color: colors.textMuted, fontSize: 13, marginTop: -4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex1: { flex: 1 },
  input: {
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 12, padding: 12,
    color: colors.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.green, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  error: { color: colors.red, fontSize: 13 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchName: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  alreadyFriend: { color: colors.green, fontSize: 13, fontWeight: '600' },
  addBtn: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  addBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  friendName: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { color: colors.red, fontSize: 12 },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutBtnText: { color: colors.red, fontSize: 16, fontWeight: '700' },
  privacyLink: { alignItems: 'center', paddingVertical: 8 },
  privacyText: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
