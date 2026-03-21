import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import { api, setAuthToken, onAuthExpired } from '../api/client';
import ErrorOverlay from '../components/ErrorOverlay';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_id?: number;
  is_guest?: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  loginAsGuest: (username?: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  refreshUser: (updated: Partial<User>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_NAMES = [
  'TriviaHero', 'QuizWizard', 'BrainBolt', 'FactHunter', 'QuickMind',
  'PizzaFan', 'TriviaAce', 'NightOwl', 'RocketBrain', 'MindSurfer',
];

function randomGuestName(): string {
  const base = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  return base + Math.floor(Math.random() * 9000 + 1000);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const userStr = await SecureStore.getItemAsync('user');
        if (token && userStr) {
          setAuthToken(token);
          setUser(JSON.parse(userStr));
        }
      } catch {
        // ignore corrupt storage
      } finally {
        setLoading(false);
      }
    })();

    // If any API call gets a 401, show error overlay (credentials already cleared by api client)
    onAuthExpired(() => {
      setAuthExpired(true);
    });
  }, []);

  const storeAuth = async (token: string, u: User) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(u));
    setAuthToken(token);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    await storeAuth(data.token, data.user);
  };

  const signup = async (username: string, email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/signup', { username, email, password });
    await storeAuth(data.token, data.user);
  };

  const loginAsGuest = async (username?: string) => {
    const name = username ?? randomGuestName();
    const data = await api.post<{ token: string; user: User }>('/auth/guest', { username: name });
    await storeAuth(data.token, data.user);
  };

  const loginWithApple = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const data = await api.post<{ token: string; user: User }>('/auth/apple', {
      identityToken: credential.identityToken,
      fullName: credential.fullName,
    });
    await storeAuth(data.token, data.user);
  };

  const refreshUser = (updated: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updated };
      SecureStore.setItemAsync('user', JSON.stringify(next));
      return next;
    });
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      isGuest: user?.is_guest === true,
      login, signup, loginAsGuest, loginWithApple, refreshUser, logout,
    }}>
      {children}
      <ErrorOverlay
        visible={authExpired}
        title="Session Expired"
        message="Your session has ended. Please log in again to continue."
        primaryLabel="Log In Again"
        onPrimary={() => {
          setAuthExpired(false);
          setUser(null);
          setAuthToken(null);
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
