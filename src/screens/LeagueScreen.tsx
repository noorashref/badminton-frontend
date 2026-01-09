import React, { useEffect, useState } from "react";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";

type Props = NativeStackScreenProps<HomeStackParamList, "League">;

type StandingsRow = {
  teamId: string;
  name: string;
  wins: number;
  losses: number;
};

export default function LeagueScreen({ navigation }: Props) {
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const leagueId = "replace-with-league-id";

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(`/leagues/${leagueId}/standings`);
        setStandings(response.data.standings ?? []);
        setSeasonId(response.data.seasonId ?? null);
      } catch {
        setStandings([]);
      }
    };

    load();
  }, [leagueId]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>League</Text>
      <Text style={styles.subtitle}>Standings</Text>
      <View style={styles.card}>
        {standings.length === 0 ? (
          <Text style={styles.empty}>No standings yet.</Text>
        ) : (
          standings.map((row) => (
            <View key={row.teamId} style={styles.row}>
              <Text style={styles.rowName}>{row.name}</Text>
              <Text style={styles.rowScore}>
                {row.wins}W - {row.losses}L
              </Text>
            </View>
          ))
        )}
      </View>
      <Button
        title="View Fixtures"
        onPress={() => {
          if (seasonId) {
            navigation.navigate("Fixtures", { seasonId });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f6f4ef",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#5b5b5b",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowName: {
    fontWeight: "600",
  },
  rowScore: {
    color: "#5b5b5b",
  },
  empty: {
    color: "#5b5b5b",
  },
});
