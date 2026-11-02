package auth

import (
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
)

// appleEndpoint: Apple isn't bundled in x/oauth2, so we declare it.
var appleEndpoint = oauth2.Endpoint{
	AuthURL:   "https://appleid.apple.com/auth/authorize",
	TokenURL:  "https://appleid.apple.com/auth/token",
	AuthStyle: oauth2.AuthStyleInParams,
}

// NewProviders builds one oauth2.Config per provider. Providers without a client id are skipped.
// Apple's ClientSecret is left empty here: it's a signed JWT generated per request (see pkg/applesecret).
func NewProviders(cfg *config.Config) map[string]*oauth2.Config {
	cb := func(p string) string { return cfg.PublicURL + "/v1/auth/oauth/" + p + "/callback" }
	out := map[string]*oauth2.Config{}
	if cfg.Google.ClientID != "" {
		out["google"] = &oauth2.Config{
			ClientID: cfg.Google.ClientID, ClientSecret: cfg.Google.ClientSecret,
			Endpoint: google.Endpoint, RedirectURL: cb("google"), Scopes: []string{"openid", "email", "profile"},
		}
	}
	if cfg.Facebook.ClientID != "" {
		out["facebook"] = &oauth2.Config{
			ClientID: cfg.Facebook.ClientID, ClientSecret: cfg.Facebook.ClientSecret,
			Endpoint: facebook.Endpoint, RedirectURL: cb("facebook"), Scopes: []string{"email", "public_profile"},
		}
	}
	if cfg.Apple.ClientID != "" {
		out["apple"] = &oauth2.Config{
			ClientID: cfg.Apple.ClientID, Endpoint: appleEndpoint, RedirectURL: cb("apple"),
			Scopes: []string{"name", "email"},
		}
	}
	return out
}
