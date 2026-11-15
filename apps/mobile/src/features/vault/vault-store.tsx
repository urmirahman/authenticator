import { ApiError } from '@repo/api-client';
import type { EncryptedVaultItem, Vault, VaultItemKind } from '@repo/types';
import {
  createEnvelope,
  decryptItem,
  encryptItem,
  unlockEnvelope,
  wrapVaultKey,
  sortFolders,
  type AccountData,
  type Decrypted,
  type FolderData,
  type ItemData,
} from '@repo/vault';
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
  biometricsAvailable,
  clearBiometricKey,
  isBiometricEnabled,
  loadBiometricKey,
  saveBiometricKey,
} from '@/features/security/biometric-key';
import { session } from '@/features/session/session';
import { localVault } from './local-vault';

/**
 * Mobile version of the web vault store. The crypto is shared (@repo/vault); only state handling
 * lives here. Status: loading -> needs-setup | locked -> unlocked.
 */
export type VaultStatus = 'loading' | 'needs-setup' | 'locked' | 'unlocked';

/**
 * Argon2id in pure JS is slower on phones, so a NEW vault created on mobile uses the OWASP
 * minimum (19 MiB, 2 passes). The server rejects anything weaker.
 */
const MOBILE_KDF = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 };

interface VaultState {
  status: VaultStatus;
  accounts: Decrypted<AccountData>[];
  folders: Decrypted<FolderData>[];
  syncing: boolean;
  /** When the last successful pull finished (ms epoch), for the Profile screen. */
  lastSyncedAt: number | null;
  error: string | null;
  load(): Promise<void>;
  reset(): void;
  /** Drop in-memory vault without entering `loading` (sign-out while `(app)` is still mounted). */
  abandon(): void;
  setup(password: string): Promise<void>;
  unlock(password: string): Promise<void>;
  /** True if the password opens the vault envelope (doesn't change state). */
  verifyPassword(password: string): Promise<boolean>;
  lock(): void;
  changePassword(current: string, next: string): Promise<void>;
  biometric: { available: boolean; enabled: boolean };
  setBiometric(enabled: boolean): Promise<void>;
  unlockWithBiometric(): Promise<boolean>;
  sync(): Promise<void>;
  save(kind: VaultItemKind, data: ItemData, id?: string): Promise<string>;
  remove(id: string): Promise<void>;
}

const Ctx = createContext<VaultState | null>(null);

export function useVault() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVault must be used inside <VaultProvider>');
  return v;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [items, setItems] = useState<Map<string, Decrypted<ItemData>>>(new Map());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vault = useRef<Vault | null>(null);
  const key = useRef<Uint8Array | null>(null);
  const cursor = useRef('');
  const generation = useRef(0);
  const [biometric, setBiometricState] = useState({ available: false, enabled: false });

  const wipe = useCallback(() => {
    generation.current += 1;
    key.current?.fill(0);
    key.current = null;
    vault.current = null;
    cursor.current = '';
    setItems(new Map());
    setSyncing(false);
    setLastSyncedAt(null);
    setError(null);
    setBiometricState({ available: false, enabled: false });
  }, []);

  const reset = useCallback(() => {
    wipe();
    setStatus('loading');
  }, [wipe]);

  const abandon = useCallback(() => {
    wipe();
    setStatus('needs-setup');
  }, [wipe]);

  const refreshBiometric = useCallback(async () => {
    const v = vault.current;
    setBiometricState({
      available: await biometricsAvailable(),
      enabled: v ? await isBiometricEnabled(v.id) : false,
    });
  }, []);

  const apply = useCallback((incoming: EncryptedVaultItem[]) => {
    const k = key.current;
    if (!k || incoming.length === 0) return;
    setItems((prev) => {
      const next = new Map(prev);
      for (const it of incoming) {
        if (it.deleted) next.delete(it.id);
        else {
          try {
            next.set(it.id, {
              id: it.id,
              kind: it.kind,
              version: it.version,
              data: decryptItem(k, it),
            });
          } catch {
            /* skip items we can't decrypt */
          }
        }
      }
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    const currentGeneration = generation.current;
    if (await session.isOffline()) {
      const local = await localVault.loadLocalEnvelope();
      if (generation.current !== currentGeneration) return;
      vault.current = local;
      setStatus(vault.current ? (key.current ? 'unlocked' : 'locked') : 'needs-setup');
      await refreshBiometric();
      return;
    }
    const vaults = await api.vaults.list();
    if (generation.current !== currentGeneration) return;
    vault.current = vaults[0] ?? null;
    setStatus(vault.current ? (key.current ? 'unlocked' : 'locked') : 'needs-setup');
    await refreshBiometric();
  }, [refreshBiometric]);

  const sync = useCallback(async () => {
    if (await session.isOffline()) return;
    const v = vault.current;
    if (!v || !key.current) return;
    const currentGeneration = generation.current;
    setSyncing(true);
    try {
      for (;;) {
        const page = await api.sync.pull(v.id, cursor.current);
        if (generation.current !== currentGeneration) return;
        apply(page.items);
        cursor.current = page.cursor;
        if (!page.hasMore) break;
      }
      setError(null);
      setLastSyncedAt(Date.now());
    } catch (e) {
      if (generation.current === currentGeneration)
        setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      if (generation.current === currentGeneration) setSyncing(false);
    }
  }, [apply]);

  const setup = useCallback(async (password: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { envelope, vaultKey } = await createEnvelope(password, {
      algorithm: 'argon2id',
      salt,
      ...MOBILE_KDF,
    });
    if (await session.isOffline()) {
      vault.current = await localVault.saveLocalEnvelope(envelope);
      await localVault.saveLocalItems([]);
    } else {
      vault.current = await api.vaults.create({ name: 'Personal', ...envelope });
    }
    key.current = vaultKey;
    setStatus('unlocked');
  }, []);

  /** Shared tail of every unlock path: key in memory, fresh state, pull everything. */
  const afterUnlock = useCallback(
    async (k: Uint8Array) => {
      key.current = k;
      cursor.current = '';
      setItems(new Map());
      setStatus('unlocked');
      if (await session.isOffline()) {
        const localItems = await localVault.loadLocalItems();
        apply(localItems);
      } else {
        await sync();
      }
    },
    [apply, sync],
  );

  const unlockWithBiometric = useCallback(async () => {
    const v = vault.current;
    if (!v) return false;
    const k = await loadBiometricKey(v.id);
    if (!k) return false;
    try {
      // Double-check the stored key still opens the vault (e.g. password changed on another device
      // keeps the same key, so this normally succeeds).
      await afterUnlock(k);
      return true;
    } catch {
      await clearBiometricKey();
      return false;
    }
  }, [afterUnlock]);

  const setBiometric = useCallback(
    async (enabled: boolean) => {
      const v = vault.current;
      if (!v || !key.current) throw new Error('Unlock first');
      if (enabled) await saveBiometricKey(v.id, key.current);
      else await clearBiometricKey();
      await refreshBiometric();
    },
    [refreshBiometric],
  );

  /** Same vault key, new password envelope. Biometric copy is cleared so you re-opt-in knowingly. */
  const changePassword = useCallback(
    async (current: string, next: string) => {
      const v = vault.current;
      if (!v) throw new Error('No vault');
      const k = await unlockEnvelope(current, v);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const wrapped = await wrapVaultKey(k, next, { algorithm: 'argon2id', salt, ...MOBILE_KDF });
      if (await session.isOffline()) {
        vault.current = await localVault.saveLocalEnvelope(wrapped);
      } else {
        vault.current = await api.vaults.rekey(v.id, wrapped);
      }
      await clearBiometricKey();
      await refreshBiometric();
    },
    [refreshBiometric],
  );

  const unlock = useCallback(
    async (password: string) => {
      if (!vault.current) throw new Error('No vault');
      await afterUnlock(await unlockEnvelope(password, vault.current));
    },
    [afterUnlock],
  );

  const verifyPassword = useCallback(async (password: string) => {
    if (!vault.current) return false;
    try {
      (await unlockEnvelope(password, vault.current)).fill(0);
      return true;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    key.current?.fill(0);
    key.current = null;
    setItems(new Map());
    setStatus(vault.current ? 'locked' : 'needs-setup');
  }, []);

  const write = useCallback(
    async (id: string, kind: VaultItemKind, data: ItemData | null, version: number) => {
      const v = vault.current!;
      if (await session.isOffline()) {
        const currentItems = await localVault.loadLocalItems();
        let nextItems: EncryptedVaultItem[];
        if (data) {
          const encrypted = encryptItem(key.current!, id, data);
          const item: EncryptedVaultItem = {
            id,
            vaultId: v.id,
            kind,
            version,
            ciphertext: encrypted.ciphertext,
            nonce: encrypted.nonce,
            deleted: false,
            updatedAt: new Date().toISOString(),
          };
          const idx = currentItems.findIndex((it) => it.id === id);
          if (idx >= 0) {
            nextItems = [...currentItems];
            nextItems[idx] = item;
          } else {
            nextItems = [...currentItems, item];
          }
        } else {
          nextItems = currentItems.filter((it) => it.id !== id);
        }
        await localVault.saveLocalItems(nextItems);
        return;
      }
      try {
        if (data)
          await api.items.put(v.id, id, { kind, version, ...encryptItem(key.current!, id, data) });
        else await api.items.remove(v.id, id, version);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          apply((e.body as { conflicts?: EncryptedVaultItem[] } | undefined)?.conflicts ?? []);
          throw new Error('Changed on another device. Loaded the latest copy; try again.');
        }
        throw e;
      }
    },
    [apply],
  );

  const save = useCallback(
    async (kind: VaultItemKind, data: ItemData, id: string = crypto.randomUUID()) => {
      const version = (items.get(id)?.version ?? 0) + 1;
      await write(id, kind, data, version);
      setItems((prev) => new Map(prev).set(id, { id, kind, version, data }));
      return id;
    },
    [items, write],
  );

  const remove = useCallback(
    async (id: string) => {
      const ex = items.get(id);
      if (!ex) return;
      await write(id, ex.kind, null, ex.version + 1);
      setItems((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [items, write],
  );

  const value = useMemo<VaultState>(() => {
    const all = [...items.values()];
    return {
      status,
      syncing,
      lastSyncedAt,
      error,
      accounts: (all.filter((i) => i.kind === 'account') as Decrypted<AccountData>[]).sort((a, b) =>
        (a.data.issuer || a.data.label).localeCompare(b.data.issuer || b.data.label),
      ),
      folders: sortFolders(all.filter((i) => i.kind === 'folder') as Decrypted<FolderData>[]),
      load,
      reset,
      abandon,
      setup,
      unlock,
      verifyPassword,
      lock,
      changePassword,
      biometric,
      setBiometric,
      unlockWithBiometric,
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
    reset,
    abandon,
    setup,
    unlock,
    verifyPassword,
    lock,
    changePassword,
    biometric,
    setBiometric,
    unlockWithBiometric,
    sync,
    save,
    remove,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
