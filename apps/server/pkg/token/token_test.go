package token

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestAccessToken(t *testing.T) {
	iss := NewIssuer("test-secret", time.Minute)
	subj := Subject{UserID: uuid.New(), SessionID: uuid.New()}

	tests := []struct {
		name    string
		issued  time.Time
		verify  *Issuer
		wantErr bool
	}{
		{"valid", time.Now(), iss, false},
		{"expired", time.Now().Add(-time.Hour), iss, true},
		{"wrong secret", time.Now(), NewIssuer("other", time.Minute), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, err := iss.Access(subj, tt.issued)
			if err != nil {
				t.Fatal(err)
			}
			got, err := tt.verify.Verify(raw)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && got != subj {
				t.Fatalf("got %+v, want %+v", got, subj)
			}
		})
	}
}

func TestRefreshHashIsStable(t *testing.T) {
	raw, hash, err := NewRefresh()
	if err != nil {
		t.Fatal(err)
	}
	if string(HashRefresh(raw)) != string(hash) {
		t.Fatal("hash mismatch")
	}
}
