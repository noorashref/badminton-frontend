import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SessionStackParamList } from "../navigation/types";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

const pad2 = (value: number) => value.toString().padStart(2, "0");
const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const formatTime = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const setDateOnTime = (time: Date, date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

const DURATION_PRESETS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

type Props = NativeStackScreenProps<SessionStackParamList, "SessionCreate">;

export default function SessionCreateScreen({ navigation, route }: Props) {
  const groupId = route.params?.groupId;
  const [name, setName] = useState("Weekly Session");
  const [sessionDate, setSessionDate] = useState(new Date());
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(
    new Date(Date.now() + 2.5 * 60 * 60 * 1000)
  );
  const [roundMinutes, setRoundMinutes] = useState("15");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(2.5);
  const roundLabel = useMemo(
    () => `Round length (minutes) — e.g. 10, 15, 20`,
    []
  );
  const applyDuration = (hours: number) => {
    setSelectedDuration(hours);
    setEndDateTime(addHours(startDateTime, hours));
  };

  const createSession = async () => {
    try {
      const startIso = startDateTime.toISOString();
      const endIso = endDateTime.toISOString();
      const response = await api.post("/sessions", {
        name,
        startTime: startIso,
        endTime: endIso,
        roundMinutes: Number(roundMinutes),
        ...(groupId ? { groupId } : {}),
      });
      navigation.navigate("SessionBoard", { sessionId: response.data.id });
    } catch {
      Alert.alert("Failed", "Could not create session.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
        <Text style={styles.kicker}>Session</Text>
        <Text style={styles.title}>Create Session</Text>
        <Text style={styles.subtitle}>Set a name, time, and round length.</Text>
        </View>
        <View style={styles.form}>
        <Text style={styles.label}>Session name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Weekly Session"
        />
        <Text style={styles.label}>Session date</Text>
        <Pressable
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.inputText}>{formatDate(sessionDate)}</Text>
        </Pressable>
        <Text style={styles.label}>Start time</Text>
        <Pressable
          style={styles.input}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.inputText}>{formatTime(startDateTime)}</Text>
        </Pressable>
        <Text style={styles.label}>End time</Text>
        <Pressable
          style={styles.input}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.inputText}>{formatTime(endDateTime)}</Text>
        </Pressable>
        <Text style={styles.label}>Duration presets</Text>
        <View style={styles.presetRow}>
          {DURATION_PRESETS.map((hours) => (
            <Pressable
              key={hours}
              style={[
                styles.presetChip,
                selectedDuration === hours ? styles.presetChipActive : null,
              ]}
              onPress={() => applyDuration(hours)}
            >
              <Text
                style={[
                  styles.presetText,
                  selectedDuration === hours ? styles.presetTextActive : null,
                ]}
              >
                {hours}h
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{roundLabel}</Text>
        <TextInput
          style={styles.input}
          value={roundMinutes}
          onChangeText={setRoundMinutes}
          placeholder="15"
          keyboardType="number-pad"
        />
        <Text style={styles.helper}>
          This is how long each game round lasts. The scheduler builds rounds using this value.
        </Text>
        <AppButton title="Create" onPress={createSession} />
        </View>
      </ScrollView>
      {showDatePicker && (
        <DateTimePicker
          value={sessionDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          onChange={(_, selected) => {
            const picked = selected ?? sessionDate;
            setShowDatePicker(Platform.OS === "ios");
            setSessionDate(picked);
            setStartDateTime((prev) => setDateOnTime(prev, picked));
            setEndDateTime((prev) => setDateOnTime(prev, picked));
          }}
        />
      )}
      {showStartPicker && (
        <DateTimePicker
          value={startDateTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={(_, selected) => {
            const picked = selected ?? startDateTime;
            setShowStartPicker(Platform.OS === "ios");
            setStartDateTime(setDateOnTime(picked, sessionDate));
            if (selectedDuration) {
              setEndDateTime(addHours(setDateOnTime(picked, sessionDate), selectedDuration));
            }
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDateTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={(_, selected) => {
            const picked = selected ?? endDateTime;
            setShowEndPicker(Platform.OS === "ios");
            setEndDateTime(setDateOnTime(picked, sessionDate));
            setSelectedDuration(null);
          }}
        />
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
  form: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3d3d3d",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
  },
  inputText: {
    fontSize: 16,
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: -6,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  presetChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.soft,
  },
  presetText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: "600",
  },
  presetTextActive: {
    color: theme.colors.ink,
  },
});
