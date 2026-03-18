import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import PizzaMascot from '../components/PizzaMascot';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

export default function EmailVerificationScreen({ route, navigation }: Props) {
  const email = route.params?.email;
  const token = route.params?.token;
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // If we received a token from deep link, verify immediately
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (t: string) => {
    setVerifying(true);
    setError('');
    try {
      await api.post('/auth/verify-email', { token: t });
      setVerified(true);
    } catch (err: any) {
      setError(err.message || 'This verification link is invalid or has expired.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setError('');
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <LinearGradient colors={gradients.bg} style={s.flex}>
      <View style={s.container}>
        <View style={s.card}>
          {verifying ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.green} size="large" />
              <Text style={s.statusText}>Verifying your email...</Text>
            </View>
          ) : verified ? (
            <>
              <View style={s.center}>
                <PizzaMascot mood="excited" size={100} />
              </View>
              <View style={s.successBox}>
                <Text style={s.successIcon}>✓</Text>
                <Text style={s.successText}>Email verified!</Text>
                <Text style={s.successSub}>You can now log in to your account.</Text>
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
              <View style={s.center}>
                <PizzaMascot mood="happy" size={100} />
              </View>

              <Text style={s.title}>Check your email</Text>
              <Text style={s.subtitle}>
                {email
                  ? <>We sent a verification link to{'\n'}<Text style={s.emailHighlight}>{email}</Text></>
                  : 'Check your email for a verification link.'}
              </Text>

              <View style={s.infoBox}>
                <Text style={s.infoText}>
                  Tap the link in the email to verify your account. The link expires in 24 hours.
                </Text>
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              {resent ? (
                <Text style={s.resentText}>New verification email sent!</Text>
              ) : null}

              {email ? (
                <TouchableOpacity
                  style={[s.btn, s.btnOutline, resending && s.btnDisabled]}
                  onPress={handleResend}
                  disabled={resending}
                >
                  {resending
                    ? <ActivityIndicator color={colors.green} />
                    : <Text style={s.btnOutlineText}>Resend Verification Email</Text>}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
                <Text style={s.linkText}>
                  ← <Text style={s.linkAccent}>Back to Login</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  center: { alignItems: 'center', marginBottom: 16 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  emailHighlight: { color: colors.green, fontWeight: '700' },
  statusText: { color: colors.textMuted, fontSize: 15, marginTop: 12 },
  infoBox: {
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)',
    marginBottom: 16,
  },
  infoText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  error: { color: colors.red, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  resentText: { color: colors.green, fontSize: 14, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 14, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    marginBottom: 16, gap: 6,
  },
  successIcon: { color: colors.green, fontSize: 32, fontWeight: '700' },
  successText: { color: colors.green, fontSize: 18, fontWeight: '700' },
  successSub: { color: colors.textMuted, fontSize: 14 },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnGreen: { backgroundColor: colors.green },
  btnOutline: {
    borderWidth: 1, borderColor: colors.green,
    backgroundColor: 'transparent',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutlineText: { color: colors.green, fontSize: 15, fontWeight: '600' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textMuted, fontSize: 14 },
  linkAccent: { color: colors.green, fontWeight: '600' },
});
