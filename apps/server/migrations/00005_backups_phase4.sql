-- +goose Up
-- Encrypted backups: an opaque blob the client encrypted (usually with a separate backup
-- password). kdf holds the public parameters needed to re-derive that key (salt, memory...).
CREATE TABLE backups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    ciphertext BYTEA NOT NULL,
    nonce      BYTEA NOT NULL,
    kdf        JSONB NOT NULL DEFAULT '{}',
    item_count INTEGER NOT NULL DEFAULT 0,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX backups_user_id_idx ON backups(user_id, created_at DESC);

-- +goose Down
DROP TABLE backups;
