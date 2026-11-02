-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per linked OAuth account (Google, Facebook, Apple).
CREATE TABLE identities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'apple')),
    provider_user_id TEXT NOT NULL,
    email            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);
CREATE INDEX identities_user_id_idx ON identities(user_id);

CREATE TABLE devices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    platform     TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
    public_key   TEXT NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX devices_user_id_idx ON devices(user_id);

-- WebAuthn credentials. credential_id/public_key are raw bytes from the authenticator.
CREATE TABLE passkey_credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id   BYTEA NOT NULL UNIQUE,
    public_key      BYTEA NOT NULL,
    sign_count      BIGINT NOT NULL DEFAULT 0,
    aaguid          BYTEA,
    transports      TEXT[] NOT NULL DEFAULT '{}',
    backup_eligible BOOLEAN NOT NULL DEFAULT false,
    backup_state    BOOLEAN NOT NULL DEFAULT false,
    name            TEXT NOT NULL DEFAULT 'Passkey',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at    TIMESTAMPTZ
);
CREATE INDEX passkey_credentials_user_id_idx ON passkey_credentials(user_id);

-- Refresh-token sessions. We store only a SHA-256 hash of the token.
-- family_id groups a rotation chain so reuse of an old token can revoke the whole family.
CREATE TABLE sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id          UUID REFERENCES devices(id) ON DELETE SET NULL,
    family_id          UUID NOT NULL,
    refresh_token_hash BYTEA NOT NULL UNIQUE,
    user_agent         TEXT,
    ip                 INET,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_family_id_idx ON sessions(family_id);

-- A vault holds the KDF params and the wrapped (encrypted) vault key. Never the plaintext key.
CREATE TABLE vaults (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Personal',
    kdf_algorithm   TEXT NOT NULL DEFAULT 'argon2id',
    kdf_salt        BYTEA NOT NULL,
    kdf_memory_kib  INTEGER NOT NULL,
    kdf_iterations  INTEGER NOT NULL,
    kdf_parallelism INTEGER NOT NULL,
    wrapped_key     BYTEA NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vaults_user_id_idx ON vaults(user_id);

-- Encrypted items. The server can't read ciphertext; version is for optimistic concurrency.
CREATE TABLE vault_items (
    id         UUID PRIMARY KEY,
    vault_id   UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    ciphertext BYTEA NOT NULL,
    nonce      BYTEA NOT NULL,
    version    INTEGER NOT NULL DEFAULT 1,
    deleted    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vault_items_vault_id_idx ON vault_items(vault_id);

-- Append-only change log; seq is the sync cursor clients pass back.
CREATE TABLE sync_changes (
    seq        BIGSERIAL PRIMARY KEY,
    vault_id   UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    item_id    UUID NOT NULL,
    version    INTEGER NOT NULL,
    device_id  UUID REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sync_changes_vault_seq_idx ON sync_changes(vault_id, seq);

CREATE TABLE audit_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    ip         INET,
    user_agent TEXT,
    metadata   JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_user_id_idx ON audit_log(user_id, created_at DESC);

-- +goose Down
DROP TABLE audit_log;
DROP TABLE sync_changes;
DROP TABLE vault_items;
DROP TABLE vaults;
DROP TABLE sessions;
DROP TABLE passkey_credentials;
DROP TABLE devices;
DROP TABLE identities;
DROP TABLE users;
