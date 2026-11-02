-- +goose Up
-- Full go-webauthn credential record (flags, attestation, authenticator data) as JSON.
-- The typed columns stay for querying/listing.
ALTER TABLE passkey_credentials ADD COLUMN credential JSONB NOT NULL DEFAULT '{}';

-- Pending WebAuthn ceremonies (challenge + options) between begin and finish. One-time use.
CREATE TABLE webauthn_challenges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('register', 'login')),
    session_data JSONB NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE webauthn_challenges;
ALTER TABLE passkey_credentials DROP COLUMN credential;
