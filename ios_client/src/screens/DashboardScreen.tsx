import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

interface IncomingChallenge {
  id: string;
  category: string;
  game_id: string;
  expires_at: string;
  inviter_username: string;
}

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout, isGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const [incoming, setIncoming] = useState<IncomingChallenge[]>([]);
  const [challengeUsername, setChallengeUsername] = useState('');
  const [friendSuggestions, setFriendSuggestions] = useState<{ id: string; username: string; profile_picture_url?: string }[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<IncomingChallenge[]>('/challenges/incoming').then(setIncoming).catch(() => {});
  }, []);

  useEffect(() => {
    if (!challengeUsername.trim() || isGuest) { setFriendSuggestions([]); return; }
    const timer = setTimeout(() => {
      api.get<typeof friendSuggestions>(`/users/search?q=${encodeURIComponent(challengeUsername.trim())}`)
        .then(setFriendSuggestions).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [challengeUsername, isGuest]);

  const acceptChallenge = async (inv: IncomingChallenge) => {
    try {
      const result = await api.post<{ gameId: string; questionSetId: string; category: string }>(
        `/challenges/${inv.id}/accept`, {}
      );
      navigation.navigate('Game', {
        gameId: result.gameId,
        mode: 'async',
        questionSetId: result.questionSetId,
        category: result.category,
        timer: 30,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    setJoinLoading(true);
    setError('');
    try {
      const result = await api.post<{
        roomId: string; roomCode: string; questionSetId: string; category: string; timerSeconds?: number;
      }>('/rooms/join', { roomCode: roomCode.trim().toUpperCase() });
      navigation.navigate('Room', {
        roomId: result.roomId,
        questionSetId: result.questionSetId,
        category: result.category,
        roomCode: result.roomCode,
        isHost: false,
        timer: result.timerSeconds ?? 30,
      });
    } catch (err: any) {
      setError(err.message);
      setJoinLoading(false);
    }
  };

  const goChallenge = () => {
    if (!challengeUsername.trim()) { setError('Enter a username to challenge'); return; }
    navigation.navigate('Category', { mode: 'challenge', target: challengeUsername.trim() });
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <LinearGradient colors={gradients.bg} style={s.flex}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <PizzaMascot mood="idle" size={36} />
            <Text style={s.headerTitle}>Quizza</Text>
          </View>
          <View style={s.headerRight}>
            {!isGuest && (
              <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.profileBtn}>
                <Text style={s.profileBtnText}>{user?.username?.[0]?.toUpperCase()}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
              <Text style={s.logoutText}>{isGuest ? 'Sign up' : 'Log out'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Guest upsell banner */}
        {isGuest && (
          <TouchableOpacity style={s.guestBanner} onPress={() => navigation.navigate('Signup')}>
            <Text style={s.guestBannerTitle}>Playing as guest</Text>
            <Text style={s.guestBannerBody}>Create a free account to play rooms, challenges, and save your scores →</Text>
          </TouchableOpacity>
        )}

        {/* Solo card */}
        <View style={[s.card, s.cardGreen]}>
          <Text style={s.cardTitle}>⚡ Play Solo</Text>
          <Text style={s.cardBody}>Jump in instantly — 10 questions, all you.</Text>
          <TouchableOpacity
            style={[s.btn, s.btnGreen]}
            onPress={() => navigation.navigate('Category', { mode: 'solo' })}
          >
            <Text style={s.btnText}>⚡ PLAY SOLO</Text>
          </TouchableOpacity>
        </View>

        {/* Room card */}
        <View style={[s.card, s.cardCyan]}>
          <Text style={s.cardTitle}>🏠 Room</Text>
          <Text style={s.cardBody}>Live multiplayer. Create a room and share the code!</Text>
          <TouchableOpacity
            style={[s.btn, s.btnCyan, isGuest && s.btnDisabled]}
            onPress={() => isGuest ? navigation.navigate('Signup') : navigation.navigate('Category', { mode: 'room' })}
          >
            <Text style={s.btnText}>{isGuest ? '🔒 Create Room' : '+ Create Room'}</Text>
          </TouchableOpacity>
          <View style={s.joinRow}>
            <TextInput
              style={s.joinInput}
              placeholder="Room code"
              placeholderTextColor={colors.textMuted}
              value={roomCode}
              onChangeText={t => setRoomCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={joinRoom}
            />
            <TouchableOpacity
              style={[s.joinBtn, (!roomCode.trim() || joinLoading) && s.btnDisabled]}
              onPress={joinRoom}
              disabled={!roomCode.trim() || joinLoading}
            >
              {joinLoading
                ? <ActivityIndicator color={colors.textPrimary} size="small" />
                : <Text style={s.joinBtnText}>Join</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Challenge card */}
        <View style={[s.card, s.cardAmber]}>
          <Text style={s.cardTitle}>⚔️ Challenge</Text>
          <Text style={s.cardBody}>Dare a friend by username.</Text>
          <View style={s.challengeRow}>
            <TextInput
              style={s.challengeInput}
              placeholder="Friend's username"
              placeholderTextColor={colors.textMuted}
              value={challengeUsername}
              onChangeText={setChallengeUsername}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={goChallenge}
              editable={!isGuest}
            />
            <TouchableOpacity
              style={[s.btn, s.btnAmber, s.challengeBtn, isGuest && s.btnDisabled]}
              onPress={() => isGuest ? navigation.navigate('Signup') : goChallenge()}
            >
              <Text style={s.btnText}>{isGuest ? '🔒' : 'Go →'}</Text>
            </TouchableOpacity>
          </View>
          {friendSuggestions.length > 0 && (
            <View style={s.friendDrop}>
              {friendSuggestions.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={s.friendDropRow}
                  onPress={() => { setChallengeUsername(f.username); setFriendSuggestions([]); }}
                >
                  <View style={s.friendAvatar}>
                    <Text style={s.friendAvatarText}>{f.username[0].toUpperCase()}</Text>
                  </View>
                  <Text style={s.friendDropName}>{f.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Incoming challenges */}
        {incoming.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>⚔️ Incoming Challenges</Text>
            {[...incoming]
              .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
              .map(inv => (
                <TouchableOpacity key={inv.id} style={s.challengeChip} onPress={() => acceptChallenge(inv)}>
                  <View style={s.chipAvatar}>
                    <Text style={s.chipAvatarText}>{inv.inviter_username[0].toUpperCase()}</Text>
                  </View>
                  <View style={s.chipInfo}>
                    <Text style={s.chipName}>{inv.inviter_username}</Text>
                    <Text style={s.chipCat}>{inv.category}</Text>
                  </View>
                  <Text style={s.chipArrow}>→</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  username: { color: colors.textMuted, fontSize: 13 },
  profileBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(80,160,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  profileBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  logoutText: { color: colors.textMuted, fontSize: 12 },
  guestBanner: {
    backgroundColor: 'rgba(80,160,255,0.1)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(80,160,255,0.3)',
    gap: 4,
  },
  guestBannerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  guestBannerBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.red, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: colors.border,
    gap: 12,
  },
  cardGreen: { borderColor: 'rgba(34,197,94,0.2)' },
  cardCyan: { borderColor: 'rgba(6,182,212,0.2)' },
  cardAmber: { borderColor: 'rgba(245,158,11,0.2)' },
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  cardBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnGreen: { backgroundColor: colors.green },
  btnCyan: { backgroundColor: colors.cyan },
  btnAmber: { backgroundColor: colors.amber },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  joinRow: { flexDirection: 'row', gap: 10 },
  joinInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12,
    color: colors.textPrimary, fontSize: 16, fontWeight: '700',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    letterSpacing: 2,
  },
  joinBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12,
    justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  joinBtnText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  challengeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  challengeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 12,
    color: colors.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  challengeBtn: { paddingHorizontal: 16 },
  friendDrop: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  friendDropRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  friendAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(80,160,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  friendAvatarText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  friendDropName: { color: colors.textPrimary, fontSize: 14 },
  challengeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.amber, justifyContent: 'center', alignItems: 'center',
  },
  chipAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chipInfo: { flex: 1 },
  chipName: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  chipCat: { color: colors.textMuted, fontSize: 13 },
  chipArrow: { color: colors.textMuted, fontSize: 18 },
});
