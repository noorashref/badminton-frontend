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
  const formatRecord = (wins: number, losses: number) => `${wins}W-${losses}L`;
  const formatPoints = (pointsFor: number, pointsAgainst: number) =>
    `${pointsFor}-${pointsAgainst}`;

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
            :root {
              color-scheme: light;
              --ink: #1f1b16;
              --muted: #6b655f;
              --card: #ffffff;
              --border: #e7e0d7;
              --accent: #c75d00;
              --soft: #f9f4ee;
            }
            body {
              font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
              padding: 28px;
              color: var(--ink);
              background: var(--soft);
            }
            .hero {
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: 14px;
              padding: 18px;
              margin-bottom: 18px;
            }
            h1 {
              font-size: 22px;
              margin: 0 0 6px;
              letter-spacing: 0.2px;
            }
            .subtitle {
              margin: 0;
              color: var(--muted);
              font-size: 13px;
            }
            .section {
              background: var(--card);
              border: 1px solid var(--border);
              border-radius: 14px;
              padding: 14px 16px;
              margin: 14px 0;
            }
            .section h2 {
              font-size: 15px;
              margin: 0 0 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              text-align: left;
              padding: 8px 6px;
              border-bottom: 1px solid var(--border);
              vertical-align: top;
            }
            th {
              color: var(--muted);
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 999px;
              border: 1px solid var(--border);
              background: #fdf9f5;
              font-size: 11px;
              color: var(--accent);
              font-weight: 600;
            }
            .empty {
              margin: 0;
              color: var(--muted);
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>Session Summary</h1>
            <p class="subtitle">${summary.sessionName}</p>
            ${
              summary.finishedAt
                ? `<p class="subtitle">Completed ${new Date(summary.finishedAt).toLocaleString()}</p>`
                : `<p class="subtitle">In progress</p>`
            }
          </div>

          <div class="section">
            <h2>Top Teams</h2>
            ${
              summary.topTeams.length === 0
                ? `<p class="empty">No scores yet.</p>`
                : `<table>
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>Record</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${summary.topTeams
                        .map(
                          (team) => `<tr>
                            <td>${team.playerNames.join(" & ")}</td>
                            <td><span class="badge">${team.wins}W-${team.losses}L</span></td>
                            <td>${team.pointsFor}-${team.pointsAgainst}</td>
                          </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>`
            }
          </div>

          <div class="section">
            <h2>Top Players</h2>
            ${
              summary.topPlayers.length === 0
                ? `<p class="empty">No scores yet.</p>`
                : `<table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Record</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${summary.topPlayers
                        .map(
                          (player) => `<tr>
                            <td>${player.name}</td>
                            <td><span class="badge">${player.wins}W-${player.losses}L</span></td>
                            <td>${player.pointsFor}-${player.pointsAgainst}</td>
                          </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>`
            }
          </div>

          <div class="section">
            <h2>Match Scores</h2>
            ${
              summary.matches.length === 0
                ? `<p class="empty">No scores yet.</p>`
                : `<table>
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Team A</th>
                        <th>Score</th>
                        <th>Team B</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${summary.matches
                        .map(
                          (match) => `<tr>
                            <td>R${match.roundIndex + 1}</td>
                            <td>${match.teamA.join(" & ")}</td>
                            <td><span class="badge">${match.teamAScore}-${match.teamBScore}</span></td>
                            <td>${match.teamB.join(" & ")}</td>
                          </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>`
            }
          </div>
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
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeaderRow}>
                <View>
                  <Text style={styles.sessionName}>{summary.sessionName}</Text>
                  <Text style={styles.sessionMeta}>
                    {summary.finishedAt
                      ? `Completed ${new Date(summary.finishedAt).toLocaleString()}`
                      : "In progress"}
                  </Text>
                </View>
                <AppButton title="Export PDF" onPress={exportPdf} />
              </View>
              <View style={styles.summaryHighlights}>
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightLabel}>Teams</Text>
                  <Text style={styles.highlightValue}>{summary.topTeams.length}</Text>
                </View>
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightLabel}>Players</Text>
                  <Text style={styles.highlightValue}>{summary.topPlayers.length}</Text>
                </View>
                <View style={styles.highlightCard}>
                  <Text style={styles.highlightLabel}>Matches</Text>
                  <Text style={styles.highlightValue}>{summary.matches.length}</Text>
                </View>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top Teams</Text>
              {summary.topTeams.length === 0 ? (
                <Text style={styles.empty}>No scores yet.</Text>
              ) : (
                summary.topTeams.slice(0, 5).map((team) => (
                  <View key={team.playerNames.join("|")} style={styles.listRow}>
                    <Text style={styles.rowTitle}>{team.playerNames.join(" & ")}</Text>
                    <View style={styles.rowMeta}>
                      <Text style={styles.badge}>{formatRecord(team.wins, team.losses)}</Text>
                      <Text style={styles.points}>{formatPoints(team.pointsFor, team.pointsAgainst)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top Players</Text>
              {summary.topPlayers.length === 0 ? (
                <Text style={styles.empty}>No scores yet.</Text>
              ) : (
                summary.topPlayers.slice(0, 5).map((player) => (
                  <View key={player.name} style={styles.listRow}>
                    <Text style={styles.rowTitle}>{player.name}</Text>
                    <View style={styles.rowMeta}>
                      <Text style={styles.badge}>{formatRecord(player.wins, player.losses)}</Text>
                      <Text style={styles.points}>
                        {formatPoints(player.pointsFor, player.pointsAgainst)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Match Scores</Text>
              {summary.matches.length === 0 ? (
                <Text style={styles.empty}>No scores yet.</Text>
              ) : (
                summary.matches.map((match) => (
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
    gap: 10,
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
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  sessionMeta: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  summaryHeader: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.card,
    padding: 14,
    gap: 10,
    ...theme.shadow,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  highlightCard: {
    flexGrow: 1,
    minWidth: 120,
    backgroundColor: theme.colors.soft,
    borderRadius: theme.radius.card,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  highlightLabel: {
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink,
    marginTop: 6,
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 12,
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
  empty: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  listRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.accent,
    backgroundColor: theme.colors.soft,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  points: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink,
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
