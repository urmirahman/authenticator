-- +goose Up
-- Folders are just another kind of encrypted item, so they sync exactly like accounts.
-- Which folder an account belongs to lives INSIDE the account's ciphertext.
ALTER TABLE vault_items ADD COLUMN kind TEXT NOT NULL DEFAULT 'account' CHECK (kind IN ('account', 'folder'));
ALTER TABLE vault_items ADD COLUMN updated_by_device UUID REFERENCES devices(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE vault_items DROP COLUMN updated_by_device;
ALTER TABLE vault_items DROP COLUMN kind;
