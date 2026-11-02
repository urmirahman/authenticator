-- name: ListPasskeysByUser :many
SELECT * FROM passkey_credentials WHERE user_id = $1;

-- name: CreatePasskey :one
INSERT INTO passkey_credentials (user_id, credential_id, public_key, sign_count, aaguid, transports, backup_eligible, backup_state, name)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;

-- name: UpdatePasskeySignCount :exec
UPDATE passkey_credentials SET sign_count = $2, last_used_at = now() WHERE credential_id = $1;
