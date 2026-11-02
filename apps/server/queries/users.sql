-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: CreateUser :one
INSERT INTO users (email, display_name, avatar_url) VALUES ($1, $2, $3) RETURNING *;

-- name: UpdateUserProfile :one
UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1 RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: GetIdentity :one
SELECT * FROM identities WHERE provider = $1 AND provider_user_id = $2;

-- name: CreateIdentity :one
INSERT INTO identities (user_id, provider, provider_user_id, email, email_verified)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: ListIdentitiesByUser :many
SELECT * FROM identities WHERE user_id = $1 ORDER BY created_at;
