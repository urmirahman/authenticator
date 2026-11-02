/** Human labels for audit actions written by the server (apps/server/internal/modules/audit). */
const LABELS: Record<string, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  'passkey.added': 'Passkey added',
  'passkey.removed': 'Passkey removed',
  'passkey.renamed': 'Passkey renamed',
  'device.revoked': 'Device signed out',
  'vault.rekeyed': 'Master password changed',
  'backup.created': 'Backup created',
  'backup.downloaded': 'Backup downloaded',
  'backup.deleted': 'Backup deleted',
  'account.exported': 'Data exported',
};

export const activityLabel = (action: string) => LABELS[action] ?? action;
