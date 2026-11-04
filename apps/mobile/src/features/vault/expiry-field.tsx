import DateTimePicker from '@react-native-community/datetimepicker';
import { formatExpiry, toExpiryDate } from '@repo/vault';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Choice, Label, Muted } from '@/components/ui';

const DAY = 24 * 60 * 60 * 1000;

/** "Expires: Never / On a date" with a native date picker. Value is YYYY-MM-DD or undefined. */
export function ExpiryField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const c = useColors();
  const [picking, setPicking] = useState(false);
  const date = value ? new Date(`${value}T00:00:00`) : new Date(Date.now() + 90 * DAY);
  return (
    <View style={{ gap: 8 }}>
      <Label>Expires</Label>
      <Choice
        options={['never', 'date'] as const}
        value={value ? 'date' : 'never'}
        label={(v) => (v === 'never' ? 'Never' : 'On a date')}
        onChange={(v) => {
          if (v === 'never') return onChange(undefined);
          onChange(toExpiryDate(date));
          setPicking(true);
        }}
      />
      {value && (
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Expiry date ${formatExpiry(value)}. Tap to change.`}
          style={{ paddingVertical: 6 }}
        >
          <Text style={{ color: c.accent, fontWeight: '600' }}>{formatExpiry(value)} · Change</Text>
        </Pressable>
      )}
      {picking && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, d) => {
            if (Platform.OS !== 'ios') setPicking(false);
            if (event.type === 'set' && d) onChange(toExpiryDate(d));
          }}
        />
      )}
      <Muted>Bloom hides the code after this date and reminds you a week before.</Muted>
    </View>
  );
}
