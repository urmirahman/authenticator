'use client';

import { ApiError } from '@repo/api-client';
import { defaultKdfParams } from '@repo/crypto';
import type { EncryptedVaultItem, Vault, VaultItemKind } from '@repo/types';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import {
  createEnvelope,
  decryptItem,
  encryptItem,
  unlockEnvelope,
  wrapVaultKey,
  type AccountData,
  type Decrypted,
  type FolderData,
  type ItemData,
} from '@repo/vault';

/**
 * The vault "store": holds the unlocked key and decrypted items in memory, and talks to the API.
 *
 * status flow:  loading -> needs-setup (no vault yet) | locked -> unlocked
 * Reloading the page forgets the key on purpose, so you have to unlock again.
 */
export type VaultStatus = 'loading' | 'needs-setup' | 'locked' | 'unlocked';

interface VaultState {
  status: VaultStatus;
  accounts: Decrypted<AccountData>[];
  folders: Decrypted<FolderData>[];
  syncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  load(): Promise<void>;
  setup(password: string): Promise<void>;
  unlock(password: string): Promise<void>;
  lock(): void;
  changePassword(current: string, next: string): Promise<void>;
  /** Throws 'Wrong master password' if it does not unlock this vault. */
  verifyPassword(password: string): Promise<void>;
  sync(): Promise<void>;
  save(kind: VaultItemKind, data: ItemData, id?: string): Promise<string>;
  remove(id: string): Promise<void>;
}

const VaultContext = createContext<VaultState | null>(null);

export function useVault() {
  const v = useContext(VaultContext);
  if (!v) throw new Error('useVault must be used inside <VaultProvider>');
  return v;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [items, setItems] = useState<Map<string, Decrypted<ItemData>>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs = values that change without needing a re-render (and must never be rendered).
  const vault = useRef<Vault | null>(null);
  const key = useRef<Uint8Array | null>(null);
  const cursor = useRef<string>('');

  /** Decrypt server items and merge them into our map. Tombstones remove the item. */
  const apply = useCallback((incoming: EncryptedVaultItem[]) => {
    const k = key.current;
    if (!k || incoming.length === 0) return;
    setItems((prev) => {
      const next = new Map(prev);
      for (const it of incoming) {
        if (it.deleted) {
          next.delete(it.id);
          continue;
        }
        try {
          next.set(it.id, {
            id: it.id,
            kind: it.kind,
            version: it.version,
            data: decryptItem(k, it),
          });
        } catch {
          console.warn('Could not decrypt item', it.id);
        }
      }
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const vaults = await api.vaults.list();
    vault.current = vaults[0] ?? null;
    setStatus(vault.current ? (key.current ? 'unlocked' : 'locked') : 'needs-setup');
  }, []);

  /** Pull every change since our cursor (page by page). */
  const sync = useCallback(async () => {
    const v = vault.current;
    if (!v || !key.current) return;
    setSyncing(true);
    try {
      for (;;) {
        const page = await api.sync.pull(v.id, cursor.current);
        apply(page.items);
        cursor.current = page.cursor;
        if (!page.hasMore) break;
      }
      setLastSyncedAt(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [apply]);

  const setup = useCallback(async (password: string) => {
    const { envelope, vaultKey } = await createEnvelope(password, defaultKdfParams());
    vault.current = await api.vaults.create({ name: 'Personal', ...envelope });
    key.current = vaultKey;
    setStatus('unlocked');
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!vault.current) throw new Error('No vault');
      key.current = await unlockEnvelope(password, vault.current);
      cursor.current = '';
      setItems(new Map());
      setStatus('unlocked');
      await sync();
    },
    [sync],
  );

  const lock = useCallback(() => {
    key.current?.fill(0); // wipe the key bytes before dropping the reference
    key.current = null;
    setItems(new Map());
    setStatus(vault.current ? 'locked' : 'needs-setup');
  }, []);

  /**
   * Change master password: prove the old one, then wrap the SAME vault key with the new one.
   * Items are not re-encrypted. Other devices just need the new password next time they unlock.
   */
  const changePassword = useCallback(async (current: string, next: string) => {
    const v = vault.current;
    if (!v) throw new Error('No vault');
    const k = await unlockEnvelope(current, v);
    vault.current = await api.vaults.rekey(v.id, await wrapVaultKey(k, next, defaultKdfParams()));
  }, []);

  const verifyPassword = useCallback(async (password: string) => {
    if (!vault.current) throw new Error('No vault');
    (await unlockEnvelope(password, vault.current)).fill(0);
  }, []);

  /** Write one item. On a 409 conflict we take the server copy and tell the user to retry. */
  const putItem = useCallback(
    async (id: string, kind: VaultItemKind, data: ItemData | null, version: number) => {
      const v = vault.current!;
      try {
        if (data)
          await api.items.put(v.id, id, { kind, version, ...encryptItem(key.current!, id, data) });
        else await api.items.remove(v.id, id, version);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const conflicts =
            (e.body as { conflicts?: EncryptedVaultItem[] } | undefined)?.conflicts ?? [];
          apply(conflicts);
          throw new Error(
            'This item changed on another device. We loaded the latest copy; try again.',
          );
        }
        throw e;
      }
    },
    [apply],
  );

  const save = useCallback(
    async (kind: VaultItemKind, data: ItemData, id = crypto.randomUUID()) => {
      const existing = items.get(id);
      const version = existing ? existing.version + 1 : 1;
      await putItem(id, kind, data, version);
      setItems((prev) => new Map(prev).set(id, { id, kind, version, data }));
      return id;
    },
    [items, putItem],
  );

  const remove = useCallback(
    async (id: string) => {
      const existing = items.get(id);
      if (!existing) return;
      await putItem(id, existing.kind, null, existing.version + 1);
      setItems((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [items, putItem],
  );

  const value = useMemo<VaultState>(() => {
    const all = [...items.values()];
    const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    return {
      status,
      syncing,
      lastSyncedAt,
      error,
      accounts: (all.filter((i) => i.kind === 'account') as Decrypted<AccountData>[]).sort((a, b) =>
        byName(a.data.issuer || a.data.label, b.data.issuer || b.data.label),
      ),
      folders: (all.filter((i) => i.kind === 'folder') as Decrypted<FolderData>[]).sort((a, b) =>
        byName(a.data.name, b.data.name),
      ),
      load,
      setup,
      unlock,
      lock,
      changePassword,
      verifyPassword,
      sync,
      save,
      remove,
    };
  }, [
    items,
    status,
    syncing,
    lastSyncedAt,
    error,
    load,
    setup,
    unlock,
    lock,
    changePassword,
    verifyPassword,
    sync,
    save,
    remove,
  ]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
