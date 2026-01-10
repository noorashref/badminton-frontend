import React, { useEffect, useMemo, useRef, useState } from "react";
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

type PickerOption = {
  id: string;
  label: string;
};

const Picker = ({
  label,
  options,
  selectedId,
  onSelect,
  onClear,
}: {
  label: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear?: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.id === selectedId)?.label ?? "";
  const displayValue = open ? search : selectedLabel || search;
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.picker}>
      <View style={styles.pickerHeader}>
        <Text style={styles.label}>{label}</Text>
        {selectedId && onClear ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {selectedId ? (
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{selectedLabel}</Text>
            {onClear ? (
              <Pressable onPress={onClear} hitSlop={8}>
                <Text style={styles.chipClose}>×</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={displayValue}
        onChangeText={(value) => {
          setSearch(value);
          setOpen(true);
        }}
        onFocus={() => {
          setSearch("");
          setOpen(true);
        }}
        placeholder="Select"
      />
      {open && filtered.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
            {filtered.map((option) => (
              <Pressable
                key={option.id}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(option.id);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <Text style={styles.dropdownText}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function SessionBoardScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [rounds, setRounds] = useState<RoundPlan[]>([]);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [courtName, setCourtName] = useState("Court A");
  const [courtHours, setCourtHours] = useState("2");
  const [playerName, setPlayerName] = useState("");
  const [playerRating, setPlayerRating] = useState("5");
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>({});
  const [playerSearch, setPlayerSearch] = useState("");
  const [lateArrivalMode, setLateArrivalMode] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [manualTeamA1, setManualTeamA1] = useState<string | null>(null);
  const [manualTeamA2, setManualTeamA2] = useState<string | null>(null);
  const [manualTeamB1, setManualTeamB1] = useState<string | null>(null);
  const [manualTeamB2, setManualTeamB2] = useState<string | null>(null);
  const [manualCourtId, setManualCourtId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSaved = useRef<Record<string, { a: string; b: string }>>({});
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const applySchedule = (scheduleData: { rounds?: RoundPlan[] }) => {
    const nextRounds = scheduleData.rounds ?? [];
    const nextScores: Record<string, { a: string; b: string }> = {};
    nextRounds.forEach((round) => {
      round.assignments.forEach((assignment) => {
        if (assignment.score) {
          nextScores[assignment.id] = {
            a: String(assignment.score.teamAScore),
            b: String(assignment.score.teamBScore),
          };
        }
      });
    });
    setRounds(nextRounds);
    setScores(nextScores);
  };

  const attendanceCount = session?.attendance.length ?? 0;
  const attendanceIds = useMemo(() => {
    return new Set(session?.attendance.map((entry) => entry.playerId) ?? []);
  }, [session]);
  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    session?.attendance.forEach((entry) => {
      map.set(entry.playerId, entry.player.displayName);
    });
    return map;
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

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
      const scheduleRes = await api.get(`/sessions/${sessionId}/schedule`);
      applySchedule(scheduleRes.data);
    };
    load();
  }, [sessionId]);

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

  useEffect(() => {
    if (!manualCourtId && session?.courts?.length) {
      setManualCourtId(session.courts[0].id);
    }
  }, [manualCourtId, session?.courts]);

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
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
      Alert.alert("Invalid rating", "Use a rating between 1 and 10.");
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
    if (!session || session.courts.length === 0 || attendanceCount < 4) {
      Alert.alert(
        "Missing setup",
        "Add at least 1 court and 4 players before generating."
      );
      return;
    }
    const endpoint = lateArrivalMode
      ? `/sessions/${sessionId}/regenerate-remaining`
      : `/sessions/${sessionId}/generate-schedule`;
    try {
      const response = await api.post(endpoint, {});
      applySchedule(response.data);
      setToast({
        message: lateArrivalMode
          ? "Remaining rounds regenerated."
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

  const addManualMatch = async () => {
    if (!manualTeamA1 || !manualTeamA2 || !manualTeamB1 || !manualTeamB2) {
      Alert.alert("Pick players", "Select 4 players for the manual match.");
      return;
    }
    if (new Set([manualTeamA1, manualTeamA2, manualTeamB1, manualTeamB2]).size < 4) {
      Alert.alert("Duplicate player", "Each player must be unique.");
      return;
    }
    if (!manualCourtId) {
      Alert.alert("Pick a court", "Add or select a court first.");
      return;
    }
    try {
      const response = await api.post(`/sessions/${sessionId}/manual-match`, {
        teamAPlayer1Id: manualTeamA1,
        teamAPlayer2Id: manualTeamA2,
        teamBPlayer1Id: manualTeamB1,
        teamBPlayer2Id: manualTeamB2,
        courtId: manualCourtId,
      });
      applySchedule(response.data);
      setManualTeamA1(null);
      setManualTeamA2(null);
      setManualTeamB1(null);
      setManualTeamB2(null);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      Alert.alert(
        "Manual match failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  const saveScore = async (assignment: RoundAssignment, silent = false) => {
    try {
      const score = scores[assignment.id] ?? { a: "", b: "" };
      const teamAScore = Number(score.a);
      const teamBScore = Number(score.b);
      if (!Number.isFinite(teamAScore) || !Number.isFinite(teamBScore)) {
        if (!silent) {
          Alert.alert("Invalid score", "Enter numeric scores.");
        }
        return;
      }
      await api.post(`/sessions/${sessionId}/assignments/${assignment.id}/score`, {
        teamAScore,
        teamBScore,
      });
      lastSaved.current[assignment.id] = { a: score.a, b: score.b };
      if (!silent) {
        setToast({ message: "Score saved.", variant: "success" });
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      if (!silent) {
        setToast({
          message: status ? `Save failed: ${message}` : `Save failed: ${message}`,
          variant: "error",
        });
      }
    }
  };

  const scheduleAutoSave = (assignment: RoundAssignment, nextScore?: { a: string; b: string }) => {
    const score = nextScore ?? scores[assignment.id];
    if (!score) return;
    if (saveTimers.current[assignment.id]) {
      clearTimeout(saveTimers.current[assignment.id]);
    }
    saveTimers.current[assignment.id] = setTimeout(() => {
      const last = lastSaved.current[assignment.id];
      if (last && last.a === score.a && last.b === score.b) {
        return;
      }
      saveScore(assignment, true);
    }, 700);
  };

  const finishSession = async () => {
    try {
      await api.post(`/sessions/${sessionId}/finish`, {});
      Alert.alert("Session finished", "Games saved successfully.", [
        {
          text: "OK",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "SessionGroups" as never }],
            });
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate("HomeTab" as never, {
                screen: "Home",
                params: { refreshKey: Date.now() },
              } as never);
            } else {
              navigation.navigate("Home" as never);
            }
          },
        },
      ]);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      Alert.alert(
        "Finish failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
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
            Manage courts, players, schedules, and scores in one view.
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
          Courts run from session start time for the duration you set.
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
        <Text style={styles.label}>Rating (1-10)</Text>
        <TextInput
          style={styles.input}
          value={playerRating}
          onChangeText={setPlayerRating}
          keyboardType="number-pad"
        />
        <AppButton title="Add Player" onPress={addPlayer} />
        <Text style={styles.helper}>Players are added for the full session window.</Text>
        <Text style={styles.count}>Total players: {attendanceCount}</Text>
        </View>
        <View style={styles.actions}>
          <AppButton
            title={lateArrivalMode ? "Regenerate remaining rounds" : "Generate Matches"}
            onPress={generateSchedule}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual match (optional)</Text>
          <Text style={styles.helper}>
            Pair players manually and record the score in this session.
          </Text>
          <Picker
            label="Team A - Player 1"
            options={session?.attendance.map((entry) => ({
              id: entry.playerId,
              label: entry.player.displayName,
            })) ?? []}
            selectedId={manualTeamA1}
            onSelect={setManualTeamA1}
            onClear={() => setManualTeamA1(null)}
          />
          <Picker
            label="Team A - Player 2"
            options={session?.attendance.map((entry) => ({
              id: entry.playerId,
              label: entry.player.displayName,
            })) ?? []}
            selectedId={manualTeamA2}
            onSelect={setManualTeamA2}
            onClear={() => setManualTeamA2(null)}
          />
          <Picker
            label="Team B - Player 1"
            options={session?.attendance.map((entry) => ({
              id: entry.playerId,
              label: entry.player.displayName,
            })) ?? []}
            selectedId={manualTeamB1}
            onSelect={setManualTeamB1}
            onClear={() => setManualTeamB1(null)}
          />
          <Picker
            label="Team B - Player 2"
            options={session?.attendance.map((entry) => ({
              id: entry.playerId,
              label: entry.player.displayName,
            })) ?? []}
            selectedId={manualTeamB2}
            onSelect={setManualTeamB2}
            onClear={() => setManualTeamB2(null)}
          />
          <Picker
            label="Court"
            options={session?.courts.map((court) => ({
              id: court.id,
              label: court.courtName,
            })) ?? []}
            selectedId={manualCourtId}
            onSelect={setManualCourtId}
            onClear={() => setManualCourtId(null)}
          />
          <AppButton title="Add manual match" onPress={addManualMatch} />
        </View>
        {rounds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Matches</Text>
            {rounds.map((round) => (
              <View key={round.roundIndex} style={styles.roundCard}>
                <Text style={styles.roundTitle}>Round {round.roundIndex + 1}</Text>
                {round.assignments.map((assignment) => (
                  <View key={assignment.id} style={styles.matchRow}>
                    <Text style={styles.assignment}>
                      {playerNameById.get(assignment.teamA[0]) ?? assignment.teamA[0]}{" "}
                      & {playerNameById.get(assignment.teamA[1]) ?? assignment.teamA[1]}{" "}
                      vs {playerNameById.get(assignment.teamB[0]) ?? assignment.teamB[0]}{" "}
                      & {playerNameById.get(assignment.teamB[1]) ?? assignment.teamB[1]}
                    </Text>
                    <View style={styles.scoreRow}>
                      <TextInput
                        style={styles.scoreInput}
                        value={scores[assignment.id]?.a ?? ""}
                        onChangeText={(value) => {
                          const next = {
                            a: value,
                            b: scores[assignment.id]?.b ?? "",
                          };
                          setScores((prev) => ({
                            ...prev,
                            [assignment.id]: next,
                          }));
                          scheduleAutoSave(assignment, next);
                        }}
                        onBlur={() => scheduleAutoSave(assignment)}
                        keyboardType="number-pad"
                        placeholder="A"
                      />
                      <Text style={styles.scoreDash}>-</Text>
                      <TextInput
                        style={styles.scoreInput}
                        value={scores[assignment.id]?.b ?? ""}
                        onChangeText={(value) => {
                          const next = {
                            a: scores[assignment.id]?.a ?? "",
                            b: value,
                          };
                          setScores((prev) => ({
                            ...prev,
                            [assignment.id]: next,
                          }));
                          scheduleAutoSave(assignment, next);
                        }}
                        onBlur={() => scheduleAutoSave(assignment)}
                        keyboardType="number-pad"
                        placeholder="B"
                      />
                      <AppButton
                        variant="ghost"
                        title="Save"
                        onPress={() => saveScore(assignment)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
        <View style={styles.section}>
          <AppButton title="Finish Session" onPress={finishSession} />
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
    flexDirection: "row",
    gap: 12,
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
  picker: {
    gap: 6,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.ink,
    fontWeight: "600",
  },
  chipClose: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: "700",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.card,
    maxHeight: 160,
    overflow: "hidden",
    zIndex: 10,
    elevation: 3,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
  },
  dropdownList: {
    maxHeight: 160,
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
