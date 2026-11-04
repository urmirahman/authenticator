import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from './ui';
import { useColors } from './theme';

/** Cross-platform text prompt (Alert.prompt only exists on iOS). */
export function Prompt({
  visible,
  title,
  initial = '',
  confirmLabel = 'Save',
  onSubmit,
  onCancel,
  extra,
  placeholder,
  maxLength = 40,
  validate,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  extra?: React.ReactNode;
  placeholder?: string;
  maxLength?: number;
  /** Return a friendly message to block submit (e.g. a duplicate name). */
  validate?: (value: string) => string | null;
}) {
  const c = useColors();
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial, visible]);
  const trimmed = value.trim();
  const problem = trimmed ? (validate?.(trimmed) ?? null) : null;
  const canSubmit = trimmed.length > 0 && !problem;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={[s.box, { backgroundColor: c.card }]}>
          <Text style={[s.title, { color: c.text }]}>{title}</Text>
          <Input
            value={value}
            onChangeText={setValue}
            autoFocus
            placeholder={placeholder}
            maxLength={maxLength}
            accessibilityLabel={title}
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && onSubmit(trimmed)}
          />
          {problem && <Text style={{ color: c.danger, fontSize: 13 }}>{problem}</Text>}
          <Button title={confirmLabel} disabled={!canSubmit} onPress={() => onSubmit(trimmed)} />
          {extra}
          <Button variant="ghost" title="Cancel" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  box: { borderRadius: 24, padding: 22, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
});
