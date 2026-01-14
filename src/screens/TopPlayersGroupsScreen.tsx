import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<HomeStackParamList, "TopPlayersGroups">;

type Group = {
  id: string;
  name: string;
  createdAt: string;
};

export default function TopPlayersGroupsScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/groups");
      setGroups(response.data ?? []);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Groups</Text>
          <Text style={styles.title}>Top Players</Text>
          <Text style={styles.subtitle}>Pick a group to view its leaderboard.</Text>
        </View>
        <View style={styles.card}>
          {groups.length === 0 ? (
            <Text style={styles.helper}>No groups yet.</Text>
          ) : (
            groups.map((group) => (
              <Pressable
                key={group.id}
                style={styles.groupRow}
                onPress={() => navigation.navigate("PlayersLeaderboard", { groupId: group.id })}
              >
                <View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>Tap to view leaderboard</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </View>
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
    fontSize: 14,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 10,
    ...theme.shadow,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  groupMeta: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  chevron: {
    fontSize: 20,
    color: theme.colors.muted,
  },
  helper: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
