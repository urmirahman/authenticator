-- name: ListDevices :many
SELECT * FROM devices WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at;

-- name: CreateDevice :one
INSERT INTO devices (user_id, name, platform, public_key) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: RevokeDevice :execrows
UPDATE devices SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL;

-- name: TouchDevice :exec
UPDATE devices SET last_seen_at = now() WHERE id = $1;
