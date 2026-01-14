import React, { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "PlayerSessions">;

type PlayerSession = {
  sessionId: string;
  sessionName: string;
  startTime: string;
  finishedAt: string | null;
  totals: { wins: number; losses: number; pointsFor: number; pointsAgainst: number };
  matches: {
    matchId: string;
    roundIndex: number;
    teamA: string[];
    teamB: string[];
    teamAScore: number;
    teamBScore: number;
    result: "W" | "L" | "D";
  }[];
};

type PlayerSessionsResponse = {
  playerId: string;
  playerName: string;
  sessions: PlayerSession[];
};

export default function PlayerSessionsScreen({ route, navigation }: Props) {
  const { groupId, playerId } = route.params;
  const [data, setData] = useState<PlayerSessionsResponse | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/groups/${groupId}/players/${playerId}/sessions`);
      setData(response.data ?? null);
    };
    load();
  }, [groupId, playerId]);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const visibleSessions = useMemo(
    () => sessions.slice(0, visibleCount),
    [sessions, visibleCount]
  );

  const shareAll = async () => {
    if (!data || sessions.length === 0) {
      Alert.alert("No sessions", "No session data available to share.");
      return;
    }
    const lines: string[] = [];
    lines.push(`${data.playerName} - Sessions`);
    lines.push("");
    sessions.forEach((session) => {
      lines.push(session.sessionName);
      lines.push(
        `Record: ${session.totals.wins}W-${session.totals.losses}L | Points: ${session.totals.pointsFor}-${session.totals.pointsAgainst}`
      );
      session.matches.forEach((match) => {
        lines.push(
          `  R${match.roundIndex + 1} ${match.teamA.join(" & ")} ${match.teamAScore}-${match.teamBScore} ${match.teamB.join(" & ")}`
        );
      });
      lines.push("");
    });
    try {
      await Share.share({
        title: `${data.playerName} - Sessions`,
        message: lines.join("\n").trim(),
      });
    } catch (error) {
      Alert.alert("Share failed", "Unable to share sessions.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Player</Text>
          <Text style={styles.title}>All Sessions</Text>
          <Text style={styles.subtitle}>{data?.playerName ?? "Loading…"}</Text>
          <View style={styles.headerActions}>
            <AppButton variant="secondary" title="Export" onPress={shareAll} />
          </View>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.helper}>No sessions recorded yet.</Text>
          </View>
        ) : (
          <>
            {visibleSessions.map((session) => (
              <View key={session.sessionId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.sessionName}>{session.sessionName}</Text>
                    <Text style={styles.sessionMeta}>
                      {session.finishedAt
                        ? `Completed ${new Date(session.finishedAt).toLocaleDateString()}`
                        : `Started ${new Date(session.startTime).toLocaleDateString()}`}
                    </Text>
                  </View>
                  <AppButton
                    variant="ghost"
                    title="View"
                    onPress={() =>
                      navigation.navigate("PlayerSessionDetail", {
                        groupId,
                        playerId,
                        sessionId: session.sessionId,
                      })
                    }
                  />
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryLabel}>Record</Text>
                    <Text style={styles.summaryValue}>
                      {session.totals.wins}W-{session.totals.losses}L
                    </Text>
                  </View>
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryLabel}>Points</Text>
                    <Text style={styles.summaryValue}>
                      {session.totals.pointsFor}-{session.totals.pointsAgainst}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {visibleCount < sessions.length && (
              <View style={styles.card}>
                <AppButton
                  variant="secondary"
                  title={`Load more (${sessions.length - visibleCount} left)`}
                  onPress={() => setVisibleCount((count) => count + 5)}
                />
              </View>
            )}
          </>
        )}
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
    gap: 12,
  },
  header: {
    gap: 6,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  headerActions: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 14,
    borderRadius: theme.radius.card,
    gap: 10,
    ...theme.shadow,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  sessionMeta: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: theme.colors.soft,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink,
    marginTop: 6,
  },
  helper: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
