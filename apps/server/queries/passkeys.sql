-- name: ListPasskeysByUser :many
SELECT * FROM passkey_credentials WHERE user_id = $1 ORDER BY created_at;

-- name: GetPasskeyByCredentialID :one
SELECT * FROM passkey_credentials WHERE credential_id = $1;

-- name: CreatePasskey :one
INSERT INTO passkey_credentials (user_id, credential_id, public_key, sign_count, aaguid, transports, backup_eligible, backup_state, name, credential)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;

-- name: UpdatePasskeyAfterLogin :exec
UPDATE passkey_credentials
SET sign_count = $2, backup_state = $3, credential = $4, last_used_at = now()
WHERE credential_id = $1;

-- name: RenamePasskey :execrows
UPDATE passkey_credentials SET name = $3 WHERE id = $1 AND user_id = $2;

-- name: DeletePasskey :execrows
DELETE FROM passkey_credentials WHERE id = $1 AND user_id = $2;

-- name: CreateChallenge :one
INSERT INTO webauthn_challenges (user_id, kind, session_data, expires_at) VALUES ($1, $2, $3, $4) RETURNING id;

-- name: ConsumeChallenge :one
DELETE FROM webauthn_challenges WHERE id = $1 AND kind = $2 AND expires_at > now() RETURNING *;
