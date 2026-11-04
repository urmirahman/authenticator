# Roadmap to launch — Bloom Authenticator

Legend: **[now]** built in this round · **[her]** needs Urmi (decision, account, legal or money) · **[later]** planned, not started.
Priority: P0 = must have before public launch, P1 = soon after, P2 = nice to have.

## 1. Brand and design

| P   | Item                                                                                 | Who                                                        |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| P0  | Name "Bloom Authenticator", logo (mark, wordmark, mono, app icon), favicon, splash   | [now] (placeholder art; a designer pass is optional [her]) |
| P0  | Shared design tokens (palette, radius, spacing, type) for web + mobile, light + dark | [now]                                                      |
| P1  | Domain name (e.g. bloomauth.app) and email (security@, privacy@, support@)           | [her]                                                      |
| P2  | Marketing screenshots / store artwork                                                | [her] after device testing                                 |

## 2. Public web pages

| P   | Item                                                                   | Who                                              |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| P0  | Landing page (hero, features, security model, how E2E works, FAQ, CTA) | [now]                                            |
| P0  | Privacy Policy, Cookie notice, Terms of Service                        | [now] drafts with TODOs → **legal review** [her] |
| P0  | Security page + `/.well-known/security.txt` (responsible disclosure)   | [now], contact address [her]                     |
| P0  | Help / FAQ, About + open-source licenses                               | [now]                                            |
| P0  | 404 / error pages, SEO metadata, Open Graph, PWA manifest              | [now]                                            |
| P1  | Status page, changelog, blog                                           | [later]                                          |

## 3. Account and vault

| P   | Item                                                                                                       | Who                                         |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| P0  | Onboarding: master password explainer, "cannot be recovered" warning, printable recovery kit (no password) | [now]                                       |
| P0  | Account deletion with confirmation + recent sign-in (re-auth)                                              | [now]                                       |
| P0  | Google sign-in (web + iOS)                                                                                 | done; testing [her]                         |
| P1  | Apple sign-in — deferred (ADR 39); check App Store rule 4.8 before iOS submission                          | [her] Apple Developer account, then [later] |
| P2  | Facebook sign-in — deferred (ADR 39)                                                                       | [her] Meta app, then [later]                |
| P1  | Email notifications (new device sign-in, account deletion)                                                 | [her] email provider, then [later]          |
| P2  | Recovery codes / trusted-contact recovery (needs crypto design review)                                     | [later]                                     |

## 4. Mobile

| P   | Item                                                                                                          | Who     |
| --- | ------------------------------------------------------------------------------------------------------------- | ------- |
| P0  | Onboarding, legal/help links, account deletion, icon/splash, a11y labels, tablet/small screens                | [now]   |
| P0  | Android Google client id + Play Console                                                                       | [her]   |
| P0  | App Store / Play listing: privacy labels ("data not collected" except account email), age rating, screenshots | [her]   |
| P1  | Passkeys on mobile, home-screen widget, Apple Watch                                                           | [later] |

## 5. Production and operations

| P   | Item                                                                                           | Who                                |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| P0  | Hosting decision (API + Postgres + web), TLS, backups, secrets manager                         | [her] decision, then [later] setup |
| P0  | Production env: real JWT secret, DEV_AUTH=false, CORS/redirect allow-lists for the real domain | [later]                            |
| P0  | Error monitoring (privacy-friendly, no PII) and uptime alerts                                  | [her] choose vendor                |
| P1  | Independent security review / pen test before marketing E2E claims widely                      | [her] budget                       |
| P1  | Rate-limit tuning, abuse handling, data-retention job for audit logs                           | [later]                            |

## 6. Legal and compliance (decisions only she can make)

- Legal entity / operator name, address, jurisdiction and governing law. **[her]**
- Effective dates, minimum age (13 or 16), whether to target EU users (GDPR representative?). **[her]**
- Have a lawyer review Privacy Policy and Terms before launch. **[her]**
- We make **no** certification claims (no SOC 2 / ISO 27001) and must not until audited.
