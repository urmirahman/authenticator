-- name: ListChangesSince :many
-- Each item once, with the newest change seq for it; seq becomes the next cursor.
SELECT i.id, i.vault_id, i.kind, i.ciphertext, i.nonce, i.version, i.deleted, i.updated_at,
       max(c.seq)::bigint AS seq
FROM sync_changes c
JOIN vault_items i ON i.id = c.item_id
WHERE c.vault_id = $1 AND c.seq > $2
GROUP BY i.id
ORDER BY seq
LIMIT $3;

-- name: ListLiveItems :many
SELECT * FROM vault_items WHERE vault_id = $1 AND deleted = false ORDER BY created_at;

-- name: GetVaultItem :one
SELECT * FROM vault_items WHERE id = $1 AND vault_id = $2;

-- name: LockVaultItem :one
SELECT * FROM vault_items WHERE id = $1 FOR UPDATE;

-- name: InsertVaultItem :one
INSERT INTO vault_items (id, vault_id, kind, ciphertext, nonce, version, deleted, updated_by_device)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;

-- name: UpdateVaultItem :one
UPDATE vault_items
SET ciphertext = $2, nonce = $3, version = $4, deleted = $5, updated_by_device = $6, updated_at = now()
WHERE id = $1 RETURNING *;

-- name: AppendChange :one
INSERT INTO sync_changes (vault_id, item_id, version, device_id) VALUES ($1, $2, $3, $4) RETURNING seq;

-- name: LatestSeq :one
SELECT coalesce(max(seq), 0)::bigint FROM sync_changes WHERE vault_id = $1;
