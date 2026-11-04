import { Ionicons } from '@expo/vector-icons';
import { radius, rose, semantic, space, violet } from '@repo/brand';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useHaptics, useReduceMotion } from '@/lib/motion';
import { useLogoMark } from './brand-images';
import { useColors } from './theme';

/**
 * Bloom's cozy building blocks: soft rounded cards, generous spacing, gentle rose accents.
 * Every piece follows light/dark via useColors(), supports Dynamic Type (no fixed line heights)
 * and carries accessibility roles/labels.
 */

export type IconName = ComponentProps<typeof Ionicons>['name'];
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: IconName;
}) {
  const c = useColors();
  const haptic = useHaptics();
  const fg =
    variant === 'primary'
      ? c.accentText
      : variant === 'danger'
        ? c.danger
        : variant === 'ghost'
          ? c.accent
          : c.text;
  return (
    <Pressable
      onPress={() => {
        haptic('tap');
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: c.accent },
        variant === 'secondary' && { backgroundColor: c.surfaceMuted },
        variant === 'danger' && { backgroundColor: c.accentSoft },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        disabled && styles.disabled,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
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
        { backgroundColor: c.surfaceMuted, borderColor: c.border, color: c.text },
        props.style,
      ]}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.muted }]}>{children}</Text>;
}

/** Big friendly page title with an optional subtitle (used at the top of tab screens). */
export function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={styles.titleWrap}>
      <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle && <Text style={{ color: c.muted, fontSize: 15 }}>{subtitle}</Text>}
    </View>
  );
}

/** Scrollable page: warm background, centered column (max 640 on tablets), optional big title. */
export function Screen({
  children,
  title,
  subtitle,
  refreshControl,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      // Tab screens (with a big title) have no navigation header, so pad for the notch.
      contentContainerStyle={[styles.screen, title ? { paddingTop: insets.top + 12 } : null]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {title && <Title title={title} subtitle={subtitle} />}
      {children}
    </ScrollView>
  );
}

/** Soft rounded surface. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

/** Titled card with free content (forms, explanations). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <Text style={[styles.groupTitle, { color: c.muted }]} accessibilityRole="header">
        {title}
      </Text>
      <Card style={{ gap: space.md }}>{children}</Card>
    </View>
  );
}

/** Settings-style group of rows: small caps title, rows separated by hairlines, optional footer. */
export function Group({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      {title && (
        <Text style={[styles.groupTitle, { color: c.muted }]} accessibilityRole="header">
          {title}
        </Text>
      )}
      <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
        {children}
      </View>
      {footer && <Text style={[styles.footer, { color: c.muted }]}>{footer}</Text>}
    </View>
  );
}

/** Icon in a soft tinted circle. */
export function IconBubble({
  name,
  tone = 'accent',
}: {
  name: IconName;
  tone?: 'accent' | 'danger' | 'muted';
}) {
  const c = useColors();
  const color = tone === 'danger' ? c.danger : tone === 'muted' ? c.muted : c.accent;
  return (
    <View
      style={[styles.bubble, { backgroundColor: tone === 'muted' ? c.surfaceMuted : c.accentSoft }]}
    >
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

/** One row in a Group: icon, label, optional value/right element, chevron when it navigates. */
export function Row({
  icon: iconName,
  label,
  value,
  hint,
  onPress,
  right,
  destructive,
  external,
  last,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  hint?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  external?: boolean;
  last?: boolean;
}) {
  const c = useColors();
  const haptic = useHaptics();
  const content = (
    <>
      {iconName && <IconBubble name={iconName} tone={destructive ? 'danger' : 'accent'} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: destructive ? c.danger : c.text, fontSize: 16 }}>{label}</Text>
        {hint && <Text style={{ color: c.muted, fontSize: 13 }}>{hint}</Text>}
      </View>
      {value !== undefined && (
        <Text style={{ color: c.muted, fontSize: 15 }} numberOfLines={1}>
          {value}
        </Text>
      )}
      {right}
      {onPress && !right && (
        <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={18} color={c.muted} />
      )}
    </>
  );
  const style = [
    styles.row,
    !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  ];
  if (!onPress)
    return (
      <View style={style} accessible accessibilityLabel={value ? `${label}: ${value}` : label}>
        {content}
      </View>
    );
  return (
    <Pressable
      onPress={() => {
        haptic('tap');
        onPress();
      }}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityHint={hint}
      style={({ pressed }) => [...style, pressed && { backgroundColor: c.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}

/** Row with an on/off switch. */
export function SwitchRow({
  icon: iconName,
  label,
  hint,
  value,
  onChange,
  disabled,
  last,
}: {
  icon?: IconName;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const c = useColors();
  const haptic = useHaptics();
  return (
    <Row
      icon={iconName}
      label={label}
      hint={hint}
      last={last}
      right={
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={(v) => {
            haptic('tap');
            onChange(v);
          }}
          trackColor={{ true: c.accent, false: c.border }}
          accessibilityLabel={label}
        />
      }
    />
  );
}

/** Row of selectable pills (settings choices and folder filters). */
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
  const haptic = useHaptics();
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Pressable
          key={String(o)}
          onPress={() => {
            haptic('tap');
            onChange(o);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: o === value }}
          accessibilityLabel={label(o)}
          style={[styles.pill, { backgroundColor: o === value ? c.accent : c.surfaceMuted }]}
        >
          <Text style={{ color: o === value ? c.accentText : c.text, fontWeight: '500' }}>
            {label(o)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A labelled Choice inside a group (padding matches Row). */
export function ChoiceRow<T extends string | number>(props: {
  label: string;
  options: readonly T[];
  value: T;
  format: (v: T) => string;
  onChange: (v: T) => void;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.choiceRow,
        !props.last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
      ]}
    >
      <Text style={{ color: c.text, fontSize: 16 }}>{props.label}</Text>
      <Choice
        options={props.options}
        value={props.value}
        label={props.format}
        onChange={props.onChange}
      />
    </View>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.muted, lineHeight: 21 }}>{children}</Text>;
}

/** Fades + rises children in once (skipped when Reduce Motion is on). */
export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return v.setValue(1);
    Animated.timing(v, { toValue: 1, duration: 260, delay, useNativeDriver: true }).start();
  }, [reduce, delay, v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Pulsing placeholder block for loading states (static when Reduce Motion is on). */
export function Skeleton({
  height = 72,
  style,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[
        { height, borderRadius: radius.lg, backgroundColor: c.surfaceMuted, opacity: v },
        style,
      ]}
    />
  );
}

/** A few skeleton cards. */
export function SkeletonList({ count = 3, height }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: space.md }} accessible accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </View>
  );
}

/** Friendly empty state with the Bloom mark. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { title: string; onPress: () => void };
}) {
  const c = useColors();
  const mark = useLogoMark();
  return (
    <FadeIn>
      <View style={styles.empty}>
        <Image source={mark} style={styles.emptyMark} accessibilityIgnoresInvertColors />
        <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
        {body && (
          <Text style={{ color: c.muted, textAlign: 'center', lineHeight: 21 }}>{body}</Text>
        )}
        {action && (
          <View style={{ marginTop: space.sm, alignSelf: 'stretch' }}>
            <Button title={action.title} onPress={action.onPress} />
          </View>
        )}
      </View>
    </FadeIn>
  );
}

export const initialsOf = (nameOrEmail: string) => {
  const parts = nameOrEmail
    .split('@')[0]!
    .split(/[\s._-]+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
};

/** Round avatar: provider photo if present, else initials on the Bloom rose→violet gradient. */
export function Avatar({ name, uri, size = 72 }: { name: string; uri?: string; size?: number }) {
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={`${name}'s photo`}
      />
    );
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${name}'s avatar`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bloom" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={rose[400]} />
            <Stop offset="1" stopColor={violet[500]} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill="url(#bloom)" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={{ color: 'white', fontSize: size * 0.36, fontWeight: '700' }}>
          {initialsOf(name)}
        </Text>
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  buttonText: { fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.45 },
  input: {
    minHeight: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 16,
  },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginLeft: 2 },
  error: { color: semantic.danger },
  titleWrap: { gap: 4, marginBottom: space.xs, marginTop: space.sm },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  screen: {
    padding: space.xl - 4,
    paddingBottom: space.xxxl,
    gap: space.xl,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  card: { borderRadius: radius.xl, padding: space.lg + 2, borderWidth: StyleSheet.hairlineWidth },
  group: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: space.sm,
  },
  footer: { fontSize: 13, marginHorizontal: space.sm, lineHeight: 18 },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    minHeight: 56,
  },
  choiceRow: { padding: space.lg, gap: space.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  emptyMark: { width: 88, height: 88, opacity: 0.9, marginBottom: space.sm },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

/** Cozy inline notice (instead of a pop-up alert for information). */
export function Notice({
  tone = 'info',
  children,
  onDismiss,
}: {
  tone?: 'info' | 'success' | 'error';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const c = useColors();
  const color = tone === 'error' ? c.danger : tone === 'success' ? c.success : c.accent;
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: c.accentSoft, borderColor: color }]}
    >
      <Ionicons
        name={
          tone === 'error'
            ? 'alert-circle-outline'
            : tone === 'success'
              ? 'checkmark-circle-outline'
              : 'leaf-outline'
        }
        size={18}
        color={color}
      />
      <Text style={{ color: c.text, flex: 1, lineHeight: 20 }}>{children}</Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={10}
        >
          <Ionicons name="close" size={16} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}
