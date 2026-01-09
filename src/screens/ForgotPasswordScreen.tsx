import React, { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AxiosError } from "axios";
import api from "../api/client";
import { useAuthStore } from "../store/useAuthStore";
import { AppButton } from "../ui/Buttons";
import { theme } from "../ui/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const setToken = useAuthStore((state) => state.setToken);

  const requestReset = async () => {
    try {
      const response = await api.post("/auth/password-reset/request", { email });
      const token = response.data.resetToken as string | null;
      if (token) {
        setResetToken(token);
        Alert.alert("Reset code generated", `Use this code to reset: ${token}`);
      } else {
        Alert.alert("Reset requested", "If the email exists, a reset code is ready.");
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      Alert.alert(
        "Reset failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  const confirmReset = async () => {
    try {
      const response = await api.post("/auth/password-reset/confirm", {
        email,
        token: resetToken,
        newPassword,
      });
      setToken(response.data.accessToken);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      const status = err.response?.status;
      const message = err.response?.data?.message ?? err.message;
      Alert.alert(
        "Reset failed",
        status ? `Status ${status}: ${message}` : `Network error: ${message}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Account recovery</Text>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Request a reset code, then set a new password.
        </Text>
      </View>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
        />
        <AppButton title="Send reset code" onPress={requestReset} />
        <TextInput
          style={styles.input}
          value={resetToken}
          onChangeText={setResetToken}
          placeholder="Reset code"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
        />
        <AppButton title="Set new password" onPress={confirmReset} />
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
