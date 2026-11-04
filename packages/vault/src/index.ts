/**
 * Platform-neutral vault logic shared by web and mobile:
 * key envelope (master password), item encryption, encrypted backups, and account mapping.
 * No React, no DOM, no React Native here, so it runs (and is tested) anywhere.
 */
export * from './base64';
export * from './vault-codec';
export * from './backup-codec';
export * from './account-mapping';
export * from './preferences';
export * from './activity';
export * from './folders';
export * from './strength';
export * from './passkey-errors';
export * from './secret-key';
