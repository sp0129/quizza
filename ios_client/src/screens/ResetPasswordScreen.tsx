import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!newPassword) { setError('New password is required'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.bg} style={s.flex}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.title}>Reset Password</Text>
            <Text style={s.subtitle}>Enter your email and a new password</Text>

            {success ? (
              <>
                <View style={s.successBox}>
                  <Text style={s.successIcon}>✓</Text>
                  <Text style={s.successText}>Password reset successfully!</Text>
                </View>
                <TouchableOpacity
                  style={[s.btn, s.btnGreen]}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={s.btnText}>Go to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={s.input}
                  placeholder="New Password"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  textContentType="none"
                  autoComplete="off"
                />
                <TextInput
                  style={s.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="none"
                  autoComplete="off"
                />

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[s.btn, s.btnGreen, loading && s.btnDisabled]}
                  onPress={handleReset}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Reset Password</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
              <Text style={s.linkText}>
                ← <Text style={s.linkAccent}>Back to Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: 'rgba(10,30,80,0.6)',
    borderRadius: 12, padding: 14,
    color: colors.textPrimary, fontSize: 16,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 12,
  },
  error: { color: colors.red, fontSize: 14, marginBottom: 12 },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnGreen: { backgroundColor: colors.green },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 14, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    marginBottom: 16, gap: 8,
  },
  successIcon: { color: colors.green, fontSize: 32, fontWeight: '700' },
  successText: { color: colors.green, fontSize: 16, fontWeight: '600' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 14 },
  linkAccent: { color: colors.green, fontWeight: '600' },
});
