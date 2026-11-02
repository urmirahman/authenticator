-- name: ListVaults :many
SELECT * FROM vaults WHERE user_id = $1 ORDER BY created_at;

-- name: CreateVault :one
INSERT INTO vaults (user_id, name, kdf_algorithm, kdf_salt, kdf_memory_kib, kdf_iterations, kdf_parallelism, wrapped_key)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;

-- name: GetVaultForUser :one
SELECT * FROM vaults WHERE id = $1 AND user_id = $2;
