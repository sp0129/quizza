import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const TAGLINES = [
  '20,000+ questions. 35+ categories.',
  'Challenge friends. Crush strangers.',
  '35+ categories. One will humble you.',
  'Every trivia night, in your pocket.',
];

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithApple, loginWithGoogle, googleRequest, loginAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Gentle sway animation for mascot
  const sway = useSharedValue(0);
  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      true,
    );
  }, []);
  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value}deg` }],
  }));

  // Rotate taglines
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex(i => (i + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const onSuccess = () => {
    if (navigation.canGoBack()) {
      navigation.navigate('MainTabs' as any);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Email and password required'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      onSuccess();
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.message?.includes('verify your email')) {
        navigation.navigate('EmailVerification' as any, { email: email.trim().toLowerCase() });
        return;
      }
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

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) setError(err.message ?? 'Google sign-in failed');
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
    <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={s.flex}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section */}
          <Animated.View entering={FadeIn.duration(600)} style={s.heroArea}>
            <Animated.Image
              source={require('../assets/mascot/explorer-star.png')}
              style={[s.mascotImage, swayStyle]}
              resizeMode="contain"
            />
            <Text style={s.appName}>Quizza</Text>
            <Animated.Text
              key={taglineIndex}
              entering={FadeIn.duration(500)}
              style={s.tagline}
            >
              {TAGLINES[taglineIndex]}
            </Animated.Text>
          </Animated.View>

          {/* Login card */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={s.card}>
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor="rgba(148,163,184,0.6)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor="rgba(148,163,184,0.6)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword' as any)} style={s.forgotLink}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.loginBtn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.loginBtnText}>Log in</Text>}
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or continue with</Text>
              <View style={s.dividerLine} />
            </View>

            {Platform.OS === 'ios' ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={14}
                style={s.appleBtn}
                onPress={handleApple}
              />
            ) : (
              <TouchableOpacity
                style={s.googleBtn}
                onPress={handleGoogle}
                disabled={!googleRequest || loading}
                activeOpacity={0.8}
              >
                <Text style={s.googleBtnText}>Sign in with Google</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={s.signupLink}>
              <Text style={s.signupText}>
                No account? <Text style={s.signupAccent}>Sign up free</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Guest mode */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <TouchableOpacity style={s.guestBtn} onPress={handleGuest} disabled={loading} activeOpacity={0.7}>
              <Text style={s.guestText}>
                Just browsing? <Text style={s.guestAccent}>Try solo mode</Text> — no account needed
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Hero
  heroArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mascotImage: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  appName: {
    color: '#F1F5F9',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    height: 20,
  },

  // Card
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.4)',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 14,
    padding: 16,
    color: '#F1F5F9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.35)',
    marginBottom: 12,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },

  // Login button
  loginBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.6 },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(71, 85, 105, 0.5)',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 13,
  },

  // Apple button
  appleBtn: {
    width: '100%',
    height: 52,
    marginBottom: 16,
  },
  // Google button
  googleBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  googleBtnText: {
    color: '#1F1F1F',
    fontSize: 17,
    fontWeight: '600',
  },

  // Signup link
  signupLink: {
    alignItems: 'center',
    marginTop: 4,
  },
  signupText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  signupAccent: {
    color: '#22C55E',
    fontWeight: '700',
  },

  // Guest mode
  guestBtn: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  guestText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  guestAccent: {
    color: '#94A3B8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
