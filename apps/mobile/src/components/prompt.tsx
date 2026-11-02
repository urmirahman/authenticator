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
}: {
  visible: boolean;
  title: string;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  extra?: React.ReactNode;
}) {
  const c = useColors();
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial, visible]);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={[s.box, { backgroundColor: c.card }]}>
          <Text style={[s.title, { color: c.text }]}>{title}</Text>
          <Input value={value} onChangeText={setValue} autoFocus />
          <Button title={confirmLabel} onPress={() => onSubmit(value.trim())} />
          {extra}
          <Button variant="secondary" title="Cancel" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  box: { borderRadius: 16, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: '600' },
});
