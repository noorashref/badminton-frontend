import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SessionStackParamList } from "../navigation/types";
import api from "../api/client";
import type { AxiosError } from "axios";
import { theme } from "../ui/theme";
import { AppButton } from "../ui/Buttons";

type Props = NativeStackScreenProps<SessionStackParamList, "MatchesPerPlayer">;

type RoundAssignment = {
  id: string;
  teamA: [string, string];
  teamB: [string, string];
  score?: { teamAScore: number; teamBScore: number } | null;
};

type RoundPlan = {
  roundIndex: number;
  startTime: string;
  endTime: string;
  assignments: RoundAssignment[];
};

type SessionDetails = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  roundMinutes: number;
  groupId?: string | null;
  courts: { id: string; courtName: string; startTime: string; endTime: string }[];
  attendance: { playerId: string; player: { displayName: string; rating: number } }[];
};

type ToastState = {
  message: string;
  variant: "success" | "error";
};

export default function MatchesPerPlayerScreen({ route }: Props) {
  const { sessionId } = route.params;
  const [rounds, setRounds] = useState<RoundPlan[]>([]);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(`/sessions/${sessionId}`);
        setSession(response.data);
        const scheduleRes = await api.get(`/sessions/${sessionId}/schedule`);
        setRounds(scheduleRes.data.rounds ?? []);
      } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        if (err.response?.status === 401) return;
        const message = err.response?.data?.message ?? err.message;
        setToast({ message: `Load failed: ${message}`, variant: "error" });
      }
    };
    load();
  }, [sessionId]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2400);
  }, [toast]);

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    session?.attendance.forEach((entry) => {
      map.set(entry.playerId, entry.player.displayName);
    });
    return map;
  }, [session]);

  const playersSorted = useMemo(() => {
    if (!session) return [];
    return [...session.attendance]
      .map((entry) => ({
        id: entry.playerId,
        name: entry.player.displayName,
        rating: entry.player.rating,
      }))
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  }, [session]);

  const topBottom = useMemo(() => {
    const total = playersSorted.length;
    const topCount = Math.ceil(total / 2);
    return {
      top: playersSorted.slice(0, topCount),
      bottom: playersSorted.slice(topCount),
    };
  }, [playersSorted]);

  const matchesByPlayer = useMemo(() => {
    const map = new Map<string, string[]>();
    playersSorted.forEach((player) => map.set(player.id, []));

    rounds.forEach((round) => {
      round.assignments.forEach((assignment) => {
        const teamA = assignment.teamA.map((id) => playerNameById.get(id) ?? id);
        const teamB = assignment.teamB.map((id) => playerNameById.get(id) ?? id);
        const line = `${teamA[0]} & ${teamA[1]} vs ${teamB[0]} & ${teamB[1]}`;
        [...assignment.teamA, ...assignment.teamB].forEach((playerId) => {
          const list = map.get(playerId);
          if (list) list.push(line);
        });
      });
    });

    return map;
  }, [playersSorted, rounds, playerNameById]);

  const shareMatches = async () => {
    if (!session || playersSorted.length === 0) {
      Alert.alert("No players", "Add players before sharing.");
      return;
    }
    if (rounds.length === 0) {
      Alert.alert("No matches", "Generate matches before sharing.");
      return;
    }
    const lines: string[] = [];
    lines.push(`Session: ${session.name}`);
    lines.push("");
    playersSorted.forEach((player) => {
      lines.push(`${player.name} (rating ${player.rating})`);
      const matches = matchesByPlayer.get(player.id) ?? [];
      if (matches.length === 0) {
        lines.push("  - No matches");
      } else {
        matches.forEach((match) => {
          lines.push(`  - ${match}`);
        });
      }
      lines.push("");
    });
    try {
      await Share.share({
        title: `${session.name} - Matches per player`,
        message: lines.join("\n").trim(),
      });
    } catch (error) {
      Alert.alert("Share failed", "Unable to share matches.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Session</Text>
          <Text style={styles.title}>Matches per player</Text>
          <Text style={styles.subtitle}>Review pairings for each player.</Text>
          <View style={styles.headerActions}>
            <AppButton variant="secondary" title="Export" onPress={shareMatches} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players overview</Text>
          <Text style={styles.helper}>Players added: {playersSorted.length}</Text>
          <View style={styles.splitRow}>
            <View style={styles.splitCol}>
              <Text style={styles.splitTitle}>Top</Text>
              {topBottom.top.length === 0 ? (
                <Text style={styles.helper}>No players.</Text>
              ) : (
                topBottom.top.map((player) => (
                  <Text key={player.id} style={styles.splitItem}>
                    {player.name} ({player.rating})
                  </Text>
                ))
              )}
            </View>
            <View style={styles.splitCol}>
              <Text style={styles.splitTitle}>Bottom</Text>
              {topBottom.bottom.length === 0 ? (
                <Text style={styles.helper}>No players.</Text>
              ) : (
                topBottom.bottom.map((player) => (
                  <Text key={player.id} style={styles.splitItem}>
                    {player.name} ({player.rating})
                  </Text>
                ))
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matches</Text>
          {playersSorted.length === 0 ? (
            <Text style={styles.helper}>No players yet.</Text>
          ) : rounds.length === 0 ? (
            <Text style={styles.helper}>Generate matches to see pairings.</Text>
          ) : (
            playersSorted.map((player) => {
              const matches = matchesByPlayer.get(player.id) ?? [];
              return (
                <View key={player.id} style={styles.playerCard}>
                  <Text style={styles.playerName}>
                    {player.name} (rating {player.rating})
                  </Text>
                  {matches.length === 0 ? (
                    <Text style={styles.helper}>No matches yet.</Text>
                  ) : (
                    matches.map((match, index) => (
                      <Text key={`${player.id}-${index}`} style={styles.matchLine}>
                        {match}
                      </Text>
                    ))
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      {toast && (
        <View
          style={[
            styles.toast,
            toast.variant === "success" ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
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
  header: {
    gap: 6,
  },
  headerActions: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  kicker: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.muted,
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  helper: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  splitRow: {
    flexDirection: "row",
    gap: 16,
  },
  splitCol: {
    flex: 1,
    gap: 6,
  },
  splitTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  splitItem: {
    fontSize: 13,
    color: theme.colors.text,
  },
  playerCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  matchLine: {
    fontSize: 13,
    color: theme.colors.text,
  },
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: theme.colors.successBackground,
    borderColor: theme.colors.successBorder,
  },
  toastError: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.errorBorder,
  },
  toastText: {
    color: theme.colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
});
