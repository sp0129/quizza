import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import PizzaMascot from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithApple, loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSuccess = () => {
    // If Login was pushed onto the authenticated stack (e.g. by a guest),
    // navigate back to Dashboard. In the unauthenticated stack the
    // navigator switch handles it automatically.
    try { navigation.navigate('MainTabs' as any); } catch {}
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Email and password required'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithApple();
      onSuccess();
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') setError(err.message ?? 'Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAsGuest();
      onSuccess();
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
          <View style={s.mascotArea}>
            <View style={s.bubble}>
              <Text style={s.bubbleText}>Let's get quizzing! 🍕</Text>
            </View>
            <PizzaMascot mood="excited" size={130} />
          </View>

          <View style={s.card}>
            <Text style={s.title}>Quizza</Text>
            <Text style={s.subtitle}>Log in</Text>

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
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity onPress={() => navigation.navigate('ResetPassword' as any)} style={s.forgotLink}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, s.btnGreen, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Log in</Text>}
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={s.appleBtn}
              onPress={handleApple}
            />

            <TouchableOpacity style={s.guestBtn} onPress={handleGuest} disabled={loading}>
              <Text style={s.guestBtnText}>Play as Guest (Solo only)</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={s.link}>
              <Text style={s.linkText}>
                No account? <Text style={s.linkAccent}>Sign up</Text>
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
  mascotArea: { alignItems: 'center', marginBottom: 28 },
  bubble: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: 'rgba(30,41,59,0.6)',
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  appleBtn: { width: '100%', height: 50, marginBottom: 12 },
  guestBtn: {
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  guestBtnText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 4, marginTop: -4 },
  forgotText: { color: colors.textMuted, fontSize: 13 },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 14 },
  linkAccent: { color: colors.green, fontWeight: '600' },
});
