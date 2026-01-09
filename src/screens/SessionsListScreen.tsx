import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";

type Props = NativeStackScreenProps<HomeStackParamList, "SessionsList">;

type SessionItem = {
  id: string;
  name: string;
  finishedAt: string;
};

export default function SessionsListScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/sessions/finished");
      setSessions(response.data ?? []);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Previous Games</Text>
        {sessions.length === 0 ? (
          <Text style={styles.row}>No finished sessions yet.</Text>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.card}>
              <Text style={styles.cardTitle}>{session.name}</Text>
              <Text
                style={styles.link}
                onPress={() => navigation.navigate("SessionSummary", { sessionId: session.id })}
              >
                View details
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f4ef",
  },
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  row: {
    fontSize: 13,
    color: "#5b5b5b",
  },
  link: {
    fontSize: 14,
    color: "#1f6feb",
  },
});
