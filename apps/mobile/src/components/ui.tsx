import { ink, radius, semantic, space } from '@repo/brand';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useColors } from './theme';

/** Tiny shared building blocks so screens stay readable. All of them follow the light/dark theme. */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.button,
        variant === 'primary' && { backgroundColor: c.accent },
        variant === 'secondary' && { borderWidth: 1, borderColor: c.border },
        variant === 'danger' && { borderWidth: 1, borderColor: c.danger },
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={{
          color: variant === 'primary' ? c.accentText : variant === 'danger' ? c.danger : c.text,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[
        styles.input,
        { backgroundColor: c.card, borderColor: c.border, color: c.text },
        props.style,
      ]}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** Scrollable page with padding and the theme background. */
export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.screen}>
      {children}
    </ScrollView>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, { backgroundColor: c.card }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

/** Row of selectable pills (used for settings choices and folder filters). */
export function Choice<T extends string | number>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: T;
  label: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <Pressable
          key={String(o)}
          onPress={() => onChange(o)}
          accessibilityRole="radio"
          accessibilityState={{ selected: o === value }}
          accessibilityLabel={label(o)}
          style={[
            styles.pill,
            { borderColor: c.border },
            o === value && { backgroundColor: c.accent, borderColor: c.accent },
          ]}
        >
          <Text style={{ color: o === value ? 'white' : c.text }}>{label(o)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted }}>{children}</Text>;
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    padding: space.md + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 16,
  },
  label: { fontSize: 12, color: ink[500], marginBottom: 4 },
  error: { color: semantic.danger },
  screen: { padding: space.lg, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  section: { borderRadius: radius.lg, padding: space.lg, gap: space.sm + 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
