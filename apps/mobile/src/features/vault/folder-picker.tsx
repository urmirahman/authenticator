import { Choice, Label } from '@/components/ui';
import { useVault } from './vault-store';

const NONE = '';

/** Pick a folder for an account ("" = no folder). */
export function FolderPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id?: string) => void;
}) {
  const vault = useVault();
  if (vault.folders.length === 0) return null;
  const names = new Map(vault.folders.map((f) => [f.id, f.data.name]));
  return (
    <>
      <Label>Folder</Label>
      <Choice
        options={[NONE, ...vault.folders.map((f) => f.id)]}
        value={value ?? NONE}
        label={(id) => (id === NONE ? 'None' : (names.get(id) ?? '?'))}
        onChange={(id) => onChange(id || undefined)}
      />
    </>
  );
}
