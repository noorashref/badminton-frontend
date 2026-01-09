import React, { useState } from "react";
import { Alert, Button, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import api from "../api/client";

type Props = NativeStackScreenProps<HomeStackParamList, "MatchDetail">;

export default function MatchDetailScreen({ route }: Props) {
  const { matchId } = route.params;
  const [teamAScore, setTeamAScore] = useState("21");
  const [teamBScore, setTeamBScore] = useState("18");

  const submitResult = async () => {
    try {
      await api.post(`/matches/${matchId}/result`, {
        sets: [
          {
            teamAScore: Number(teamAScore),
            teamBScore: Number(teamBScore),
          },
        ],
      });
      Alert.alert("Result saved");
    } catch {
      Alert.alert("Failed", "Could not save result.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Match Result</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={teamAScore}
          onChangeText={setTeamAScore}
          keyboardType="number-pad"
        />
        <Text style={styles.vs}>-</Text>
        <TextInput
          style={styles.input}
          value={teamBScore}
          onChangeText={setTeamBScore}
          keyboardType="number-pad"
        />
      </View>
      <Button title="Submit" onPress={submitResult} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f6f4ef",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ded9d1",
    padding: 12,
    textAlign: "center",
    fontSize: 18,
  },
  vs: {
    fontSize: 20,
    fontWeight: "600",
  },
});
