import { brand } from '@repo/brand';
import { faqs, legalLinks } from '@repo/content';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { appIcon } from '@/components/brand-images';
import { useColors } from '@/components/theme';
import { Muted, Screen, Section } from '@/components/ui';
import { openWebPage } from '@/lib/web-url';

/** Help (FAQ rendered natively from @repo/content) + About + links to the legal pages on the web. */
export function HelpScreen() {
  const c = useColors();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen>
      <View style={s.about}>
        <Image
          source={appIcon}
          style={s.icon}
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${brand.name} logo`}
        />
        <Text style={[s.name, { color: c.text }]} accessibilityRole="header">
          {brand.name}
        </Text>
        <Muted>{brand.tagline}</Muted>
        <Muted>Version {Constants.expoConfig?.version ?? '—'}</Muted>
      </View>

      <Section title="Frequently asked">
        {faqs.map((f, i) => (
          <Pressable
            key={f.q}
            onPress={() => setOpen(open === i ? null : i)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open === i }}
            accessibilityLabel={f.q}
            style={[s.row, { borderColor: c.border }]}
          >
            <Text style={{ color: c.text, fontWeight: '600' }}>{f.q}</Text>
            {open === i && <Text style={{ color: c.muted, marginTop: 6 }}>{f.a}</Text>}
          </Pressable>
        ))}
      </Section>

      <Section title="Legal & security">
        {legalLinks
          .filter((l) => l.href !== '/help')
          .map((l) => (
            <Pressable
              key={l.href}
              onPress={() => openWebPage(l.href)}
              accessibilityRole="link"
              accessibilityLabel={`${l.label} (opens web page)`}
              style={[s.link, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text }}>{l.label}</Text>
              <Text style={{ color: c.muted }}>↗</Text>
            </Pressable>
          ))}
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  about: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  icon: { width: 72, height: 72, borderRadius: 16 },
  name: { fontSize: 20, fontWeight: '700' },
  row: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  link: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
