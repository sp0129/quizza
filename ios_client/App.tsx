import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { colors } from './src/theme';
import BottomNav from './src/components/dashboard/BottomNav';
import { initSoundSetting } from './src/utils/sounds';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import GameScreen from './src/screens/GameScreen';
import RoomScreen from './src/screens/RoomScreen';
import GuestJoinScreen from './src/screens/GuestJoinScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ResultsScreen from './src/screens/ResultsScreen';

// Tab navigator param list
export type TabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Friends: undefined;
  Profile: undefined;
};

// Root stack param list (screens pushed on top of tabs)
export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  EmailVerification: { email?: string; token?: string };
  GuestJoin: { roomCode: string };
  // App
  MainTabs: undefined;
  Dashboard: undefined;
  Profile: undefined;
  Friends: undefined;
  Leaderboard: undefined;
  Category: { mode: 'solo' | 'room' | 'challenge'; target?: string; targetAvatarId?: number; preselectedCategory?: string };
  Game: {
    gameId: string;
    mode: string;
    questionSetId: string;
    category: string;
    catId?: number;
    timer: number;
    questionCount?: number;
    opponentUsername?: string;
    opponentAvatarId?: number;
  };
  Room: {
    roomId: string;
    questionSetId: string;
    category: string;
    roomCode: string;
    isHost: boolean;
    timer: number;
  };
  Results: {
    yourScore: number;
    opponentScore?: number;
    opponentHandle?: string;
    opponentUsername?: string;
    category: string;
    gameMode: 'challenge' | 'group' | 'solo';
    timestamp?: string;
    result: 'win' | 'loss' | 'tie';
    challengeId?: string;
    skipAnimation?: boolean;
  };
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'https://quizza-eta.vercel.app',
  ],
  config: {
    screens: {
      GuestJoin: 'join/:roomCode',
      // Deep links: quizza://verify?token=ABC → EmailVerification screen
      EmailVerification: 'verify',
      // Deep links: quizza://reset?token=ABC → ResetPassword screen
      ResetPassword: 'reset',
    },
  },
};

const TAB_KEY_MAP: Record<string, keyof TabParamList> = {
  Home: 'Home',
  Leaderboard: 'Leaderboard',
  Friends: 'Friends',
  Profile: 'Profile',
};

function MainTabs() {
  const { isGuest } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, lazy: false }}
      tabBar={({ state, navigation }: any) => {
        const activeRoute = state.routes[state.index].name;
        const tabKey =
          activeRoute === 'Home' ? 'home' :
          activeRoute === 'Leaderboard' ? 'leaderboard' :
          activeRoute === 'Friends' ? 'friends' :
          activeRoute === 'Profile' ? 'profile' : 'home';

        return (
          <BottomNav
            activeTab={tabKey}
            onTabPress={(key) => {
              const routeName =
                key === 'home' ? 'Home' :
                key === 'leaderboard' ? 'Leaderboard' :
                key === 'friends' ? 'Friends' :
                key === 'profile' ? 'Profile' : 'Home';
              navigation.navigate(routeName);
            }}
            disabledTabs={isGuest ? ['friends', 'profile'] : []}
            onDisabledPress={() => {
              Alert.alert(
                'Account Required',
                'Create a free account to access this feature.',
                [
                  { text: 'Not Now', style: 'cancel' },
                  { text: 'Sign Up', onPress: () => navigation.navigate('Signup') },
                ],
              );
            }}
          />
        );
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  console.log('[Nav] user:', user?.username ?? null, 'loading:', loading);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {user ? (
        <Stack.Group screenOptions={{ animationTypeForReplace: 'push' }} navigationKey="auth">
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Category" component={CategoryScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Room" component={RoomScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="GuestJoin" component={GuestJoinScreen} />
          {/* Guests can navigate here to create a real account */}
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group navigationKey="unauth">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="GuestJoin" component={GuestJoinScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

// Initialize sound setting from storage
initSoundSetting();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
