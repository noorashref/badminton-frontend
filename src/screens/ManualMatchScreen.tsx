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

type Props = NativeStackScreenProps<SessionStackParamList, "ManualMatch">;

type SessionDetails = {
  id: string;
  name: string;
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

export default function ManualMatchScreen({ route }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [manualTeamA1, setManualTeamA1] = useState<string | null>(null);
  const [manualTeamA2, setManualTeamA2] = useState<string | null>(null);
  const [manualTeamB1, setManualTeamB1] = useState<string | null>(null);
  const [manualTeamB2, setManualTeamB2] = useState<string | null>(null);
  const [manualCourtId, setManualCourtId] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
    };
    load();
  }, [sessionId]);

  useEffect(() => {
    if (!manualCourtId && session?.courts?.length) {
      setManualCourtId(session.courts[0].id);
    }
  }, [manualCourtId, session?.courts]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2400);
  }, [toast]);

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
      await api.post(`/sessions/${sessionId}/manual-match`, {
        teamAPlayer1Id: manualTeamA1,
        teamAPlayer2Id: manualTeamA2,
        teamBPlayer1Id: manualTeamB1,
        teamBPlayer2Id: manualTeamB2,
        courtId: manualCourtId,
      });
      setToast({ message: "Manual match added.", variant: "success" });
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

  const playerOptions =
    session?.attendance.map((entry) => ({
      id: entry.playerId,
      label: entry.player.displayName,
    })) ?? [];
  const selected = useMemo(
    () =>
      new Set(
        [manualTeamA1, manualTeamA2, manualTeamB1, manualTeamB2].filter(
          (value): value is string => Boolean(value)
        )
      ),
    [manualTeamA1, manualTeamA2, manualTeamB1, manualTeamB2]
  );
  const buildOptions = (currentId: string | null) =>
    playerOptions.filter(
      (option) => !selected.has(option.id) || option.id === currentId
    );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Session</Text>
          <Text style={styles.title}>Manual Match</Text>
          <Text style={styles.subtitle}>Pick players and add a custom match.</Text>
        </View>
        <View style={styles.section}>
          <Picker
            label="Team A - Player 1"
            options={buildOptions(manualTeamA1)}
            selectedId={manualTeamA1}
            onSelect={setManualTeamA1}
            onClear={() => setManualTeamA1(null)}
          />
          <Picker
            label="Team A - Player 2"
            options={buildOptions(manualTeamA2)}
            selectedId={manualTeamA2}
            onSelect={setManualTeamA2}
            onClear={() => setManualTeamA2(null)}
          />
          <Picker
            label="Team B - Player 1"
            options={buildOptions(manualTeamB1)}
            selectedId={manualTeamB1}
            onSelect={setManualTeamB1}
            onClear={() => setManualTeamB1(null)}
          />
          <Picker
            label="Team B - Player 2"
            options={buildOptions(manualTeamB2)}
            selectedId={manualTeamB2}
            onSelect={setManualTeamB2}
            onClear={() => setManualTeamB2(null)}
          />
          <Picker
            label="Court"
            options={
              session?.courts.map((court) => ({
                id: court.id,
                label: court.courtName,
              })) ?? []
            }
            selectedId={manualCourtId}
            onSelect={setManualCourtId}
            onClear={() => setManualCourtId(null)}
          />
          <AppButton title="Add manual match" onPress={addManualMatch} />
          <Text style={styles.helper}>
            Manual matches lock the round and keep their results.
          </Text>
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
  label: {
    fontSize: 13,
    fontWeight: "600",
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
  helper: {
    fontSize: 12,
    color: theme.colors.muted,
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
