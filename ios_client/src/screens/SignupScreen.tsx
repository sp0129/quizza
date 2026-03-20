import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import PizzaMascot from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const { signup, loginWithApple } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onAppleSuccess = () => {
    if (navigation.canGoBack()) {
      navigation.navigate('MainTabs' as any);
    }
  };

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError('All fields required');
      return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await signup(username.trim(), email.trim().toLowerCase(), password);
      // Signed in automatically — navigate to app
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
            <PizzaMascot mood="happy" size={110} />
          </View>

          <View style={s.card}>
            <Text style={s.title}>Quizza</Text>
            <Text style={s.subtitle}>Create account</Text>

            <TextInput
              style={s.input}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
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
              placeholder="Password (min 8 chars)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btn, s.btnGreen, loading && s.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Sign up</Text>}
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={s.appleBtn}
              onPress={async () => {
                setError('');
                setLoading(true);
                try { await loginWithApple(); onAppleSuccess(); }
                catch (err: any) { if (err.code !== 'ERR_REQUEST_CANCELED') setError(err.message ?? 'Apple sign-in failed'); }
                finally { setLoading(false); }
              }}
            />

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
              <Text style={s.linkText}>
                Already have an account? <Text style={s.linkAccent}>Log in</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Linking.openURL('https://quizza-eta.vercel.app/privacy.html')} style={s.privacyLink}>
              <Text style={s.privacyText}>Privacy Policy</Text>
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  appleBtn: { width: '100%', height: 50, marginBottom: 4 },
  error: { color: colors.red, fontSize: 14, marginBottom: 12 },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnGreen: { backgroundColor: colors.green },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 14 },
  linkAccent: { color: colors.green, fontWeight: '600' },
  privacyLink: { marginTop: 12, alignItems: 'center' },
  privacyText: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
});
