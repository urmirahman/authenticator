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
      style={[
        styles.button,
        variant === 'primary' && { backgroundColor: c.accent },
        variant === 'secondary' && { borderWidth: 1, borderColor: c.border },
        variant === 'danger' && { borderWidth: 1, borderColor: '#dc2626' },
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={{
          color: variant === 'primary' ? 'white' : variant === 'danger' ? '#dc2626' : c.text,
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
  button: { padding: 14, borderRadius: 12, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  error: { color: '#dc2626' },
  screen: { padding: 16, gap: 12 },
  section: { borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
