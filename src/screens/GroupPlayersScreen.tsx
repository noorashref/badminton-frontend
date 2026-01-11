import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SessionStackParamList } from "../navigation/types";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<SessionStackParamList, "GroupPlayers">;

type Player = {
  id: string;
  displayName: string;
  rating: number;
  isActive: boolean;
};

export default function GroupPlayersScreen({ route }: Props) {
  const { groupId } = route.params;
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState("5");
  const [showInactive, setShowInactive] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingRating, setEditingRating] = useState("5");

  const load = async () => {
    const response = await api.get(
      `/groups/${groupId}/players${showInactive ? "?includeInactive=1" : ""}`
    );
    setPlayers(response.data ?? []);
  };

  useEffect(() => {
    load();
  }, [groupId, showInactive]);

  useEffect(() => {
    const loadOwner = async () => {
      const response = await api.get("/groups");
      const group = (response.data ?? []).find((item: any) => item.id === groupId);
      setIsOwner(Boolean(group?.isOwner));
    };
    loadOwner();
  }, [groupId]);

  const addPlayer = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a player name.");
      return;
    }
    const value = Number(rating);
    if (!Number.isFinite(value) || value < 1 || value > 10) {
      Alert.alert("Invalid rating", "Use a rating between 1 and 10.");
      return;
    }
    await api.post(`/groups/${groupId}/players`, {
      displayName: name.trim(),
      rating: value,
    });
    setName("");
    setRating("5");
    await load();
  };

  const deletePlayer = async (playerId: string) => {
    try {
      await api.delete(`/groups/${groupId}/players/${playerId}`);
      await load();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Unable to delete player.";
      Alert.alert("Delete failed", message);
    }
  };

  const saveRating = async (playerId: string) => {
    const value = Number(editingRating);
    if (!Number.isFinite(value) || value < 1 || value > 10) {
      Alert.alert("Invalid rating", "Use a rating between 1 and 10.");
      return;
    }
    try {
      await api.patch(`/groups/${groupId}/players/${playerId}`, { rating: value });
      setEditingPlayerId(null);
      await load();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Unable to update rating.";
      Alert.alert("Update failed", message);
    }
  };

  const setActive = async (playerId: string, isActive: boolean) => {
    try {
      await api.patch(`/groups/${groupId}/players/${playerId}`, { isActive });
      await load();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Unable to update player.";
      Alert.alert("Update failed", message);
    }
  };

  const activePlayers = useMemo(
    () => players.filter((player) => player.isActive),
    [players]
  );
  const inactivePlayers = useMemo(
    () => players.filter((player) => !player.isActive),
    [players]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Group roster</Text>
          <Text style={styles.title}>Players</Text>
          <Text style={styles.subtitle}>Add or remove players for this group.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add Player</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
          <TextInput
            style={styles.input}
            value={rating}
            onChangeText={setRating}
            keyboardType="number-pad"
            placeholder="Rating (1-10)"
          />
          <AppButton title="Add" onPress={addPlayer} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>All Players</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.helper}>Show inactive</Text>
            <Switch value={showInactive} onValueChange={setShowInactive} />
          </View>
          {activePlayers.map((player) => (
            <View key={player.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowText}>
                  {player.displayName} (rating {player.rating})
                </Text>
                {editingPlayerId === player.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editingRating}
                      onChangeText={setEditingRating}
                      keyboardType="number-pad"
                    />
                    <AppButton
                      variant="secondary"
                      title="Save"
                      onPress={() => saveRating(player.id)}
                    />
                    <AppButton
                      variant="ghost"
                      title="Cancel"
                      onPress={() => setEditingPlayerId(null)}
                    />
                  </View>
                ) : null}
              </View>
              {isOwner && (
                <View style={styles.rowActions}>
                  <AppButton
                    variant="ghost"
                    title="Edit rating"
                    onPress={() => {
                      setEditingPlayerId(player.id);
                      setEditingRating(String(player.rating));
                    }}
                  />
                  <AppButton
                    variant="ghost"
                    title="Deactivate"
                    onPress={() => setActive(player.id, false)}
                  />
                  <AppButton
                    variant="ghost"
                    title="Delete"
                    onPress={() => deletePlayer(player.id)}
                  />
                </View>
              )}
            </View>
          ))}
          {showInactive &&
            inactivePlayers.map((player) => (
              <View key={player.id} style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTextMuted}>
                    {player.displayName} (rating {player.rating})
                  </Text>
                </View>
                {isOwner && (
                  <View style={styles.rowActions}>
                    <AppButton
                      variant="ghost"
                      title="Activate"
                      onPress={() => setActive(player.id, true)}
                    />
                  </View>
                )}
              </View>
            ))}
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
    fontSize: 15,
    color: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 12,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowInfo: {
    flex: 1,
    gap: 8,
  },
  rowActions: {
    gap: 8,
  },
  rowText: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  rowTextMuted: {
    fontSize: 14,
    color: theme.colors.muted,
    textDecorationLine: "line-through",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    width: 64,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: "center",
    backgroundColor: theme.colors.soft,
    color: theme.colors.ink,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
