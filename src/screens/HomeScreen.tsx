import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { HomeStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/useAuthStore";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const clearToken = useAuthStore((state) => state.clearToken);
  const [inviteCode, setInviteCode] = useState("");
  const [summary, setSummary] = useState<{
    sessionName: string;
    sessionId: string;
    groupId?: string | null;
    topTeams: { playerNames: string[]; wins: number; pointsFor: number; pointsAgainst: number }[];
    topPlayers: { name: string; wins: number; pointsFor: number; pointsAgainst: number }[];
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const loadSummary = useCallback(async () => {
    try {
      const response = await api.get("/sessions/latest/summary");
      setSummary(response.data);
    } catch {
      setSummary(null);
    }
  }, []);

  const medalMeta = [
    { color: "#b7791f", style: styles.medalGold },
    { color: "#5f6b7a", style: styles.medalSilver },
    { color: "#8a4f2a", style: styles.medalBronze },
  ];

  const renderTopPlayers = (
    players: { name: string; wins: number; pointsFor: number; pointsAgainst: number }[]
  ) =>
    players.slice(0, 3).map((player, index) => (
      <View key={`player-${index}`} style={styles.leaderRow}>
        <View style={[styles.medal, medalMeta[index]?.style]}>
          <Ionicons name="trophy" size={14} color={medalMeta[index]?.color ?? "#6b6257"} />
          <Text style={styles.medalRank}>#{index + 1}</Text>
        </View>
        <View style={styles.leaderInfo}>
          <Text style={styles.leaderName}>{player.name}</Text>
          <Text style={styles.leaderStats}>
            {player.wins}W ({player.pointsFor}-{player.pointsAgainst})
          </Text>
        </View>
      </View>
    ));

  const renderTopTeams = (
    teams: { playerNames: string[]; wins: number; pointsFor: number; pointsAgainst: number }[]
  ) =>
    teams.slice(0, 3).map((team, index) => (
      <View key={`team-${index}`} style={styles.leaderRow}>
        <View style={[styles.medal, medalMeta[index]?.style]}>
          <Ionicons name="people" size={14} color={medalMeta[index]?.color ?? "#6b6257"} />
          <Text style={styles.medalRank}>#{index + 1}</Text>
        </View>
        <View style={styles.leaderInfo}>
          <Text style={styles.leaderName}>{team.playerNames.join(" & ")}</Text>
          <Text style={styles.leaderStats}>
            {team.wins}W ({team.pointsFor}-{team.pointsAgainst})
          </Text>
        </View>
      </View>
    ));

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!toastMessage) return;
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, [toastMessage]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const joinByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Invite code required");
      return;
    }
    try {
      await api.post("/groups/join-by-code", { inviteCode: inviteCode.trim().toUpperCase() });
      setInviteCode("");
      setToastMessage("Joined group successfully.");
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate("SessionTab" as never, { screen: "SessionGroups" } as never);
      }
    } catch {
      Alert.alert("Join failed", "Invalid or expired invite code.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroDot} />
          <Text style={styles.heroKicker}>Dashboard</Text>
          <Text style={styles.heroTitle}>Home</Text>
          <Text style={styles.heroSubtitle}>
            Your groups, sessions, and stats in one place.
          </Text>
        </View>
      <Pressable
        style={styles.card}
        onPress={() => {
          if (summary?.sessionId) {
            navigation.navigate("SessionSummary", { sessionId: summary.sessionId });
          }
        }}
      >
        <Text style={styles.cardTitle}>Latest Session</Text>
        {summary ? (
          <>
            <Text style={styles.cardBody}>{summary.sessionName}</Text>
            <Text style={styles.subTitle}>Top Teams</Text>
            {summary.topTeams.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              renderTopTeams(summary.topTeams)
            )}
            <Text style={styles.subTitle}>Top Players</Text>
            {summary.topPlayers.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              renderTopPlayers(summary.topPlayers)
            )}
          </>
        ) : (
          <Text style={styles.cardBody}>No finished sessions yet.</Text>
        )}
      </Pressable>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Players Overall</Text>
        {summary ? (
          renderTopPlayers(summary.topPlayers)
        ) : (
          <Text style={styles.cardBody}>No matches yet.</Text>
        )}
        <AppButton
          variant="secondary"
          title="View by group"
          onPress={() => {
            navigation.navigate("TopPlayersGroups");
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Previous Games</Text>
        <Text style={styles.cardBody}>View all finished sessions.</Text>
        <AppButton
          variant="secondary"
          title="View Sessions"
          onPress={() => navigation.navigate("SessionsList")}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Join by code</Text>
        <Text style={styles.cardBody}>Enter a group invite code to join.</Text>
        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Invite code"
          autoCapitalize="characters"
        />
        <AppButton title="Join group" onPress={joinByCode} />
      </View>
      <AppButton variant="ghost" title="Sign out" onPress={clearToken} />
      </ScrollView>
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    gap: 8,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#3f8fa3",
    opacity: 0.35,
    top: -140,
    right: -80,
  },
  heroDot: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f4a261",
    opacity: 0.25,
    bottom: -40,
    left: -20,
  },
  heroKicker: {
    color: "#fdf6ef",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#fcebd9",
  },
  card: {
    padding: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
    gap: 8,
    ...theme.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  cardBody: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    color: theme.colors.ink,
  },
  row: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  medal: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medalRank: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  medalGold: {
    backgroundColor: "#f6d48f",
    borderColor: "#cfa24d",
  },
  medalSilver: {
    backgroundColor: "#d8dde3",
    borderColor: "#9aa4af",
  },
  medalBronze: {
    backgroundColor: "#e6b08b",
    borderColor: "#b7724c",
  },
  leaderInfo: {
    flex: 1,
    gap: 2,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  leaderStats: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.soft,
    color: theme.colors.ink,
  },
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radius.input,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    ...theme.shadow,
  },
  toastText: {
    color: "#fff",
    fontWeight: "600",
  },
});
