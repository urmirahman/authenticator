-- name: ListChangesSince :many
SELECT c.seq, i.id, i.vault_id, i.ciphertext, i.nonce, i.version, i.deleted, i.updated_at
FROM sync_changes c
JOIN vault_items i ON i.id = c.item_id
WHERE c.vault_id = $1 AND c.seq > $2
ORDER BY c.seq
LIMIT $3;

-- name: GetVaultItem :one
SELECT * FROM vault_items WHERE id = $1 AND vault_id = $2;

-- name: UpsertVaultItem :one
INSERT INTO vault_items (id, vault_id, ciphertext, nonce, version, deleted)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO UPDATE
SET ciphertext = EXCLUDED.ciphertext, nonce = EXCLUDED.nonce, version = EXCLUDED.version,
    deleted = EXCLUDED.deleted, updated_at = now()
WHERE vault_items.version < EXCLUDED.version
RETURNING *;

-- name: AppendChange :one
INSERT INTO sync_changes (vault_id, item_id, version, device_id) VALUES ($1, $2, $3, $4) RETURNING seq;
