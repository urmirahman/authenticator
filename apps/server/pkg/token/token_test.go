package token

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestAccessTokenRoundTrip(t *testing.T) {
	iss := NewIssuer("test-secret", time.Minute)
	uid := uuid.New()

	raw, err := iss.Access(uid, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	got, err := iss.Verify(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got != uid {
		t.Fatalf("got %s, want %s", got, uid)
	}
}

func TestExpiredAccessTokenIsRejected(t *testing.T) {
	iss := NewIssuer("test-secret", time.Minute)
	raw, _ := iss.Access(uuid.New(), time.Now().Add(-time.Hour))
	if _, err := iss.Verify(raw); err == nil {
		t.Fatal("expected expired token to fail")
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
