import { StyleSheet, Text, View } from 'react-native';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text>Devices, passkeys, master password and export will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '600' },
});
