import { config } from '@repo/eslint-config/react-internal';

export default [...config, { ignores: ['.expo/**', 'ios/**', 'android/**', 'expo-env.d.ts'] }];
