import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePreferences } from '@/features/settings/preferences';

/** True when the OS asks for less motion; animations then jump straight to their end state. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export type HapticKind = 'tap' | 'success' | 'warning';

/** Subtle haptics that respect the "Haptics" preference. Failures are ignored (simulators, old phones). */
export function useHaptics() {
  const { haptics } = usePreferences();
  return useCallback(
    (kind: HapticKind = 'tap') => {
      if (!haptics) return;
      const p =
        kind === 'tap'
          ? Haptics.selectionAsync()
          : Haptics.notificationAsync(
              kind === 'success'
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Warning,
            );
      p.catch(() => {});
    },
    [haptics],
  );
}
