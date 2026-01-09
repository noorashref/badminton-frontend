import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import api from "../api/client";

type LeaderboardRow = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export default function PlayersLeaderboardScreen() {
  const [players, setPlayers] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/players/leaderboard");
      setPlayers(response.data ?? []);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Top Players</Text>
        {players.length === 0 ? (
          <Text style={styles.row}>No matches recorded yet.</Text>
        ) : (
          players.map((player, index) => (
            <View key={player.playerId} style={styles.card}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Text style={styles.name}>{player.name}</Text>
              <Text style={styles.stats}>
                {player.wins}W-{player.losses}L ({player.pointsFor}-{player.pointsAgainst})
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
    gap: 6,
  },
  rank: {
    fontSize: 12,
    color: "#6b6b6b",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  stats: {
    fontSize: 13,
    color: "#5b5b5b",
  },
  row: {
    fontSize: 13,
    color: "#5b5b5b",
  },
});
