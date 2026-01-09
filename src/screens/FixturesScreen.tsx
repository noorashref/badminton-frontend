import React, { useEffect, useState } from "react";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";

type Props = NativeStackScreenProps<HomeStackParamList, "Fixtures">;

type Fixture = {
  id: string;
  teamA?: { name: string };
  teamB?: { name: string };
  status: string;
};

export default function FixturesScreen({ route, navigation }: Props) {
  const { seasonId } = route.params;
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(`/seasons/${seasonId}/fixtures`);
        setFixtures(response.data.matches ?? []);
      } catch {
        setFixtures([]);
      }
    };

    load();
  }, [seasonId]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Fixtures</Text>
      {fixtures.length === 0 ? (
        <Text style={styles.empty}>No fixtures yet.</Text>
      ) : (
        fixtures.map((fixture) => (
          <View key={fixture.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {fixture.teamA?.name ?? "TBD"} vs {fixture.teamB?.name ?? "TBD"}
            </Text>
            <Text style={styles.cardMeta}>{fixture.status}</Text>
            <Button
              title="View"
              onPress={() => navigation.navigate("MatchDetail", { matchId: fixture.id })}
            />
          </View>
        ))
      )}
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
  empty: {
    color: "#5b5b5b",
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
  cardMeta: {
    color: "#5b5b5b",
  },
});
