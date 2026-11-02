-- Read-only queries for "download my data" (GDPR-style export).

-- name: ExportIdentities :many
SELECT provider, email, email_verified, created_at FROM identities WHERE user_id = $1 ORDER BY created_at;

-- name: ExportDevices :many
SELECT id, name, platform, last_seen_at, revoked_at, created_at FROM devices WHERE user_id = $1 ORDER BY created_at;

-- name: ExportVaultItems :many
SELECT i.* FROM vault_items i JOIN vaults v ON v.id = i.vault_id WHERE v.user_id = $1 ORDER BY i.created_at;

-- name: ExportAudit :many
SELECT * FROM audit_log WHERE user_id = $1 ORDER BY id DESC LIMIT 1000;
