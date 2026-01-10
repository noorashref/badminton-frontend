import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SessionStackParamList } from "../navigation/types";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<SessionStackParamList, "GroupSessions">;

type SessionItem = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  finishedAt: string | null;
};

type Group = {
  id: string;
  name: string;
};

export default function GroupSessionsScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [group, setGroup] = useState<Group | null>(null);

  const load = async () => {
    const response = await api.get(`/groups/${groupId}/sessions`);
    setSessions(response.data ?? []);
    const groupsRes = await api.get("/groups");
    const found = (groupsRes.data ?? []).find((g: Group) => g.id === groupId) ?? null;
    setGroup(found);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const deleteSession = (sessionId: string) => {
    Alert.alert("Delete session", "This will remove the session and all its matches.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await api.delete(`/sessions/${sessionId}`);
          await load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Group</Text>
          <Text style={styles.title}>{group?.name ?? "Group Sessions"}</Text>
          <Text style={styles.subtitle}>All sessions created for this group.</Text>
        </View>
        <View style={styles.card}>
          <AppButton
            title="Create Session"
            onPress={() => navigation.navigate("SessionCreate", { groupId })}
          />
          <AppButton
            variant="secondary"
            title="Manage Players"
            onPress={() => navigation.navigate("GroupPlayers", { groupId })}
          />
        </View>
        {sessions.length === 0 ? (
          <Text style={styles.helper}>No sessions yet.</Text>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.card}>
              <Text style={styles.cardTitle}>{session.name}</Text>
              <Text style={styles.helper}>
                {session.finishedAt ? "Finished" : "In progress"}
              </Text>
              {session.finishedAt ? (
                <AppButton
                  variant="secondary"
                  title="View Summary"
                  onPress={() => navigation.navigate("SessionSummary", { sessionId: session.id })}
                />
              ) : (
                <AppButton
                  variant="secondary"
                  title="Open"
                  onPress={() => navigation.navigate("SessionBoard", { sessionId: session.id })}
                />
              )}
              <AppButton
                variant="ghost"
                title="Delete"
                onPress={() => deleteSession(session.id)}
              />
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
  card: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 10,
    ...theme.shadow,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
