import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
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

type Props = NativeStackScreenProps<SessionStackParamList, "SessionMatches">;

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
  courts: { id: string; courtName: string; startTime: string; endTime: string }[];
  attendance: { playerId: string; player: { displayName: string; rating: number } }[];
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

export default function SessionMatchesScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [rounds, setRounds] = useState<RoundPlan[]>([]);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>({});
  const [savedAssignments, setSavedAssignments] = useState<Record<string, boolean>>({});
  const [editingScores, setEditingScores] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [swapOutId, setSwapOutId] = useState<string | null>(null);
  const [swapInId, setSwapInId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSaved = useRef<Record<string, { a: string; b: string }>>({});
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    session?.attendance.forEach((entry) => {
      map.set(entry.playerId, entry.player.displayName);
    });
    return map;
  }, [session]);
  const courtNameById = useMemo(() => {
    const map = new Map<string, string>();
    session?.courts.forEach((court) => {
      map.set(court.id, court.courtName);
    });
    return map;
  }, [session]);

  const applySchedule = (scheduleData: { rounds?: RoundPlan[] }) => {
    const nextRounds = scheduleData.rounds ?? [];
    const nextScores: Record<string, { a: string; b: string }> = {};
    const nextSaved: Record<string, boolean> = {};
    const nextEditing: Record<string, boolean> = {};
    nextRounds.forEach((round) => {
      round.assignments.forEach((assignment) => {
        if (assignment.score) {
          nextScores[assignment.id] = {
            a: String(assignment.score.teamAScore),
            b: String(assignment.score.teamBScore),
          };
          nextSaved[assignment.id] = true;
          nextEditing[assignment.id] = false;
        } else {
          nextEditing[assignment.id] = true;
        }
      });
    });
    setRounds(nextRounds);
    setScores(nextScores);
    setSavedAssignments(nextSaved);
    setEditingScores(nextEditing);
  };

  useEffect(() => {
    const load = async () => {
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

  const saveScore = async (assignment: RoundAssignment, silent = false) => {
    try {
      const score = scores[assignment.id] ?? { a: "", b: "" };
      if (!score.a.trim() || !score.b.trim()) {
        if (!silent) {
          Alert.alert("Incomplete score", "Enter both team scores before saving.");
        }
        return;
      }
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
      setSavedAssignments((prev) => ({ ...prev, [assignment.id]: true }));
      setEditingScores((prev) => ({ ...prev, [assignment.id]: false }));
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
    if (!score.a.trim() || !score.b.trim()) return;
    if (!Number.isFinite(Number(score.a)) || !Number.isFinite(Number(score.b))) return;
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
              navigation.navigate("SessionGroups" as never);
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

  const shareRounds = async () => {
    if (!session || rounds.length === 0) {
      Alert.alert("No matches", "Generate matches before sharing.");
      return;
    }
    const lines: string[] = [];
    lines.push(`Session: ${session.name}`);
    lines.push("");
    rounds.forEach((round) => {
      lines.push(`Round ${round.roundIndex + 1}`);
      round.assignments.forEach((assignment, index) => {
        const courtName = courtNameById.get(assignment.courtId) ?? "Court";
        const teamA = assignment.teamA.map((id) => playerNameById.get(id) ?? id).join(" & ");
        const teamB = assignment.teamB.map((id) => playerNameById.get(id) ?? id).join(" & ");
        lines.push(`  ${index + 1}. ${courtName}: ${teamA} vs ${teamB}`);
      });
      lines.push("");
    });
    try {
      await Share.share({
        title: `${session.name} - Match Schedule`,
        message: lines.join("\n").trim(),
      });
    } catch (error) {
      Alert.alert("Share failed", "Unable to share the schedule.");
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    try {
      const response = await api.delete(`/sessions/${sessionId}/assignments/${assignmentId}`);
      applySchedule(response.data);
      setToast({ message: "Match deleted.", variant: "success" });
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const message = err.response?.data?.message ?? err.message;
      setToast({ message: `Delete failed: ${message}`, variant: "error" });
    }
  };

  const deleteRound = async (roundIndex: number) => {
    try {
      const response = await api.delete(`/sessions/${sessionId}/rounds/${roundIndex}`);
      applySchedule(response.data);
      setToast({ message: "Round deleted.", variant: "success" });
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const message = err.response?.data?.message ?? err.message;
      setToast({ message: `Delete failed: ${message}`, variant: "error" });
    }
  };

  const saveSwap = async (roundIndex: number, assignmentId: string) => {
    if (!swapOutId || !swapInId) {
      Alert.alert("Pick players", "Select both players to swap.");
      return;
    }
    if (swapOutId === swapInId) {
      Alert.alert("Pick different players", "Players must be different.");
      return;
    }
    try {
      const response = await api.post(`/sessions/${sessionId}/manual-swap`, {
        roundIndex,
        assignmentId,
        playerOut: swapOutId,
        playerIn: swapInId,
      });
      applySchedule(response.data);
      setEditingAssignmentId(null);
      setSwapOutId(null);
      setSwapInId(null);
      setToast({ message: "Match updated.", variant: "success" });
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const message = err.response?.data?.message ?? err.message;
      setToast({ message: `Update failed: ${message}`, variant: "error" });
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
          <Text style={styles.title}>Matches</Text>
          <Text style={styles.subtitle}>
            Review matchups and save scores in real time.
          </Text>
          <View style={styles.headerActions}>
            <AppButton variant="secondary" title="Share Rounds" onPress={shareRounds} />
          </View>
        </View>
        {rounds.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.helper}>No matches yet. Generate a schedule first.</Text>
          </View>
        ) : (
          rounds.map((round) => (
            <View key={round.roundIndex} style={styles.card}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>Round {round.roundIndex + 1}</Text>
                <AppButton
                  variant="ghost"
                  title="Delete round"
                  onPress={() =>
                    Alert.alert(
                      "Delete round",
                      "This removes all matches in this round. Continue?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteRound(round.roundIndex),
                        },
                      ]
                    )
                  }
                />
              </View>
              {round.assignments.map((assignment) => (
                (() => {
                  const hasInput =
                    Boolean(scores[assignment.id]?.a?.trim()) ||
                    Boolean(scores[assignment.id]?.b?.trim());
                  const isSaved = Boolean(savedAssignments[assignment.id]);
                  const isScoreLocked = isSaved && !editingScores[assignment.id];
                  return (
                <View
                  key={assignment.id}
                  style={[
                    styles.matchRow,
                    isSaved ? styles.matchRowScored : null,
                  ]}
                >
                  <View style={styles.matchHeader}>
                    <Text style={styles.assignment}>
                      {playerNameById.get(assignment.teamA[0]) ?? assignment.teamA[0]}{" "}
                      & {playerNameById.get(assignment.teamA[1]) ?? assignment.teamA[1]} vs{" "}
                      {playerNameById.get(assignment.teamB[0]) ?? assignment.teamB[0]}{" "}
                      & {playerNameById.get(assignment.teamB[1]) ?? assignment.teamB[1]}
                    </Text>
                    <View style={styles.statusBadgeWrap}>
                      <View
                        style={[
                          styles.statusBadge,
                          isSaved
                            ? styles.statusBadgeSaved
                            : hasInput
                            ? styles.statusBadgePending
                            : null,
                        ]}
                      >
                        <Text style={styles.statusBadgeText} numberOfLines={1}>
                          {isSaved ? "Saved" : hasInput ? "Not saved" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.scoreRow}>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores[assignment.id]?.a ?? ""}
                      onChangeText={(value) => {
                        if (isScoreLocked) return;
                        const next = {
                          a: value,
                          b: scores[assignment.id]?.b ?? "",
                        };
                        setScores((prev) => ({
                          ...prev,
                          [assignment.id]: next,
                        }));
                        setSavedAssignments((prev) => ({
                          ...prev,
                          [assignment.id]: false,
                        }));
                        scheduleAutoSave(assignment, next);
                      }}
                      onBlur={() => scheduleAutoSave(assignment)}
                      editable={!isScoreLocked}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      returnKeyType="done"
                      selectTextOnFocus
                      placeholder="A"
                    />
                    <Text style={styles.scoreDash}>-</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={scores[assignment.id]?.b ?? ""}
                      onChangeText={(value) => {
                        if (isScoreLocked) return;
                        const next = {
                          a: scores[assignment.id]?.a ?? "",
                          b: value,
                        };
                        setScores((prev) => ({
                          ...prev,
                          [assignment.id]: next,
                        }));
                        setSavedAssignments((prev) => ({
                          ...prev,
                          [assignment.id]: false,
                        }));
                        scheduleAutoSave(assignment, next);
                      }}
                      onBlur={() => scheduleAutoSave(assignment)}
                      editable={!isScoreLocked}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      returnKeyType="done"
                      selectTextOnFocus
                      placeholder="B"
                    />
                    {isScoreLocked ? (
                      <AppButton
                        variant="ghost"
                        title="Edit score"
                        onPress={() =>
                          setEditingScores((prev) => ({
                            ...prev,
                            [assignment.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <AppButton
                        variant="ghost"
                        title="Save"
                        onPress={() => saveScore(assignment)}
                      />
                    )}
                  </View>
                  <View style={styles.matchActions}>
                    <AppButton
                      variant="ghost"
                      title="Edit player"
                      onPress={() => {
                        setEditingAssignmentId(assignment.id);
                        setSwapOutId(null);
                        setSwapInId(null);
                      }}
                    />
                    <AppButton
                      variant="ghost"
                      title="Delete round"
                      onPress={() =>
                        Alert.alert(
                          "Delete match",
                          "Remove this match from the round?",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => deleteAssignment(assignment.id),
                            },
                          ]
                        )
                      }
                    />
                  </View>
                  {editingAssignmentId === assignment.id && (
                    <View style={styles.editPanel}>
                      <Text style={styles.helper}>
                        Swap a player and lock this round.
                      </Text>
                      <Picker
                        label="Player out"
                        options={
                          session?.attendance.map((entry) => ({
                            id: entry.playerId,
                            label: entry.player.displayName,
                          })) ?? []
                        }
                        selectedId={swapOutId}
                        onSelect={setSwapOutId}
                        onClear={() => setSwapOutId(null)}
                      />
                      <Picker
                        label="Player in"
                        options={
                          session?.attendance.map((entry) => ({
                            id: entry.playerId,
                            label: entry.player.displayName,
                          })) ?? []
                        }
                        selectedId={swapInId}
                        onSelect={setSwapInId}
                        onClear={() => setSwapInId(null)}
                      />
                      <View style={styles.editActions}>
                        <AppButton
                          variant="secondary"
                          title="Cancel"
                          onPress={() => {
                            setEditingAssignmentId(null);
                            setSwapOutId(null);
                            setSwapInId(null);
                          }}
                        />
                        <AppButton
                          title="Save swap"
                          onPress={() => saveSwap(round.roundIndex, assignment.id)}
                        />
                      </View>
                    </View>
                  )}
                </View>
                  );
                })()
              ))}
            </View>
          ))
        )}
        <View style={styles.card}>
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
  headerActions: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 10,
    ...theme.shadow,
  },
  roundTitle: {
    fontWeight: "700",
    color: theme.colors.ink,
  },
  roundHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  matchRow: {
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.soft,
  },
  matchRowScored: {
    backgroundColor: "#d9f2e0",
    borderWidth: 1,
    borderColor: "#b7e1c4",
  },
  assignment: {
    color: theme.colors.muted,
    flex: 1,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusBadgeWrap: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  statusBadge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  statusBadgeSaved: {
    borderColor: "#4caf50",
    backgroundColor: "#e6f6ea",
  },
  statusBadgePending: {
    borderColor: "#f0b429",
    backgroundColor: "#fff4d6",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  matchActions: {
    flexDirection: "row",
    gap: 10,
  },
  editPanel: {
    backgroundColor: theme.colors.soft,
    padding: 12,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 6,
  },
  scoreInput: {
    width: 72,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingVertical: 8,
    textAlign: "center",
    backgroundColor: theme.colors.soft,
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  scoreDash: {
    fontWeight: "700",
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 10,
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
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
    backgroundColor: theme.colors.card,
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
