import * as ExpoCrypto from 'expo-crypto';

/**
 * Hermes (React Native's JS engine) has no Web Crypto. The shared crypto code (@noble/*) needs
 * crypto.getRandomValues for keys and nonces, and we use crypto.randomUUID for item ids.
 * expo-crypto provides both from the OS's secure random generator. Import this file FIRST.
 */
const g = globalThis as unknown as { crypto?: Partial<Crypto> };
g.crypto ??= {};
g.crypto.getRandomValues ??= ((arr: Uint8Array) =>
  ExpoCrypto.getRandomValues(arr)) as Crypto['getRandomValues'];
g.crypto.randomUUID ??= (() => ExpoCrypto.randomUUID()) as Crypto['randomUUID'];
