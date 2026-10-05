# 11 — Security Requirements

Threat model and controls for the storefront, checkout, admin, data layer and integrations. Controls are mandatory unless marked (P1/P2).

---

## 1. Threat model (summary)

| Asset | Threats | Primary controls |
|---|---|---|
| Customer PII (email, phone, addresses, orders) | Data exposure via IDOR, SQL injection, misconfigured Supabase API, log leakage | Server-only data access, authorisation per query, RLS deny-by-default, parameterised queries, log redaction |
| Payments | Tampered amounts, replayed/forged webhooks, fake "payment success" callbacks | Server-computed totals, HMAC verification, idempotent webhook processing, reconciliation cron |
| Admin | Credential stuffing, session theft, privilege escalation, CSRF | Supabase Auth + 2FA, short sessions, role checks in every action, same-site cookies, origin checks |
| Inventory / pricing integrity | Oversell, negative prices, coupon abuse | DB constraints, row locks, rate-limited coupon validation |
| Availability | Bot traffic, scraping, checkout spam, OTP bombing | Vercel Firewall rate limits, Turnstile on forms, per-IP/per-account limits |
| Secrets | Leaked keys in repo/logs/client bundles | Env-only secrets, Zod env split (server vs `NEXT_PUBLIC_`), secret scanning in CI |
| Content | XSS through Markdown/reviews, open redirects | Sanitised Markdown, no raw HTML, strict CSP, redirect allowlist |
| Supply chain | Malicious dependencies | Minimal deps, lockfile, `pnpm audit` in CI, Dependabot, provenance checks |

---

## 2. Authentication

- **Provider:** Supabase Auth. Methods at launch: **email OTP code (primary)**, magic link (secondary), Google OAuth. The 6-digit code is primary because magic links on mobile frequently open in a different browser (Gmail's in-app browser) and the session lands in the wrong place. Phone OTP later (P2): Supabase has no native MSG91 provider, so Indian SMS goes through the Supabase "Send SMS" auth hook calling our own route.
- **Server-only auth.** All auth flows (OTP request/verify, OAuth PKCE code exchange, sign-out) run through Server Actions and route handlers using the Supabase *server* client. There is **no Supabase browser client** in the bundle. This matters because the `@supabase/ssr` browser client needs to read session cookies from `document.cookie`, which forces them to be non-`HttpOnly`; a server-only flow lets us keep session cookies `HttpOnly`.
- **Sessions:** cookies `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefixed; access token 1h, refresh rotation, absolute lifetime 30 days for customers, 12h for admins.
- **Supabase SMTP:** the built-in Supabase email sender is rate-limited and not for production; Supabase Auth is configured to send through our Resend domain from day one (Phase 0 checklist).
- **Email change / account recovery:** changing the sign-in email requires re-authentication and confirmation from both old and new addresses (Supabase "secure email change").
- **Password-less by default**; if passwords are enabled later: min 12 chars, breached-password check, Argon2 (Supabase default bcrypt acceptable).
- **Admin:** must exist in `admin_users` and be active; TOTP 2FA required for Owner/Manager (Phase 2 hardening, Supabase MFA); re-authentication required for sensitive actions (refunds above limit, user management, settings).
- **Admin hostname isolation (ADR-31):** the admin is served at `admin.{domain}` by the same Next.js app (host-based rewrite in the proxy to the `(admin)` route group). Benefits: admin session cookies are scoped to a different host than storefront cookies, the strict nonce CSP applies cleanly, Vercel Firewall rules (rate limits, optional IP allowlist, country block) can target the host, and `/admin/*` never exists on the public host (404). Cheap now, awkward to introduce after links, bookmarks and cookies exist.
- **Guest checkout:** no account; order lookup requires order number + matching email/phone; rate-limited; no enumeration (same response for not-found).
- **Logout everywhere** (P1): revoke all refresh tokens.
- Email verification required before an account can place a COD order (prepaid allowed as guest).

---

## 3. Authorisation

- Every server action and route handler begins with `requireUser()` / `requireRole(...)` / `requireOwnership(resource)`; UI gating is cosmetic only.
- Object-level checks: customers can read only their own orders, addresses, wishlists, reviews. Queries always include `customer_id = session.userId` in the WHERE clause (never trust IDs from the client alone).
- Admin RBAC per `08_ECOMMERCE_REQUIREMENTS.md §14`; permissions enumerated in `modules/admin/rbac.ts` as a typed matrix.
- Draft previews use a signed, expiring token tied to the entity ID.
- Cron and feed endpoints require a bearer token (`CRON_SECRET`, `FEED_TOKEN`) compared in constant time; also restricted to Vercel cron user-agent/IPs where possible.

---

## 4. Input validation and output encoding

- **Zod at every boundary:** form data, server action args, route handler bodies, webhook payloads (after signature check), CSV imports, env vars, `homepage_sections.config`.
- Length limits on all text inputs; phone and pincode regex; email normalisation; slugs validated `^[a-z0-9-]+$`.
- **Markdown:** rendered with `remark` → `rehype-sanitize` (custom schema; no raw HTML, no `javascript:` URLs, images only from our storage host). Reviews are plain text with line breaks.
- React escapes by default; `dangerouslySetInnerHTML` only for sanitised Markdown output and JSON-LD (serialised with `<` escaped).
- File uploads: type sniffed server-side (not just extension), size limits, images re-encoded by the pipeline (strips metadata and polyglot payloads), stored under random names.
- Redirects: only to same-origin paths or an allowlist; `redirects.to_path` validated.

---

## 5. Web security headers and CSRF

- **CSP** (report-only first, enforced in Phase 2). Two policies, because per-request nonces are incompatible with statically cached (ISR) pages — a nonce baked into cached HTML is a nonce reused across users, which defeats its purpose:
  - **Dynamic routes** (checkout, account, auth, admin, API): strict policy with per-request nonce via the proxy: `script-src 'nonce-…' 'strict-dynamic' https://checkout.razorpay.com`; `frame-src https://api.razorpay.com https://checkout.razorpay.com`.
  - **Static/ISR storefront routes**: allowlist policy without nonce: `script-src 'self' https://www.googletagmanager.com 'unsafe-inline'` is **avoided** by keeping all inline scripts to Next.js's own hydration payload, which is covered by Next's static hashes where supported; where a hash list is impractical, the storefront uses `script-src 'self' https://www.googletagmanager.com` plus `'unsafe-inline'` as a documented, accepted compromise, mitigated by having **no user-generated HTML** on those pages (sanitised Markdown only) and `object-src 'none'`.
  - Common: `default-src 'self'`; `img-src 'self' data: https://i.ytimg.com`; `connect-src 'self' https://www.google-analytics.com https://lumberjack.razorpay.com`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`. JSON-LD is `type="application/ld+json"` and is never executed, so it needs no allowance. Images are served from our own `/media/` path (ADR-30), so no storage hostname is needed in `img-src`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off), `X-Frame-Options: DENY` (except Razorpay-embedded contexts which use CSP frame-ancestors).
- **CSRF:** Server Actions are protected by Next.js origin/host checks; cookies are `SameSite=Lax`; state-changing route handlers (webhooks excluded) require a same-origin check and are POST-only. Admin forms additionally include a double-submit token (defence in depth).
- Cookies prefixed `__Host-` where possible; no sensitive data in cookies beyond opaque tokens.

---

## 6. Database security (Supabase/Postgres)

- **Roles:** `kesa_app` (application; no superuser; RLS applies; explicit policies), `kesa_migrator` (migrations, CI only), `postgres` (never used by the app). Supabase `service_role` key used **only** for Storage administrative operations and auth admin calls from server code, never for data queries.
- **RLS on every table.** Policies:
  - `anon`: no policies (deny all).
  - `authenticated`: self-scoped read policies on customer-owned tables as defence in depth (`05_DATABASE_DESIGN.md §10`).
  - `kesa_app`: policies granting required access per table (full for application tables). Rationale: keeps RLS as the universal enforcement layer so a future direct-client path cannot bypass it.
- **Supabase Data API:** `public` schema **not exposed** via PostgREST (exposed schemas list empty or a separate empty schema), removing the auto-API attack surface entirely. Realtime disabled.
- Constraints encode invariants (non-negative stock, price ≥ min, enum states, unique SKU/slug/code), so bugs cannot corrupt core data.
- Connection string stored as env var; pooler in transaction mode; `sslmode=require`.
- Backups daily + PITR; restore tested in Phase 2.
- Audit log for all admin mutations; append-only tables (`order_events`, `inventory_movements`, `customer_consents`, `audit_logs`) have no UPDATE/DELETE grants for `kesa_app`.

---

## 7. Payment security

- Server creates the Razorpay order with server-computed `amount`; client receives only `order_id` and public key.
- Success callback: verify `HMAC_SHA256(order_id + "|" + payment_id, key_secret) == signature` before any state change.
- Webhook: verify `X-Razorpay-Signature` over the **raw** body with the webhook secret; reject on mismatch (log `webhook_invalid_signature`); store `provider_event_id` unique; process in a transaction with `SELECT … FOR UPDATE` on the order; return 200 only after commit.
- Amount in webhook compared to order total; mismatch → flag order `needs_review`, do not mark paid.
- **Late success after cancellation:** if `payment.captured` arrives for an order already cancelled (reservation expired, customer abandoned then paid from a stale UPI screen), the handler tries to re-reserve stock and reinstate the order; if stock is gone it auto-initiates a full refund, records the event and notifies the customer and admin. Money must never sit captured against a cancelled order.
- **Double submit:** order placement is idempotent on `orders.idempotency_key`; a repeated submit returns the existing order and its Razorpay order ID.
- Refunds only via admin action with role check and amount ≤ refundable balance; large refunds require Owner/Manager re-auth.
- No card data touches our servers (Razorpay hosted checkout); PCI DSS SAQ-A posture.
- COD abuse controls: phone OTP (P1), cap, outstanding-COD limit, blocklist by hashed phone/address after RTO.

---

## 8. Rate limiting and abuse prevention

| Surface | Limit (proposal) | Mechanism |
|---|---|---|
| Login/OTP request | 5 / 15 min per email, 20 / h per IP | Supabase Auth limits + Vercel WAF rate-limit rule |
| OTP verify | 5 attempts per code | Supabase |
| Coupon apply | 10 / 10 min per cart | Postgres counter (`lib/rate-limit.ts`) |
| Order lookup (guest) | 5 / 10 min per IP | Same |
| Contact/newsletter/review forms | Turnstile + 3 / h per IP | Cloudflare Turnstile (invisible) + limit |
| Search suggest | 60 / min per IP | WAF |
| Checkout place order | 10 / h per session | Postgres counter |
| Admin actions | 300 / min per user | Postgres counter |
| Global | Vercel DDoS mitigation + Firewall managed rules; Attack Mode runbook | Vercel |

Bot management: `robots.txt` honoured by good bots; Vercel BotID (P2) for checkout if abuse appears.

---

## 9. Secrets and configuration

- Secrets only in Vercel environment variables (Production/Preview/Development scopes) and Supabase Vault; `.env.local` for developers (git-ignored); `.env.example` with names only.
- `lib/env.ts` separates `server` and `client` schemas; importing the server schema from a client component fails typecheck/build (`server-only`).
- Secret rotation runbook: Razorpay keys, webhook secret, DB password, `CRON_SECRET`, `FEED_TOKEN`, Resend key, Sentry DSN (public), Supabase anon (public) and service role.
- CI: secret scanning (gitleaks), `pnpm audit --prod`, Dependabot weekly, lockfile integrity.
- Least-privilege third-party keys (Shiprocket API user with only required scopes; Resend domain-scoped key).

---

## 10. Logging, monitoring and incident response

- Logs structured, PII-redacted (`email`, `phone`, `address`, `token`, `authorization` keys masked), retained 30 days in Vercel / log drain.
- Security events: failed logins (aggregate), invalid webhook signatures, role violations, rate-limit hits, CSP violation reports (`/api/csp-report`), unusual refund activity → Sentry alerts to Owner.
- Uptime monitoring on home, a PDP, and `/api/health` (checks DB).
- Incident runbook (Phase 2 doc): contain (Attack Mode, key rotation), assess (logs, audit), notify (customers if PII affected per DPDP timelines), recover (PITR), review.

---

## 11. Privacy and compliance (India)

- DPDP Act 2023: purpose-limited collection, consent records, data principal rights (access, correction, erasure) via account settings and support flow; retention schedule (orders/invoices 8 years for tax; analytics 13 months; abandoned carts 30 days; logs 30 days).
- Consumer Protection (E-Commerce) Rules 2020 disclosures (see content doc).
- Account deletion anonymises PII while retaining financial records.
- Data residency: Supabase Mumbai region; Vercel functions default region set to `bom1` (Mumbai) for latency and locality.

---

## 12. Security testing

- Unit tests: signature verification, RBAC matrix, Zod schemas (negative cases), Markdown sanitiser, redirect allowlist, money math.
- Integration: RLS policy tests (anon cannot read; authenticated reads only own rows), oversell under concurrent reservations, webhook idempotency, state machine guards.
- E2E: unauthenticated access to `/admin` and `/account` redirects; IDOR attempts on order URLs return 404.
- Pre-launch: dependency audit, header scan (securityheaders.com), CSP enforced, manual review of checkout and admin flows against OWASP ASVS L2 checklist; optional external pentest before scaling paid traffic (P2).
