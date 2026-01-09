import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
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

type Props = NativeStackScreenProps<SessionStackParamList, "SessionCreate">;

export default function SessionCreateScreen({ navigation, route }: Props) {
  const groupId = route.params?.groupId;
  const [name, setName] = useState("Weekly Session");
  const [sessionDate, setSessionDate] = useState(new Date());
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );
  const [roundMinutes, setRoundMinutes] = useState("15");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const roundLabel = useMemo(
    () => `Round length (minutes) — e.g. 10, 15, 20`,
    []
  );

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
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.colors.background,
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
});
