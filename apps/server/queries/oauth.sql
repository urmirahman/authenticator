-- name: CreateOAuthState :exec
INSERT INTO oauth_states (state, provider, code_verifier, nonce, redirect_uri, expires_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: ConsumeOAuthState :one
DELETE FROM oauth_states WHERE state = $1 AND provider = $2 AND expires_at > now() RETURNING *;

-- name: CreateLoginCode :exec
INSERT INTO login_codes (code_hash, user_id, expires_at) VALUES ($1, $2, $3);

-- name: ConsumeLoginCode :one
UPDATE login_codes SET used_at = now()
WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()
RETURNING user_id;

-- name: DeleteExpiredOAuthStates :exec
DELETE FROM oauth_states WHERE expires_at < now();
