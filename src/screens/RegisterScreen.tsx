import React, { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AxiosError } from "axios";
import api from "../api/client";
import { useAuthStore } from "../store/useAuthStore";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setToken = useAuthStore((state) => state.setToken);

  const onRegister = async () => {
    try {
      const response = await api.post("/auth/register", {
        email,
        password,
        displayName: username,
      });
      setToken(response.data.accessToken);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      Alert.alert(
        "Register failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>New player</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Use a username, email, and password.</Text>
      </View>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        <AppButton title="Create account" onPress={onRegister} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  header: {
    marginBottom: 24,
    gap: 6,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    backgroundColor: theme.colors.card,
    color: theme.colors.ink,
  },
});
