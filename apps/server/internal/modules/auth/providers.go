package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
	"github.com/urmirahman/authenticator/apps/server/pkg/applesecret"
	"github.com/urmirahman/authenticator/apps/server/pkg/idtoken"
)

// IDVerifier checks an OIDC id_token (implemented by pkg/idtoken; faked in tests).
type IDVerifier interface {
	Verify(ctx context.Context, raw, nonce string) (idtoken.Claims, error)
}

// FacebookProfiles turns a Facebook access token into a profile (Facebook web login isn't OIDC).
type FacebookProfiles interface {
	Fetch(ctx context.Context, accessToken string) (Profile, error)
}

// Providers bundles everything provider-specific so the service stays testable.
type Providers struct {
	OAuth       map[string]*oauth2.Config // configured providers only
	ID          map[string]IDVerifier     // "google", "apple"
	Facebook    FacebookProfiles
	AppleSecret func() (string, error)
}

// appleEndpoint: Apple isn't bundled in x/oauth2, so we declare it.
var appleEndpoint = oauth2.Endpoint{
	AuthURL:   "https://appleid.apple.com/auth/authorize",
	TokenURL:  "https://appleid.apple.com/auth/token",
	AuthStyle: oauth2.AuthStyleInParams,
}

// NewProviders builds real provider clients from config. Providers without a client id are skipped.
func NewProviders(ctx context.Context, cfg *config.Config) *Providers {
	cb := func(p string) string { return cfg.PublicURL + "/v1/auth/oauth/" + p + "/callback" }
	p := &Providers{OAuth: map[string]*oauth2.Config{}, ID: map[string]IDVerifier{}}

	if cfg.Google.ClientID != "" {
		p.OAuth["google"] = &oauth2.Config{
			ClientID: cfg.Google.ClientID, ClientSecret: cfg.Google.ClientSecret,
			Endpoint: google.Endpoint, RedirectURL: cb("google"), Scopes: []string{"openid", "email", "profile"},
		}
		aud := append([]string{cfg.Google.ClientID}, cfg.Google.Audiences...)
		p.ID["google"] = idtoken.NewRemote(ctx, idtoken.GoogleJWKS, idtoken.GoogleIssuers, aud)
	}
	if cfg.Facebook.ClientID != "" {
		p.OAuth["facebook"] = &oauth2.Config{
			ClientID: cfg.Facebook.ClientID, ClientSecret: cfg.Facebook.ClientSecret,
			Endpoint: facebook.Endpoint, RedirectURL: cb("facebook"), Scopes: []string{"email", "public_profile"},
		}
		p.Facebook = &graphAPI{appSecret: cfg.Facebook.ClientSecret, client: &http.Client{Timeout: 10 * time.Second}}
	}
	if cfg.Apple.ClientID != "" {
		p.OAuth["apple"] = &oauth2.Config{
			ClientID: cfg.Apple.ClientID, Endpoint: appleEndpoint, RedirectURL: cb("apple"),
			Scopes: []string{"name", "email"},
		}
		aud := append([]string{cfg.Apple.ClientID}, cfg.Apple.Audiences...)
		p.ID["apple"] = idtoken.NewRemote(ctx, idtoken.AppleJWKS, idtoken.AppleIssuers, aud)
		a := cfg.Apple
		p.AppleSecret = func() (string, error) {
			return applesecret.Generate(a.TeamID, a.ClientID, a.KeyID, a.PrivateKey, time.Now())
		}
	}
	return p
}

// graphAPI calls Facebook's Graph API /me endpoint.
type graphAPI struct {
	appSecret string
	client    *http.Client
}

func (g *graphAPI) Fetch(ctx context.Context, accessToken string) (Profile, error) {
	// appsecret_proof proves the call comes from our server, not someone holding a stolen token.
	mac := hmac.New(sha256.New, []byte(g.appSecret))
	mac.Write([]byte(accessToken))
	q := url.Values{
		"fields":          {"id,name,email"},
		"access_token":    {accessToken},
		"appsecret_proof": {hex.EncodeToString(mac.Sum(nil))},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://graph.facebook.com/v21.0/me?"+q.Encode(), nil)
	if err != nil {
		return Profile{}, err
	}
	res, err := g.client.Do(req)
	if err != nil {
		return Profile{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return Profile{}, fmt.Errorf("facebook graph: status %d", res.StatusCode)
	}
	var me struct{ ID, Name, Email string }
	if err := json.NewDecoder(res.Body).Decode(&me); err != nil {
		return Profile{}, err
	}
	// Facebook doesn't tell us the email is verified, so we never link accounts by it.
	return Profile{Provider: "facebook", ProviderUserID: me.ID, Email: me.Email, Name: me.Name}, nil
}
