import React, { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
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
    topTeams: { playerNames: string[]; wins: number; pointsFor: number; pointsAgainst: number }[];
    topPlayers: { name: string; wins: number; pointsFor: number; pointsAgainst: number }[];
  } | null>(null);
  const loadSummary = useCallback(async () => {
    try {
      const response = await api.get("/sessions/latest/summary");
      setSummary(response.data);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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
      Alert.alert("Joined group", "You can now view group sessions.");
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
        <View style={styles.hero}>
          <Text style={styles.kicker}>Dashboard</Text>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.subtitle}>Your groups, sessions, and stats in one place.</Text>
        </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Session</Text>
        {summary ? (
          <>
            <Text style={styles.cardBody}>{summary.sessionName}</Text>
            <Text style={styles.subTitle}>Top Teams</Text>
            {summary.topTeams.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              summary.topTeams.slice(0, 3).map((team, index) => (
                <Text key={`team-${index}`} style={styles.row}>
                  {team.playerNames.join(" & ")} — {team.wins}W ({team.pointsFor}-
                  {team.pointsAgainst})
                </Text>
              ))
            )}
            <Text style={styles.subTitle}>Top Players</Text>
            {summary.topPlayers.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              summary.topPlayers.slice(0, 3).map((player, index) => (
                <Text key={`player-${index}`} style={styles.row}>
                  {player.name} — {player.wins}W ({player.pointsFor}-{player.pointsAgainst})
                </Text>
              ))
            )}
          </>
        ) : (
          <Text style={styles.cardBody}>No finished sessions yet.</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Players Overall</Text>
        {summary ? (
          summary.topPlayers.slice(0, 3).map((player, index) => (
            <Text key={`leader-${index}`} style={styles.row}>
              {player.name} — {player.wins}W ({player.pointsFor}-{player.pointsAgainst})
            </Text>
          ))
        ) : (
          <Text style={styles.cardBody}>No matches yet.</Text>
        )}
        <AppButton
          variant="secondary"
          title="View Full Leaderboard"
          onPress={() => navigation.navigate("PlayersLeaderboard")}
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
  hero: {
    gap: 6,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.soft,
    color: theme.colors.ink,
  },
});
