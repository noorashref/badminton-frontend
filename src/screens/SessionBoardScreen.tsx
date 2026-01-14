import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { SessionStackParamList } from "../navigation/types";
import api from "../api/client";
import type { AxiosError } from "axios";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<SessionStackParamList, "SessionBoard">;

type RoundAssignment = {
  id: string;
  courtId: string;
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

type PlayerItem = {
  id: string;
  displayName: string;
  rating: number;
};

type ToastState = {
  message: string;
  variant: "success" | "error";
};

export default function SessionBoardScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [rounds, setRounds] = useState<RoundPlan[]>([]);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [courtName, setCourtName] = useState("Court A");
  const [courtHours, setCourtHours] = useState("2");
  const [playerName, setPlayerName] = useState("");
  const [playerRating, setPlayerRating] = useState("50");
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [lateArrivalMode, setLateArrivalMode] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const applySchedule = (scheduleData: { rounds?: RoundPlan[] }) => {
    const nextRounds = scheduleData.rounds ?? [];
    setRounds(nextRounds);
  };

  const gamesByPlayerId = useMemo(() => {
    const counts: Record<string, number> = {};
    rounds.forEach((round) => {
      round.assignments.forEach((assignment) => {
        [...assignment.teamA, ...assignment.teamB].forEach((playerId) => {
          counts[playerId] = (counts[playerId] ?? 0) + 1;
        });
      });
    });
    return counts;
  }, [rounds]);
  const playerTotals = useMemo(() => {
    if (!session) return [];
    return session.attendance
      .map((entry) => ({
        id: entry.playerId,
        name: entry.player.displayName,
        games: gamesByPlayerId[entry.playerId] ?? 0,
      }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
  }, [gamesByPlayerId, session]);

  const attendanceCount = session?.attendance.length ?? 0;
  const attendanceIds = useMemo(() => {
    return new Set(session?.attendance.map((entry) => entry.playerId) ?? []);
  }, [session]);
  const availablePlayers = useMemo(() => {
    return players.filter((player) => !attendanceIds.has(player.id));
  }, [players, attendanceIds]);
  const sessionWindow = useMemo(() => {
    if (!session) return null;
    return {
      start: new Date(session.startTime),
      end: new Date(session.endTime),
    };
  }, [session]);

  const loadSession = useCallback(async () => {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
      const scheduleRes = await api.get(`/sessions/${sessionId}/schedule`);
      applySchedule(scheduleRes.data);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      if (err.response?.status === 401) return;
      const message = err.response?.data?.message ?? err.message;
      setToast({ message: `Load failed: ${message}`, variant: "error" });
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession])
  );

  useEffect(() => {
    if (!session) return;
    const loadPlayers = async () => {
      const response = session.groupId
        ? await api.get(`/groups/${session.groupId}/players`)
        : await api.get("/players");
      setPlayers(response.data ?? []);
    };
    loadPlayers();
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2400);
  }, [toast]);

  const addCourt = async () => {
    try {
      if (!sessionWindow) {
        Alert.alert("Session not ready");
        return;
      }
      if (!courtName.trim()) {
        Alert.alert("Missing court name");
        return;
      }
      const hours = Number(courtHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        Alert.alert("Invalid duration", "Enter number of hours (e.g. 2).");
        return;
      }
      const start = sessionWindow.start;
      const endCandidate = new Date(start.getTime() + hours * 60 * 60 * 1000);
      const end = endCandidate > sessionWindow.end ? sessionWindow.end : endCandidate;
      await api.post(`/sessions/${sessionId}/courts`, {
        courtName: courtName.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      console.error("Add court error", status, message);
      Alert.alert(
        "Add court failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  const addPlayer = async () => {
    if (!sessionWindow) {
      Alert.alert("Session not ready");
      return;
    }
    if (!session) {
      Alert.alert("Session not ready");
      return;
    }
    if (!playerName.trim()) {
      Alert.alert("Missing name", "Enter a player name.");
      return;
    }
    const rating = Number(playerRating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 100) {
      Alert.alert("Invalid rating", "Use a rating between 0 and 100.");
      return;
    }
    const playerRes = session.groupId
      ? await api.post(`/groups/${session.groupId}/players`, {
          displayName: playerName.trim(),
          rating,
        })
      : await api.post("/players", {
        displayName: playerName.trim(),
        rating,
      });
    const arriveAt = lateArrivalMode ? new Date() : sessionWindow.start;
    const leaveAt = sessionWindow.end;
    if (lateArrivalMode) {
      await api.post(`/sessions/${sessionId}/player-arrived`, {
        playerId: playerRes.data.id,
        arriveAt: arriveAt.toISOString(),
        leaveAt: leaveAt.toISOString(),
      });
      const scheduleRes = await api.get(`/sessions/${sessionId}/schedule`);
      applySchedule(scheduleRes.data);
    } else {
      await api.post(`/sessions/${sessionId}/players`, {
        playerId: playerRes.data.id,
        arriveAt: arriveAt.toISOString(),
        leaveAt: leaveAt.toISOString(),
      });
    }
    setPlayerName("");
    const response = await api.get(`/sessions/${sessionId}`);
    setSession(response.data);
    const playersResponse = session.groupId
      ? await api.get(`/groups/${session.groupId}/players`)
      : await api.get("/players");
    setPlayers(playersResponse.data ?? []);
  };

  const removePlayer = async (playerId: string) => {
    try {
      const response = await api.delete(`/sessions/${sessionId}/players/${playerId}`);
      applySchedule(response.data);
      const sessionRes = await api.get(`/sessions/${sessionId}`);
      setSession(sessionRes.data);
      setToast({ message: "Player removed.", variant: "success" });
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      if (status === 404) {
        Alert.alert("Remove player failed", "Server update required for this action.");
        return;
      }
      Alert.alert(
        "Remove player failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  const addExistingPlayer = async (playerId: string) => {
    try {
      if (!sessionWindow) {
        Alert.alert("Session not ready");
        return;
      }
      const arriveAt = lateArrivalMode ? new Date() : sessionWindow.start;
      const leaveAt = sessionWindow.end;
      if (lateArrivalMode) {
        await api.post(`/sessions/${sessionId}/player-arrived`, {
          playerId,
          arriveAt: arriveAt.toISOString(),
          leaveAt: leaveAt.toISOString(),
        });
        const scheduleRes = await api.get(`/sessions/${sessionId}/schedule`);
        applySchedule(scheduleRes.data);
      } else {
        await api.post(`/sessions/${sessionId}/players`, {
          playerId,
          arriveAt: arriveAt.toISOString(),
          leaveAt: leaveAt.toISOString(),
        });
      }
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
      setPlayerSearch("");
      setSelectedPlayerId(null);
      setShowPlayerList(false);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      Alert.alert(
        "Add player failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  const generateSchedule = async () => {
    if (!session || attendanceCount < 4) {
      Alert.alert(
        "Missing setup",
        "Add at least 4 players before generating."
      );
      return;
    }
    const hasScores = rounds.some((round) =>
      round.assignments.some((assignment) => assignment.score)
    );
    const endpoint =
      lateArrivalMode || hasScores
        ? `/sessions/${sessionId}/regenerate-remaining`
        : `/sessions/${sessionId}/generate-schedule`;
    try {
      const response = await api.post(endpoint, {});
      applySchedule(response.data);
      setToast({
        message: lateArrivalMode
          ? "Remaining rounds regenerated."
          : hasScores
          ? "Scores kept. Remaining rounds regenerated."
          : "Schedule generated.",
        variant: "success",
      });
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const message = err.response?.data?.message ?? err.message;
      setToast({
        message: `Schedule failed: ${message}`,
        variant: "error",
      });
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Live session</Text>
          <Text style={styles.title}>Session Board</Text>
          <Text style={styles.subtitle}>
            Manage courts, players, and schedules for this session.
          </Text>
        </View>
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Courts</Text>
        <Text style={styles.label}>Court name</Text>
        <TextInput style={styles.input} value={courtName} onChangeText={setCourtName} />
        <Text style={styles.label}>Duration (hours)</Text>
        <TextInput
          style={styles.input}
          value={courtHours}
          onChangeText={setCourtHours}
          keyboardType="number-pad"
          placeholder="2"
        />
        <AppButton title="Add Court" onPress={addCourt} />
        <Text style={styles.helper}>
          Courts are optional. The scheduler uses the session duration and round length.
        </Text>
        <Text style={styles.count}>Courts added: {session?.courts.length ?? 0}</Text>
        {session?.courts.map((court) => (
          <Text key={court.id} style={styles.helper}>
            {court.courtName}
          </Text>
        ))}
        </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.helper}>
          {lateArrivalMode
            ? "Late arrival mode: new players join from now and future rounds update."
            : "Standard mode: players are added for the full session window."}
        </Text>
        <AppButton
          variant="secondary"
          title={lateArrivalMode ? "Switch to full session" : "Add late arrival"}
          onPress={() => setLateArrivalMode((prev) => !prev)}
        />
        <Text style={styles.label}>Add existing player</Text>
        <TextInput
          style={styles.input}
          value={playerSearch}
          onChangeText={(value) => {
            setPlayerSearch(value);
            setShowPlayerList(true);
          }}
          onFocus={() => setShowPlayerList(true)}
          placeholder="Search player"
        />
        {showPlayerList && playerSearch.trim().length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView
              style={styles.dropdownList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {availablePlayers
                .filter((player) =>
                  `${player.displayName}`.toLowerCase().includes(playerSearch.toLowerCase())
                )
                .map((player) => (
                  <Pressable
                    key={player.id}
                    style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedPlayerId(player.id);
                    setShowPlayerList(false);
                    addExistingPlayer(player.id);
                  }}
                >
                    <Text style={styles.dropdownText}>
                      {player.displayName} (rating {player.rating})
                    </Text>
                  </Pressable>
                ))}
              {availablePlayers.filter((player) =>
                `${player.displayName}`.toLowerCase().includes(playerSearch.toLowerCase())
              ).length === 0 && (
                <Text style={styles.helper}>No matching players.</Text>
              )}
            </ScrollView>
          </View>
        )}
        <Text style={styles.helper}>Or create a new player:</Text>
        <Text style={styles.label}>Player name</Text>
        <TextInput style={styles.input} value={playerName} onChangeText={setPlayerName} />
        <Text style={styles.label}>Rating (0-100)</Text>
        <TextInput
          style={styles.input}
          value={playerRating}
          onChangeText={setPlayerRating}
          keyboardType="number-pad"
        />
        <AppButton title="Add Player" onPress={addPlayer} />
        <Text style={styles.helper}>Players are added for the full session window.</Text>
        <Text style={styles.count}>Total players: {attendanceCount}</Text>
        {attendanceCount > 0 && (
          <View style={styles.rosterWrap}>
            {session?.attendance.map((entry) => {
              const initials = entry.player.displayName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("");
              return (
                <View key={entry.playerId} style={styles.rosterItem}>
                  <View style={styles.rosterAvatar}>
                    <Text style={styles.rosterAvatarText}>{initials || "?"}</Text>
                  </View>
                  <Pressable
                    style={styles.rosterRemove}
                    onPress={() =>
                      Alert.alert(
                        "Remove player",
                        `Remove ${entry.player.displayName} from this session?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => removePlayer(entry.playerId),
                          },
                        ]
                      )
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.rosterRemoveText}>×</Text>
                  </Pressable>
                  <Text style={styles.rosterName} numberOfLines={1}>
                    {entry.player.displayName}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        </View>
        <View style={styles.actions}>
          <AppButton
            title={lateArrivalMode ? "Regenerate remaining rounds" : "Generate Matches"}
            onPress={generateSchedule}
          />
          <AppButton
            variant="secondary"
            title="View Matches"
            onPress={() => navigation.navigate("SessionMatches", { sessionId })}
          />
          <AppButton
            variant="secondary"
            title="Matches per players"
            onPress={() => navigation.navigate("MatchesPerPlayer", { sessionId })}
          />
          <AppButton
            variant="secondary"
            title="Manual Match"
            onPress={() => navigation.navigate("ManualMatch", { sessionId })}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Games per player</Text>
          <Text style={styles.helper}>
            Totals update after generating matches.
          </Text>
          {playerTotals.length === 0 ? (
            <Text style={styles.helper}>No players yet.</Text>
          ) : (
            playerTotals.map((player) => (
              <View key={player.id} style={styles.totalRow}>
                <Text style={styles.totalName} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={styles.totalValue}>{player.games}</Text>
              </View>
            ))
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
  section: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 10,
    ...theme.shadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  actions: {
    flexDirection: "column",
    gap: 12,
    alignItems: "stretch",
  },
  helper: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  count: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  roundCard: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 8,
    ...theme.shadow,
  },
  matchRow: {
    gap: 8,
  },
  roundTitle: {
    fontWeight: "600",
  },
  assignment: {
    color: theme.colors.muted,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreInput: {
    width: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingVertical: 6,
    textAlign: "center",
    backgroundColor: theme.colors.soft,
    color: theme.colors.ink,
  },
  scoreDash: {
    fontWeight: "700",
    color: theme.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
  },
  select: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
  },
  rosterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rosterItem: {
    alignItems: "center",
    width: 72,
    gap: 6,
    position: "relative",
  },
  rosterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rosterRemove: {
    position: "absolute",
    top: -2,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f3d4d4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2a9a9",
  },
  rosterRemoveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8a1c1c",
    lineHeight: 12,
  },
  rosterAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  rosterName: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: "center",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.card,
    maxHeight: 180,
    overflow: "hidden",
    zIndex: 10,
    elevation: 3,
  },
  dropdownList: {
    maxHeight: 180,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownText: {
    fontSize: 14,
    color: theme.colors.ink,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  totalName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.ink,
    marginRight: 12,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.accent,
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
    ...theme.shadow,
  },
  toastSuccess: {
    backgroundColor: "#0f4c5c",
  },
  toastError: {
    backgroundColor: "#8a1c1c",
  },
  toastText: {
    color: "#fff",
    fontWeight: "600",
  },
});
