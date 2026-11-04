package database

import "testing"

func TestIsPoolerURL(t *testing.T) {
	cases := map[string]bool{
		"postgres://u:p@ep-cool-123-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require": true,
		"postgres://u:p@ep-cool-123.ap-southeast-1.aws.neon.tech/db?sslmode=require":        false,
		"postgres://authenticator:authenticator@localhost:5433/authenticator":               false,
	}
	for dsn, want := range cases {
		if got := IsPoolerURL(dsn); got != want {
			t.Errorf("IsPoolerURL(%q) = %v, want %v", dsn, got, want)
		}
	}
}
