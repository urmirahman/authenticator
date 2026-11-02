import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

/** Tiny shared building blocks so screens stay readable. */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={variant === 'primary' ? styles.primaryText : undefined}>{title}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#94a3b8"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export const styles = StyleSheet.create({
  button: { padding: 14, borderRadius: 12, alignItems: 'center' },
  primary: { backgroundColor: '#4f46e5' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1' },
  disabled: { opacity: 0.5 },
  primaryText: { color: 'white', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  error: { color: '#dc2626' },
});
