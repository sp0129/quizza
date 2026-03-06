import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'GuestJoin'>;

export default function GuestJoinScreen({ route, navigation }: Props) {
  const { roomCode } = route.params;
  const { loginAsGuest } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter a name to continue'); return; }
    setLoading(true);
    setError('');
    try {
      await loginAsGuest(trimmed);
      const data = await api.post<{
        roomId: string; questionSetId: string; category: string; roomCode: string; timerSeconds: number;
      }>('/rooms/join', { roomCode: roomCode.toUpperCase(), displayName: trimmed });

      navigation.replace('Room', {
        roomId: data.roomId,
        questionSetId: data.questionSetId,
        category: data.category,
        roomCode: data.roomCode,
        isHost: false,
        timer: data.timerSeconds ?? 30,
      });
    } catch (err: any) {
      setError(err.message ?? 'Could not join room');
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.bg} style={s.flex}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.mascotArea}>
            <PizzaMascot mood="thinking" size={100} />
          </View>

          <View style={s.card}>
            <Text style={s.title}>Join Room</Text>

            <View style={s.codeBox}>
              <Text style={s.codeLabel}>Room Code</Text>
              <Text style={s.codeValue}>{roomCode.toUpperCase()}</Text>
            </View>

            <Text style={s.label}>Your name</Text>
            <TextInput
              style={s.input}
              placeholder="Pick a nickname..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={30}
              autoFocus
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, s.btnCyan, loading && s.btnDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Join Game</Text>}
            </TouchableOpacity>

            <Text style={s.hint}>No account needed — you'll play as a guest.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  mascotArea: { alignItems: 'center', marginBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  codeBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  codeLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: 4 },
  label: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14,
    color: colors.textPrimary, fontSize: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  error: { color: colors.red, fontSize: 14, marginBottom: 12 },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnCyan: { backgroundColor: colors.cyan },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
