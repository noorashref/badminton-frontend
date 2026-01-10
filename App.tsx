import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "./src/store/useAuthStore";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LeagueScreen from "./src/screens/LeagueScreen";
import FixturesScreen from "./src/screens/FixturesScreen";
import MatchDetailScreen from "./src/screens/MatchDetailScreen";
import SessionCreateScreen from "./src/screens/SessionCreateScreen";
import SessionBoardScreen from "./src/screens/SessionBoardScreen";
import SessionSummaryScreen from "./src/screens/SessionSummaryScreen";
import SessionsListScreen from "./src/screens/SessionsListScreen";
import PlayersLeaderboardScreen from "./src/screens/PlayersLeaderboardScreen";
import PlayerStatsScreen from "./src/screens/PlayerStatsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import PlayersManageScreen from "./src/screens/PlayersManageScreen";
import SessionGroupsScreen from "./src/screens/SessionGroupsScreen";
import GroupSessionsScreen from "./src/screens/GroupSessionsScreen";
import GroupPlayersScreen from "./src/screens/GroupPlayersScreen";
import type {
  HomeStackParamList,
  RootTabParamList,
  SessionStackParamList,
  SettingsStackParamList,
} from "./src/navigation/types";
import { theme } from "./src/ui/theme";

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SessionStack = createNativeStackNavigator<SessionStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();

const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: true }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen name="League" component={LeagueScreen} />
    <HomeStack.Screen name="Fixtures" component={FixturesScreen} />
    <HomeStack.Screen name="MatchDetail" component={MatchDetailScreen} />
    <HomeStack.Screen name="SessionSummary" component={SessionSummaryScreen} />
    <HomeStack.Screen name="SessionsList" component={SessionsListScreen} />
    <HomeStack.Screen name="PlayersLeaderboard" component={PlayersLeaderboardScreen} />
    <HomeStack.Screen name="PlayerStats" component={PlayerStatsScreen} />
  </HomeStack.Navigator>
);

const SessionStackScreen = () => (
  <SessionStack.Navigator screenOptions={{ headerShown: true }}>
    <SessionStack.Screen name="SessionGroups" component={SessionGroupsScreen} />
    <SessionStack.Screen name="GroupSessions" component={GroupSessionsScreen} />
    <SessionStack.Screen name="GroupPlayers" component={GroupPlayersScreen} />
    <SessionStack.Screen name="SessionCreate" component={SessionCreateScreen} />
    <SessionStack.Screen name="SessionBoard" component={SessionBoardScreen} />
    <SessionStack.Screen name="SessionSummary" component={SessionSummaryScreen} />
  </SessionStack.Navigator>
);

const SettingsStackScreen = () => (
  <SettingsStack.Navigator screenOptions={{ headerShown: true }}>
    <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    <SettingsStack.Screen name="PlayersManage" component={PlayersManageScreen} />
  </SettingsStack.Navigator>
);

const TabsScreen = () => (
  <Tabs.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.muted,
      tabBarStyle: {
        backgroundColor: theme.colors.card,
        borderTopColor: theme.colors.border,
        height: 64,
        paddingTop: 6,
        paddingBottom: 8,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: "600",
      },
    }}
  >
    <Tabs.Screen
      name="HomeTab"
      component={HomeStackScreen}
      options={{
        title: "Home",
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
        ),
      }}
    />
    <Tabs.Screen
      name="SessionTab"
      component={SessionStackScreen}
      options={{
        title: "Session",
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? "tennisball" : "tennisball-outline"}
            size={size}
            color={color}
          />
        ),
      }}
    />
    <Tabs.Screen
      name="SettingsTab"
      component={SettingsStackScreen}
      options={{
        title: "Settings",
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? "options" : "options-outline"}
            size={size}
            color={color}
          />
        ),
      }}
    />
  </Tabs.Navigator>
);

export default function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <RootStack.Screen name="Tabs" component={TabsScreen} />
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: true, title: "Register" }}
            />
            <RootStack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: true, title: "Reset password" }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
