-- name: CreateBackup :one
INSERT INTO backups (user_id, name, ciphertext, nonce, kdf, item_count, size_bytes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, kdf, item_count, size_bytes, created_at;

-- name: ListBackups :many
SELECT id, name, kdf, item_count, size_bytes, created_at FROM backups WHERE user_id = $1 ORDER BY created_at DESC;

-- name: CountBackups :one
SELECT count(*) FROM backups WHERE user_id = $1;

-- name: GetBackup :one
SELECT * FROM backups WHERE id = $1 AND user_id = $2;

-- name: DeleteBackup :execrows
DELETE FROM backups WHERE id = $1 AND user_id = $2;
