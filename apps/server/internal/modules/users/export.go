package users

import (
	"context"
	"time"

	"github.com/google/uuid"
	"golang.org/x/sync/errgroup"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// Export is everything we store about a user ("download my data"). Vault items and backups
// stay encrypted: the server can't decrypt them, so they are exported as ciphertext.
type Export struct {
	ExportedAt time.Time                `json:"exportedAt"`
	User       User                     `json:"user"`
	Identities []db.ExportIdentitiesRow `json:"identities"`
	Devices    []db.ExportDevicesRow    `json:"devices"`
	Passkeys   []exportPasskey          `json:"passkeys"`
	Vaults     []db.Vault               `json:"vaults"`
	VaultItems []db.VaultItem           `json:"vaultItems"`
	Backups    []db.ListBackupsRow      `json:"backups"`
	Activity   []db.AuditLog            `json:"activity"`
}

type exportPasskey struct {
	Name       string     `json:"name"`
	CreatedAt  time.Time  `json:"createdAt"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`
}

// Export runs the independent queries in parallel with errgroup (first error cancels the rest).
func (s *Service) Export(ctx context.Context, id uuid.UUID) (Export, error) {
	q := s.repo.Queries()
	var e Export
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return e, err
	}
	e.User, e.ExportedAt = fromDB(u), time.Now().UTC()

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() (err error) { e.Identities, err = q.ExportIdentities(ctx, id); return })
	g.Go(func() (err error) { e.Devices, err = q.ExportDevices(ctx, id); return })
	g.Go(func() (err error) { e.Vaults, err = q.ListVaults(ctx, id); return })
	g.Go(func() (err error) { e.VaultItems, err = q.ExportVaultItems(ctx, id); return })
	g.Go(func() (err error) { e.Backups, err = q.ListBackups(ctx, id); return })
	g.Go(func() (err error) {
		e.Activity, err = q.ExportAudit(ctx, uuid.NullUUID{UUID: id, Valid: true})
		return
	})
	g.Go(func() error {
		pks, err := q.ListPasskeysByUser(ctx, id)
		for _, p := range pks {
			e.Passkeys = append(e.Passkeys, exportPasskey{p.Name, p.CreatedAt, p.LastUsedAt})
		}
		return err
	})
	return e, g.Wait()
}
