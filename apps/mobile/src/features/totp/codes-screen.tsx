import { secondsRemaining, totp } from '@repo/crypto';
import type { TotpAccount } from '@repo/types';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { DEMO_ACCOUNTS } from '../vault/demo-accounts';
import { CountdownRing } from './countdown-ring';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function CodeRow({ account, now }: { account: TotpAccount; now: number }) {
  const code = totp(account.secret, {
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
    timestamp: now,
  });
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.issuer}>{account.issuer}</Text>
        <Text style={styles.code}>{code.replace(/(\d{3})(?=\d)/g, '$1 ')}</Text>
      </View>
      <CountdownRing remaining={secondsRemaining(account.period, now)} period={account.period} />
    </View>
  );
}

export function CodesScreen() {
  const now = useNow();
  return (
    <View style={styles.container}>
      <FlatList
        data={DEMO_ACCOUNTS}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <CodeRow account={item} now={now} />}
      />
      <View style={styles.links}>
        <Link href="/add-account">Add account</Link>
        <Link href="/settings">Settings</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  issuer: { color: '#64748b' },
  code: { fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: 2 },
  links: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
});
