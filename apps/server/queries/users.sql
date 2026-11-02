-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: CreateUser :one
INSERT INTO users (email, display_name, avatar_url) VALUES ($1, $2, $3) RETURNING *;

-- name: GetIdentity :one
SELECT * FROM identities WHERE provider = $1 AND provider_user_id = $2;

-- name: CreateIdentity :one
INSERT INTO identities (user_id, provider, provider_user_id, email) VALUES ($1, $2, $3, $4) RETURNING *;
