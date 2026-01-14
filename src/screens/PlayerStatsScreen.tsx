import React, { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "PlayerStats">;

type PlayerStats = {
  playerId: string;
  playerName: string;
  isActive: boolean;
  totals: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    winRate: number;
  };
  topFinishes: {
    podiums: number;
    bestRank: number | null;
    sessionsPlayed: number;
  };
  recentMatches: {
    matchId: string;
    sessionId: string;
    sessionName: string;
    teamA: string[];
    teamB: string[];
    teamAScore: number;
    teamBScore: number;
    result: "W" | "L" | "D";
    playedAt: string;
  }[];
};

export default function PlayerStatsScreen({ route, navigation }: Props) {
  const { groupId, playerId } = route.params;
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/groups/${groupId}/players/${playerId}/stats`);
      setStats(response.data ?? null);
    };
    load();
  }, [groupId, playerId]);

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Player Stats</Text>
          <Text style={styles.muted}>No stats available yet.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerGlow} />
          <Text style={styles.kicker}>Player Stats</Text>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>{stats.playerName}</Text>
            <View
              style={[
                styles.statusBadge,
                stats.isActive ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  stats.isActive ? styles.statusTextActive : styles.statusTextInactive,
                ]}
              >
                {stats.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRow}>
            <View style={styles.headerPill}>
              <Ionicons name="trophy" size={14} color="#fff" />
              <Text style={styles.headerPillText}>{stats.totals.winRate}% win rate</Text>
            </View>
            <View style={styles.headerPillAlt}>
              <Text style={styles.headerPillTextAlt}>
                {stats.totals.matchesPlayed} matches
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Wins</Text>
            <Text style={styles.statValue}>{stats.totals.wins}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Losses</Text>
            <Text style={styles.statValue}>{stats.totals.losses}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Points For</Text>
            <Text style={styles.statValue}>{stats.totals.pointsFor}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Points Against</Text>
            <Text style={styles.statValue}>{stats.totals.pointsAgainst}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top Finishes</Text>
          <View style={styles.finishRow}>
            <View style={styles.finishItem}>
              <Ionicons name="medal" size={16} color={theme.colors.primary} />
              <Text style={styles.finishValue}>{stats.topFinishes.podiums}</Text>
              <Text style={styles.finishLabel}>Podiums</Text>
            </View>
            <View style={styles.finishItem}>
              <Ionicons name="stats-chart" size={16} color={theme.colors.primary} />
              <Text style={styles.finishValue}>
                {stats.topFinishes.bestRank ? `#${stats.topFinishes.bestRank}` : "—"}
              </Text>
              <Text style={styles.finishLabel}>Best Rank</Text>
            </View>
            <View style={styles.finishItem}>
              <Ionicons name="calendar" size={16} color={theme.colors.primary} />
              <Pressable
                style={styles.finishPressable}
                onPress={() => {
                  navigation.navigate("PlayerSessions", { groupId, playerId });
                }}
              >
                <Text style={styles.finishValue}>{stats.topFinishes.sessionsPlayed}</Text>
                <Text style={styles.finishLabel}>Sessions</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          {stats.recentMatches.length === 0 ? (
            <Text style={styles.muted}>No matches recorded yet.</Text>
          ) : (
            stats.recentMatches.map((match) => (
              <View key={match.matchId} style={styles.matchRow}>
                <View style={styles.matchHeader}>
                  <Text style={styles.matchTitle}>{match.sessionName}</Text>
                  <View
                    style={[
                      styles.resultBadge,
                      match.result === "W"
                        ? styles.resultWin
                        : match.result === "L"
                        ? styles.resultLoss
                        : styles.resultDraw,
                    ]}
                  >
                    <Text style={styles.resultText}>{match.result}</Text>
                  </View>
                </View>
                <Text style={styles.matchTeams}>
                  {match.teamA.join(" & ")} vs {match.teamB.join(" & ")}
                </Text>
                <Text style={styles.matchScore}>
                  {match.teamAScore} - {match.teamBScore}
                </Text>
              </View>
            ))
          )}
        </View>
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
  headerCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    gap: 10,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#3f8fa3",
    opacity: 0.4,
    top: -120,
    right: -60,
  },
  kicker: {
    color: "#fdf6ef",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  statusInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextActive: {
    color: "#fff",
  },
  statusTextInactive: {
    color: "#f5d7d7",
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  headerPillText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  headerPillAlt: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  headerPillTextAlt: {
    color: theme.colors.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "47%",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    padding: 16,
    gap: 6,
    ...theme.shadow,
  },
  statLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: theme.colors.muted,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    padding: 16,
    gap: 12,
    ...theme.shadow,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  finishRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  finishItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  finishValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  finishLabel: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  finishPressable: {
    alignItems: "center",
  },
  matchRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 4,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  matchTeams: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  matchScore: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  resultWin: {
    backgroundColor: "#c8e7d0",
  },
  resultLoss: {
    backgroundColor: "#f5c1c1",
  },
  resultDraw: {
    backgroundColor: "#f0e3b2",
  },
  resultText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  muted: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
