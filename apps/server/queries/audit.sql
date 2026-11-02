-- name: InsertAudit :exec
INSERT INTO audit_log (user_id, action, ip, user_agent, metadata) VALUES ($1, $2, $3, $4, $5);

-- name: ListAudit :many
-- Keyset pagination: pass the last id you saw as before_id (0 = newest first page).
SELECT * FROM audit_log
WHERE user_id = $1 AND (sqlc.arg(before_id)::bigint = 0 OR id < sqlc.arg(before_id)::bigint)
ORDER BY id DESC
LIMIT $2;
