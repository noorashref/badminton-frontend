import React, { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AxiosError } from "axios";
import { useNavigation } from "@react-navigation/native";
import api from "../api/client";
import { useAuthStore } from "../store/useAuthStore";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("admin@badminton.app");
  const [password, setPassword] = useState("password");
  const setToken = useAuthStore((state) => state.setToken);
  const navigation = useNavigation();

  const onLogin = async () => {
    try {
      const response = await api.post("/auth/login", { email, password });
      setToken(response.data.accessToken);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      console.error("Login error", status, message);
      Alert.alert(
        "Login failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Welcome back</Text>
        <Text style={styles.title}>Badminton</Text>
        <Text style={styles.subtitle}>Sign in to keep your sessions in sync.</Text>
      </View>
      <View style={styles.form}>
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
        <AppButton title="Sign in" onPress={onLogin} />
        <View style={styles.actions}>
          <AppButton
            variant="secondary"
            title="Create account"
            onPress={() => navigation.navigate("Register" as never)}
          />
          <AppButton
            variant="ghost"
            title="Forgot password"
            onPress={() => navigation.navigate("ForgotPassword" as never)}
          />
        </View>
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
    fontSize: 32,
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
  actions: {
    gap: 10,
  },
});
