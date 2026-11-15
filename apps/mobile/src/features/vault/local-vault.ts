import type { EncryptedVaultItem, Vault } from '@repo/types';
import type { VaultEnvelope } from '@repo/vault';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

const LOCAL_VAULT_ENVELOPE = 'localVaultEnvelope';
const ITEMS_FILE_NAME = 'local-vault-items.json';

function getItemsFile(): File {
  return new File(Paths.document, ITEMS_FILE_NAME);
}

export const localVault = {
  async saveLocalEnvelope(envelope: VaultEnvelope): Promise<Vault> {
    const v: Vault = {
      id: 'local-vault',
      name: 'Local Vault',
      kdf: envelope.kdf,
      wrappedKey: envelope.wrappedKey,
      createdAt: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(LOCAL_VAULT_ENVELOPE, JSON.stringify(v));
    return v;
  },

  async loadLocalEnvelope(): Promise<Vault | null> {
    const raw = await SecureStore.getItemAsync(LOCAL_VAULT_ENVELOPE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Vault;
    } catch {
      return null;
    }
  },

  async saveLocalItems(items: EncryptedVaultItem[]): Promise<void> {
    const file = getItemsFile();
    file.write(JSON.stringify(items, null, 2));
  },

  async loadLocalItems(): Promise<EncryptedVaultItem[]> {
    const file = getItemsFile();
    if (!file.exists) return [];
    try {
      const text = await file.text();
      return JSON.parse(text) as EncryptedVaultItem[];
    } catch {
      return [];
    }
  },

  async clearLocalVault(): Promise<void> {
    await SecureStore.deleteItemAsync(LOCAL_VAULT_ENVELOPE).catch(() => undefined);
    const file = getItemsFile();
    if (file.exists) {
      try {
        file.delete();
      } catch {
        /* ignore delete error */
      }
    }
  },
};
