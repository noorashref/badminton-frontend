import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<SessionStackParamList, "SessionGroups">;

type Group = {
  id: string;
  name: string;
  inviteCode: string;
  visibility: "PUBLIC" | "PRIVATE";
  isOwner?: boolean;
};

export default function SessionGroupsScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupVisibility, setGroupVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [inviteCode, setInviteCode] = useState("");

  const load = async () => {
    const response = await api.get("/groups");
    setGroups(response.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Missing name");
      return;
    }
    await api.post("/groups", { name: groupName.trim(), visibility: groupVisibility });
    setGroupName("");
    await load();
  };

  const joinGroup = async (groupId: string) => {
    if (!inviteCode.trim()) {
      Alert.alert("Invite code required");
      return;
    }
    await api.post(`/groups/${groupId}/join`, { inviteCode: inviteCode.trim() });
    setInviteCode("");
    await load();
  };

  const deleteGroup = async (groupId: string) => {
    Alert.alert("Delete group?", "Only the owner can delete this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/groups/${groupId}`);
            await load();
          } catch (error) {
            Alert.alert("Delete failed", "You are not allowed to delete this group.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Session hub</Text>
          <Text style={styles.title}>My Groups</Text>
          <Text style={styles.subtitle}>Create a group or join one with a code.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create Group</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
          />
          <AppButton
            variant="secondary"
            title={`Visibility: ${groupVisibility}`}
            onPress={() =>
              setGroupVisibility((prev) => (prev === "PRIVATE" ? "PUBLIC" : "PRIVATE"))
            }
          />
          <AppButton title="Create Group" onPress={createGroup} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Join Group</Text>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Invite code"
          />
          <Text style={styles.helper}>Select a group below to join with this code.</Text>
        </View>
        {groups.length === 0 ? (
          <Text style={styles.helper}>No groups yet.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.card}>
              <Text style={styles.cardTitle}>{group.name}</Text>
              <Text style={styles.helper}>Invite: {group.inviteCode}</Text>
              <View style={styles.row}>
                <AppButton
                  variant="secondary"
                  title="Open"
                  onPress={() => navigation.navigate("GroupSessions", { groupId: group.id })}
                />
                <AppButton title="Join" onPress={() => joinGroup(group.id)} />
                {group.isOwner && (
                  <AppButton variant="ghost" title="Delete" onPress={() => deleteGroup(group.id)} />
                )}
              </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.soft,
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 13,
    color: theme.colors.muted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
});
