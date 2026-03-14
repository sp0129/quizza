import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { colors } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import GameScreen from './src/screens/GameScreen';
import RoomScreen from './src/screens/RoomScreen';
import GuestJoinScreen from './src/screens/GuestJoinScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Signup: undefined;
  ResetPassword: undefined;
  GuestJoin: { roomCode: string };
  // App
  Dashboard: undefined;
  Profile: undefined;
  Friends: undefined;
  Leaderboard: undefined;
  Category: { mode: 'solo' | 'room' | 'challenge'; target?: string };
  Game: {
    gameId: string;
    mode: string;
    questionSetId: string;
    category: string;
    catId?: number;
    timer: number;
    questionCount?: number;
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
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { user, loading } = useAuth();

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
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="Category" component={CategoryScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Room" component={RoomScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          {/* Guests can navigate here to create a real account */}
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="GuestJoin" component={GuestJoinScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
