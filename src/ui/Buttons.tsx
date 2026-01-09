import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "./theme";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

export const AppButton = ({ title, onPress, variant = "primary", disabled }: ButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.base,
      variant === "primary" && styles.primary,
      variant === "secondary" && styles.secondary,
      variant === "ghost" && styles.ghost,
      pressed && styles.pressed,
      disabled && styles.disabled,
    ]}
  >
    <View>
      <Text
        style={[
          styles.text,
          variant === "secondary" && styles.textDark,
          variant === "ghost" && styles.textDark,
        ]}
      >
        {title}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  textDark: {
    color: theme.colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
