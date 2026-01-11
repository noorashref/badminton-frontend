import React, { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { theme } from "../ui/theme";
import type { HomeStackParamList } from "../navigation/types";

type LeaderboardRow = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  isActive: boolean;
};

type Props = NativeStackScreenProps<HomeStackParamList, "PlayersLeaderboard">;

export default function PlayersLeaderboardScreen({ route, navigation }: Props) {
  const [players, setPlayers] = useState<LeaderboardRow[]>([]);
  const { groupId } = route.params;

  useEffect(() => {
    const load = async () => {
      const response = await api.get(`/groups/${groupId}/leaderboard?includeInactive=1`);
      setPlayers(response.data ?? []);
    };
    load();
  }, [groupId]);

  const activePlayers = players.filter((player) => player.isActive);
  const inactivePlayers = players.filter((player) => !player.isActive);
  const podium = activePlayers.slice(0, 3);
  const rest = activePlayers.slice(3);
  const medalMeta = [
    { style: styles.medalGold, iconColor: "#b7791f" },
    { style: styles.medalSilver, iconColor: "#5f6b7a" },
    { style: styles.medalBronze, iconColor: "#8a4f2a" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Top Players</Text>
        {players.length === 0 ? (
          <Text style={styles.row}>No matches recorded yet.</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Podium</Text>
            {podium.length === 0 ? (
              <Text style={styles.row}>No active players on the podium.</Text>
            ) : (
              <View style={styles.podiumWrap}>
                {podium.map((player, index) => (
                  <Pressable
                    key={player.playerId}
                    style={styles.podiumCard}
                    onPress={() =>
                      navigation.navigate("PlayerStats", {
                        groupId,
                        playerId: player.playerId,
                      })
                    }
                  >
                    <View style={[styles.medal, medalMeta[index]?.style]}>
                      <Ionicons
                        name="trophy"
                        size={16}
                        color={medalMeta[index]?.iconColor ?? theme.colors.muted}
                      />
                      <Text style={styles.medalRank}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.podiumName}>{player.name}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                    <Text style={styles.podiumStats}>
                      {player.wins}W-{player.losses}L
                    </Text>
                    <Text style={styles.podiumPoints}>
                      {player.pointsFor}-{player.pointsAgainst}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {rest.length > 0 && <Text style={styles.sectionTitle}>All Players</Text>}
            {rest.map((player, index) => (
              <Pressable
                key={player.playerId}
                style={styles.listRow}
                onPress={() =>
                  navigation.navigate("PlayerStats", {
                    groupId,
                    playerId: player.playerId,
                  })
                }
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 4}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{player.name}</Text>
                  <View style={styles.statusBadgeSmall}>
                    <Text style={styles.statusTextSmall}>Active</Text>
                  </View>
                  <Text style={styles.listStats}>
                    {player.wins}W-{player.losses}L ({player.pointsFor}-{player.pointsAgainst})
                  </Text>
                </View>
              </Pressable>
            ))}
            {inactivePlayers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Inactive Players</Text>
                {inactivePlayers.map((player, index) => (
                  <Pressable
                    key={player.playerId}
                    style={[styles.listRow, styles.listRowMuted]}
                    onPress={() =>
                      navigation.navigate("PlayerStats", {
                        groupId,
                        playerId: player.playerId,
                      })
                    }
                  >
                    <View style={styles.rankBadgeMuted}>
                      <Text style={styles.rankTextMuted}>
                        #{rest.length + index + 4}
                      </Text>
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listNameMuted}>{player.name}</Text>
                      <View style={styles.statusBadgeMuted}>
                        <Text style={styles.statusTextMuted}>Inactive</Text>
                      </View>
                      <Text style={styles.listStatsMuted}>
                        {player.wins}W-{player.losses}L ({player.pointsFor}-{player.pointsAgainst})
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 6,
  },
  podiumWrap: {
    gap: 12,
    alignItems: "center",
  },
  podiumCard: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.radius.card,
    gap: 6,
    alignItems: "center",
    width: "100%",
    ...theme.shadow,
  },
  podiumName: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink,
    textAlign: "center",
  },
  statusBadge: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: "#e6f6ea",
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2e7d32",
  },
  podiumStats: {
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: "center",
  },
  podiumPoints: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: "center",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
    ...theme.shadow,
  },
  rankBadge: {
    minWidth: 44,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  listNameMuted: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  statusBadgeSmall: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "#e6f6ea",
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2e7d32",
  },
  statusBadgeMuted: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusTextMuted: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.muted,
  },
  listStats: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  listStatsMuted: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  listRowMuted: {
    opacity: 0.75,
  },
  rankBadgeMuted: {
    minWidth: 44,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  rankTextMuted: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.muted,
  },
  medal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  medalRank: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  medalGold: {
    backgroundColor: "#f6d48f",
    borderColor: "#cfa24d",
  },
  medalSilver: {
    backgroundColor: "#d8dde3",
    borderColor: "#9aa4af",
  },
  medalBronze: {
    backgroundColor: "#e6b08b",
    borderColor: "#b7724c",
  },
  row: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
