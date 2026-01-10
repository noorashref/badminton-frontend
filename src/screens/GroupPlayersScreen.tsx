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
import type { SessionStackParamList } from "../navigation/types";
import api from "../api/client";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

type Props = NativeStackScreenProps<SessionStackParamList, "GroupPlayers">;

type Player = {
  id: string;
  displayName: string;
  rating: number;
};

export default function GroupPlayersScreen({ route }: Props) {
  const { groupId } = route.params;
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState("5");

  const load = async () => {
    const response = await api.get(`/groups/${groupId}/players`);
    setPlayers(response.data ?? []);
  };

  useEffect(() => {
    load();
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
          {players.map((player) => (
            <View key={player.id} style={styles.row}>
              <Text style={styles.rowText}>
                {player.displayName} (rating {player.rating})
              </Text>
              <AppButton
                variant="ghost"
                title="Delete"
                onPress={() => deletePlayer(player.id)}
              />
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
  rowText: {
    fontSize: 14,
    color: theme.colors.muted,
  },
});
