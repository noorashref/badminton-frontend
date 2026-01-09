import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "SessionSummary">;

type Summary = {
  sessionName: string;
  finishedAt: string | null;
  topTeams: {
    playerNames: string[];
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
  topPlayers: {
    name: string;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
  matches: {
    matchId: string;
    roundIndex: number;
    teamA: string[];
    teamB: string[];
    teamAScore: number;
    teamBScore: number;
  }[];
};

export default function SessionSummaryScreen({ route }: Props) {
  const { sessionId } = route.params;
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/sessions/${sessionId}/summary`);
      setSummary(response.data);
    };
    load();
  }, [sessionId]);

  const exportPdf = async () => {
    if (!summary) return;
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #1f1b16; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            h2 { font-size: 16px; margin: 18px 0 8px; }
            p { margin: 0 0 12px; color: #5b5b5b; }
            ul { margin: 0; padding-left: 18px; }
            li { margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <h1>Session Summary</h1>
          <p>${summary.sessionName}</p>
          <h2>Top Teams</h2>
          <ul>
            ${
              summary.topTeams.length === 0
                ? "<li>No scores yet.</li>"
                : summary.topTeams
                    .map(
                      (team) =>
                        `<li>${team.playerNames.join(" & ")} — ${team.wins}W (${team.pointsFor}-${team.pointsAgainst})</li>`
                    )
                    .join("")
            }
          </ul>
          <h2>Top Players</h2>
          <ul>
            ${
              summary.topPlayers.length === 0
                ? "<li>No scores yet.</li>"
                : summary.topPlayers
                    .map(
                      (player) =>
                        `<li>${player.name} — ${player.wins}W (${player.pointsFor}-${player.pointsAgainst})</li>`
                    )
                    .join("")
            }
          </ul>
          <h2>Match Scores</h2>
          <ul>
            ${
              summary.matches.length === 0
                ? "<li>No scores yet.</li>"
                : summary.matches
                    .map(
                      (match) =>
                        `<li>R${match.roundIndex + 1}: ${match.teamA.join(" & ")} ${match.teamAScore}-${match.teamBScore} ${match.teamB.join(" & ")}</li>`
                    )
                    .join("")
            }
          </ul>
        </body>
      </html>
    `;
    try {
      const result = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share session summary",
        });
      } else {
        Alert.alert("Exported", `PDF saved to: ${result.uri}`);
      }
    } catch (error: any) {
      Alert.alert("Export failed", error?.message ?? "Unable to export PDF.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Report</Text>
          <Text style={styles.title}>Session Summary</Text>
          <Text style={styles.subtitle}>Share or save the full statistics.</Text>
        </View>
        {summary ? (
          <>
            <Text style={styles.sessionName}>{summary.sessionName}</Text>
            <AppButton title="Export PDF" onPress={exportPdf} />
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top Teams</Text>
            {summary.topTeams.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              summary.topTeams.slice(0, 5).map((team) => (
                <Text key={team.playerNames.join("|")} style={styles.row}>
                  {team.playerNames.join(" & ")} — {team.wins}W ({team.pointsFor}-
                  {team.pointsAgainst})
                </Text>
              ))
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top Players</Text>
            {summary.topPlayers.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              summary.topPlayers.slice(0, 5).map((player) => (
                <Text key={player.name} style={styles.row}>
                  {player.name} — {player.wins}W ({player.pointsFor}-
                  {player.pointsAgainst})
                </Text>
              ))
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Match Scores</Text>
            {summary.matches.length === 0 ? (
              <Text style={styles.row}>No scores yet.</Text>
            ) : (
              summary.matches.map((match) => (
                <Text key={match.matchId} style={styles.row}>
                  R{match.roundIndex + 1}: {match.teamA.join(" & ")} {match.teamAScore}
                  -{match.teamBScore} {match.teamB.join(" & ")}
                </Text>
              ))
            )}
          </View>
          </>
        ) : (
          <Text style={styles.row}>Loading…</Text>
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
    fontSize: 15,
    color: theme.colors.muted,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 8,
    ...theme.shadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  row: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
