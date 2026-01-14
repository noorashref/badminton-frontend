import React, { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "PlayerSessionDetail">;

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

export default function PlayerSessionDetailScreen({ route }: Props) {
  const { groupId, playerId, sessionId } = route.params;
  const [data, setData] = useState<PlayerSessionsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/groups/${groupId}/players/${playerId}/sessions`);
      setData(response.data ?? null);
    };
    load();
  }, [groupId, playerId]);

  const session = useMemo(() => {
    return data?.sessions.find((entry) => entry.sessionId === sessionId) ?? null;
  }, [data, sessionId]);

  const shareSession = async () => {
    if (!data || !session) {
      Alert.alert("No data", "Session details are not available yet.");
      return;
    }
    const lines: string[] = [];
    lines.push(`${data.playerName} - ${session.sessionName}`);
    lines.push("");
    lines.push(`Record: ${session.totals.wins}W-${session.totals.losses}L`);
    lines.push(`Points: ${session.totals.pointsFor}-${session.totals.pointsAgainst}`);
    lines.push("");
    session.matches.forEach((match) => {
      lines.push(
        `R${match.roundIndex + 1} ${match.teamA.join(" & ")} ${match.teamAScore}-${match.teamBScore} ${match.teamB.join(" & ")}`
      );
    });
    try {
      await Share.share({
        title: `${data.playerName} - ${session.sessionName}`,
        message: lines.join("\n").trim(),
      });
    } catch (error) {
      Alert.alert("Share failed", "Unable to share session details.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Player</Text>
          <Text style={styles.title}>Session Details</Text>
          {data ? (
            <Text style={styles.subtitle}>{data.playerName}</Text>
          ) : (
            <Text style={styles.subtitle}>Loading…</Text>
          )}
        </View>

        {!session ? (
          <View style={styles.card}>
            <Text style={styles.helper}>No session details found.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.sessionName}>{session.sessionName}</Text>
                  <Text style={styles.sessionMeta}>
                    {session.finishedAt
                      ? `Completed ${new Date(session.finishedAt).toLocaleString()}`
                      : `Started ${new Date(session.startTime).toLocaleString()}`}
                  </Text>
                </View>
                <AppButton variant="secondary" title="Export" onPress={shareSession} />
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

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Match Scores</Text>
              {session.matches.length === 0 ? (
                <Text style={styles.helper}>No scored matches yet.</Text>
              ) : (
                session.matches.map((match) => (
                  <View key={match.matchId} style={styles.matchRow}>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>R{match.roundIndex + 1}</Text>
                    </View>
                    <Text style={styles.matchTeam} numberOfLines={1}>
                      {match.teamA.join(" & ")}
                    </Text>
                    <View style={styles.matchScorePill}>
                      <Text style={styles.matchScoreText}>
                        {match.teamAScore}-{match.teamBScore}
                      </Text>
                    </View>
                    <Text style={styles.matchTeam} numberOfLines={1}>
                      {match.teamB.join(" & ")}
                    </Text>
                  </View>
                ))
              )}
            </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  matchBadge: {
    backgroundColor: theme.colors.soft,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  matchTeam: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.ink,
  },
  matchScorePill: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.soft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});
