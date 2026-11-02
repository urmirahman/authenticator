-- name: CreateSession :one
INSERT INTO sessions (user_id, device_id, family_id, refresh_token_hash, user_agent, expires_at)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- name: GetSessionByTokenHash :one
SELECT * FROM sessions WHERE refresh_token_hash = $1;

-- name: RevokeSession :exec
UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeSessionFamily :exec
UPDATE sessions SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL;
