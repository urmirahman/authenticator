import { ApiError } from '@repo/api-client';
import type { EncryptedVaultItem, Vault, VaultItemKind } from '@repo/types';
import {
  createEnvelope,
  decryptItem,
  encryptItem,
  unlockEnvelope,
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
  error: string | null;
  load(): Promise<void>;
  setup(password: string): Promise<void>;
  unlock(password: string): Promise<void>;
  lock(): void;
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
  const [error, setError] = useState<string | null>(null);
  const vault = useRef<Vault | null>(null);
  const key = useRef<Uint8Array | null>(null);
  const cursor = useRef('');

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
    const vaults = await api.vaults.list();
    vault.current = vaults[0] ?? null;
    setStatus(vault.current ? (key.current ? 'unlocked' : 'locked') : 'needs-setup');
  }, []);

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
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [apply]);

  const setup = useCallback(async (password: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { envelope, vaultKey } = await createEnvelope(password, {
      algorithm: 'argon2id',
      salt,
      ...MOBILE_KDF,
    });
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
    key.current?.fill(0);
    key.current = null;
    setItems(new Map());
    setStatus(vault.current ? 'locked' : 'needs-setup');
  }, []);

  const write = useCallback(
    async (id: string, kind: VaultItemKind, data: ItemData | null, version: number) => {
      const v = vault.current!;
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
      error,
      accounts: (all.filter((i) => i.kind === 'account') as Decrypted<AccountData>[]).sort((a, b) =>
        (a.data.issuer || a.data.label).localeCompare(b.data.issuer || b.data.label),
      ),
      folders: all.filter((i) => i.kind === 'folder') as Decrypted<FolderData>[],
      load,
      setup,
      unlock,
      lock,
      sync,
      save,
      remove,
    };
  }, [items, status, syncing, error, load, setup, unlock, lock, sync, save, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
