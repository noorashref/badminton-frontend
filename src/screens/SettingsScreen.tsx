import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SettingsStackParamList } from "../navigation/types";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

export default function SettingsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, "Settings">) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Players</Text>
        <Text style={styles.cardBody}>Manage player list.</Text>
        <AppButton
          variant="secondary"
          title="Manage Players"
          onPress={() => navigation.navigate("PlayersManage")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  card: {
    padding: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
    gap: 8,
    ...theme.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  cardBody: {
    fontSize: 14,
    color: theme.colors.muted,
  },
});
