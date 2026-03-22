import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert, Linking, Image, RefreshControl,
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
import { getGamePreferences, saveGamePreferences, type GamePreferences } from '../utils/gamePreferences';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

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
  const { user, refreshUser, logout, isGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState(user?.username ?? '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [gamePrefs, setGamePrefs] = useState<GamePreferences>({ timer: 30, questionCount: 10, difficulty: 'all' });
  const [profileStats, setProfileStats] = useState<{
    gamesPlayedTotal: number; wins: number; winRate: number; winStreak: number; bestScore: number; dailyStreak: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileStats = () => {
    return api.get<any>('/users/me/stats').then(s => setProfileStats({
      gamesPlayedTotal: s.gamesPlayedTotal ?? 0,
      wins: s.wins ?? 0,
      winRate: s.winRate ?? 0,
      winStreak: s.winStreak ?? 0,
      bestScore: s.bestScore ?? 0,
      dailyStreak: s.streak ?? 0,
    })).catch(() => {});
  };

  useEffect(() => {
    getGamePreferences().then(setGamePrefs);
    fetchProfileStats();
  }, []);

  const updatePref = (update: Partial<GamePreferences>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveGamePreferences(update).then(setGamePrefs);
  };

  const saveUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === user?.username) { setEditingUsername(false); return; }
    if (trimmed.length < 3) { setUsernameError('Minimum 3 characters'); return; }
    setUsernameError('');
    setUsernameLoading(true);
    try {
      const updated = await api.put<{ username: string }>('/users/me', { username: trimmed });
      refreshUser({ username: updated.username });
      setEditingUsername(false);
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

  if (isGuest) {
    return (
      <View style={s.root}>
        <LinearGradient colors={gradients.bg} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[s.content, { paddingTop: insets.top + 16, flex: 1, justifyContent: 'center' }]}>
          <View style={s.header}>
            <View style={{ width: 36 }} />
            <Text style={s.headerTitle}>Profile</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 56 }}>🔒</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800' }}>Account Required</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              Create a free account to customize your profile, change your avatar, and track your stats.
            </Text>
            <TouchableOpacity
              style={[s.saveBtn, { paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 }]}
              onPress={() => navigation.navigate('Signup' as any)}
              activeOpacity={0.8}
            >
              <Text style={[s.saveBtnText, { fontSize: 16 }]}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={() => logout()}
            >
              <Text style={s.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={gradients.bg} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchProfileStats();
              setRefreshing(false);
            }}
            tintColor={colors.textMuted}
          />
        }
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

        {/* Username */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Username</Text>
          <Text style={s.cardHint}>This is how other players find and challenge you.</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, s.flex1, !editingUsername && s.inputDisabled]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={saveUsername}
              editable={editingUsername}
            />
            {editingUsername ? (
              <TouchableOpacity
                style={[s.saveBtn, usernameLoading && s.saveBtnDisabled]}
                onPress={saveUsername}
                disabled={usernameLoading}
              >
                {usernameLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => setEditingUsername(true)}
              >
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {usernameError ? <Text style={s.error}>{usernameError}</Text> : null}
        </View>

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

        {/* Stats card */}
        {profileStats && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Your Stats</Text>
            <View style={s.statsGrid}>
              <View style={[s.statItem, s.statItemAccent]}>
                <Text style={s.statEmoji}>🎮</Text>
                <Text style={s.statValue}>{profileStats.gamesPlayedTotal || '—'}</Text>
                <Text style={s.statLabel}>Games</Text>
              </View>
              <View style={[s.statItem, s.statItemAccent]}>
                <Text style={s.statEmoji}>🏆</Text>
                <Text style={[s.statValue, profileStats.wins > 0 && { color: '#22C55E' }]}>{profileStats.wins || '—'}</Text>
                <Text style={s.statLabel}>Wins</Text>
              </View>
              <View style={[s.statItem, s.statItemAccent]}>
                <Text style={s.statEmoji}>📊</Text>
                <Text style={[s.statValue, profileStats.winRate > 0 && { color: '#3B82F6' }]}>{profileStats.winRate > 0 ? `${profileStats.winRate}%` : '—'}</Text>
                <Text style={s.statLabel}>Win Rate</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statEmoji}>⭐</Text>
                <Text style={[s.statValue, profileStats.bestScore > 0 && { color: '#F59E0B' }]}>{profileStats.bestScore || '—'}</Text>
                <Text style={s.statLabel}>Best Score</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statEmoji}>🔥</Text>
                <Text style={[s.statValue, profileStats.dailyStreak > 0 && { color: '#F97316' }]}>{profileStats.dailyStreak || '—'}</Text>
                <Text style={s.statLabel}>Daily Streak</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statEmoji}>⚔️</Text>
                <Text style={[s.statValue, profileStats.winStreak > 0 && { color: '#7C3AED' }]}>{profileStats.winStreak || '—'}</Text>
                <Text style={s.statLabel}>Win Streak</Text>
              </View>
            </View>
          </View>
        )}

        {/* Game mode settings */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Game Mode Defaults</Text>
          <Text style={s.cardHint}>These will be pre-selected when you start a game.</Text>

          {/* Timer */}
          <View style={s.prefRow}>
            <Text style={s.prefLabel}>Timer</Text>
            <View style={s.prefToggle}>
              <TouchableOpacity
                style={[s.prefOption, gamePrefs.timer === 30 && s.prefOptionActive]}
                onPress={() => updatePref({ timer: 30 })}
              >
                <Text style={[s.prefOptionText, gamePrefs.timer === 30 && s.prefOptionTextActive]}>30s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.prefOption, gamePrefs.timer === 15 && s.prefOptionActive]}
                onPress={() => updatePref({ timer: 15 })}
              >
                <Text style={[s.prefOptionText, gamePrefs.timer === 15 && s.prefOptionTextActive]}>15s</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Question count */}
          <View style={s.prefRow}>
            <Text style={s.prefLabel}>Questions</Text>
            <View style={s.prefToggle}>
              <TouchableOpacity
                style={[s.prefOption, gamePrefs.questionCount === 10 && s.prefOptionActive]}
                onPress={() => updatePref({ questionCount: 10 })}
              >
                <Text style={[s.prefOptionText, gamePrefs.questionCount === 10 && s.prefOptionTextActive]}>10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.prefOption, gamePrefs.questionCount === 5 && s.prefOptionActive]}
                onPress={() => updatePref({ questionCount: 5 })}
              >
                <Text style={[s.prefOptionText, gamePrefs.questionCount === 5 && s.prefOptionTextActive]}>5</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Difficulty */}
          <View style={s.prefRow}>
            <Text style={s.prefLabel}>Difficulty</Text>
            <View style={s.prefToggle}>
              {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.prefOption, gamePrefs.difficulty === d && s.prefOptionActive]}
                  onPress={() => updatePref({ difficulty: d })}
                >
                  <Text style={[s.prefOptionText, gamePrefs.difficulty === d && s.prefOptionTextActive]}>
                    {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Tip Jar */}
        <TouchableOpacity
          style={s.tipBtn}
          onPress={async () => {
            try {
              const IAP = await import('react-native-iap');
              await IAP.initConnection();
              const products = await IAP.fetchProducts({ skus: ['com.quizza.app.tip'] });
              if (!products || products.length === 0) {
                Alert.alert('Not Available', 'Tip jar is not available right now.');
                return;
              }
              await IAP.requestPurchase({ request: { sku: 'com.quizza.app.tip' } } as any);
              Alert.alert('Thank you! 🎉', "You're awesome. This keeps Quizza ad-free.");
            } catch (err: any) {
              if (err.code !== 'E_USER_CANCELLED') {
                Alert.alert('Error', err.message || 'Purchase failed');
              }
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={s.tipBtnText}>🍕 Buy us a slice — $2.99</Text>
          <Text style={s.tipBtnSub}>Keep Quizza ad-free</Text>
        </TouchableOpacity>

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

        {/* Delete Account */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => {
            Alert.alert(
              'Delete Account',
              'This will permanently delete your account, stats, and all game history. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert(
                      'Are you absolutely sure?',
                      'All your data will be gone forever.',
                      [
                        { text: 'Keep Account', style: 'cancel' },
                        {
                          text: 'Yes, Delete Everything',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await api.delete('/users/me');
                              await logout();
                            } catch (err: any) {
                              Alert.alert('Error', err.message || 'Could not delete account');
                            }
                          },
                        },
                      ],
                    );
                  },
                },
              ],
            );
          }}
        >
          <Text style={s.deleteBtnText}>Delete Account</Text>
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
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: '31%' as any, aspectRatio: 0.85,
    borderRadius: 14,
    backgroundColor: 'rgba(30,41,59,0.6)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    gap: 4, paddingVertical: 8,
  },
  avatarOptionSelected: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  avatarOptionImage: { width: 80, height: 80 },
  avatarOptionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
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
  // Game mode preferences
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  prefLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 70,
  },
  prefToggle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.5)',
  },
  prefOption: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  prefOptionActive: {
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  prefOptionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  prefOptionTextActive: {
    color: colors.textPrimary,
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  statItem: {
    width: '30%',
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statItemAccent: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  flex1: { flex: 1 },
  input: {
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 12, padding: 12,
    color: colors.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  inputDisabled: { opacity: 0.5 },
  saveBtn: {
    backgroundColor: colors.green, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  editBtn: {
    backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  editBtnText: { color: '#A78BFA', fontSize: 14, fontWeight: '700' },
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
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteBtnText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  tipBtn: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  tipBtnText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '700',
  },
  tipBtnSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  privacyLink: { alignItems: 'center', paddingVertical: 8 },
  privacyText: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
