-- +goose Up
ALTER TABLE identities ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

-- Server-side OAuth state: CSRF state, PKCE verifier and OIDC nonce for one sign-in attempt.
CREATE TABLE oauth_states (
    state         TEXT PRIMARY KEY,
    provider      TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    nonce         TEXT NOT NULL,
    redirect_uri  TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Short-lived one-time codes handed to the web app after OAuth, swapped for tokens via POST.
-- Keeps tokens out of URLs and browser history.
CREATE TABLE login_codes (
    code_hash  BYTEA PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX sessions_device_id_idx ON sessions(device_id);

-- +goose Down
DROP INDEX sessions_device_id_idx;
DROP TABLE login_codes;
DROP TABLE oauth_states;
ALTER TABLE identities DROP COLUMN email_verified;
