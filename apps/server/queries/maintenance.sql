-- name: CleanupOAuthStates :execrows
DELETE FROM oauth_states WHERE expires_at < now();

-- name: CleanupLoginCodes :execrows
DELETE FROM login_codes WHERE expires_at < now();

-- name: CleanupWebAuthnChallenges :execrows
DELETE FROM webauthn_challenges WHERE expires_at < now();

-- name: CleanupSessions :execrows
DELETE FROM sessions
WHERE expires_at < now() - interval '7 days'
   OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days');
