import { CodeList } from '@/features/totp/code-list';
import { DEMO_ACCOUNTS } from '@/features/vault/demo-accounts';

export default function VaultPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Your codes</h1>
      <CodeList accounts={DEMO_ACCOUNTS} />
    </main>
  );
}
