# Launch to-do (kesalifestyle.com)

Written 22 Oct 2026. Everything here is what still needs a human; the code side
of the security audit is done (commit `60147a9`). Do the sections in order.
Never paste keys, secrets or passwords into Slack or into this file.

Deploy command (run on the server after every change below that touches
`.env.local` or after a `git push`):

```
cd /var/www/html/kesa-lifestyle && ./scripts/deploy.sh
```

---

## 1. Server env (do this first, 10 minutes)

The live server was built with the staging address, so every canonical link,
the sitemap, email links and robots.txt still say `kesa-lifestyle.dev-build.in`.
Google stays blocked until this is fixed **and** the site is rebuilt.

In WinSCP → Commands → Open in PuTTY, then:

```
cd /var/www/html/kesa-lifestyle
cp .env.local .env.local.bak
openssl rand -hex 24
nano .env.local
```

- Copy the random string the third command prints; that is your `CRON_SECRET`.
- In nano: change `NEXT_PUBLIC_SITE_URL` to `https://kesalifestyle.com`.
- Add a line `CRON_SECRET=<the random string>`.
- Save: Ctrl+O, Enter, then Ctrl+X.
- Rebuild: `./scripts/deploy.sh`
- Check: `curl -s https://kesalifestyle.com/robots.txt` must show `Allow: /`, not `Disallow: /`.
  `curl -s https://kesalifestyle.com/sitemap.xml | head -5` must show `kesalifestyle.com` links.

Same values in two more places:

- **GitHub** → repo → Settings → Secrets and variables → Actions
  - Secret `CRON_SECRET` = the random string
  - Variable `SITE_URL` = `https://kesalifestyle.com`
  - Then Actions → "Stale-order cleanup" → Run workflow, confirm it is green.
- **Supabase** → Authentication → URL Configuration
  - Site URL: `https://kesalifestyle.com`
  - Redirect URLs: add `https://kesalifestyle.com/auth/callback/**`

Optional, for auto-deploy on every push (same GitHub secrets page):

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST` | server IP |
| Secret | `DEPLOY_USER` | `root` |
| Secret | `DEPLOY_SSH_KEY` | a private key whose public half is in `/root/.ssh/authorized_keys` |
| Variable | `DEPLOY_PATH` | `/var/www/html/kesa-lifestyle` |

Tell the developer before adding these: the workflow still calls the Docker
script and must be pointed at `scripts/deploy.sh` first.

---

## 2. Razorpay (ask the account owner)

1. Is KYC complete and the account activated for live payments? Live keys
   cannot be generated before that.
2. Live **Key ID** and **Key Secret**: Settings → API Keys → Generate Live Key.
   Share the secret once, privately.
3. A live **webhook**: Settings → Webhooks → Add
   - URL: `https://kesalifestyle.com/api/webhooks/razorpay/`
   - Events: `payment.captured`, `payment.failed`
   - The webhook secret they typed.
4. Payment methods enabled: UPI, cards, netbanking, wallets.
   Payment capture setting: **automatic**.
5. Settlement bank account added; note the settlement cycle.
6. Brand name and logo set under checkout configuration, so the popup says
   "Kesa Lifestyle".
7. Add Kishan and Hardik as team members on the dashboard.

Then on the server, in `.env.local`:

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=   # same value as RAZORPAY_KEY_ID
```

Deploy, then place one real ₹10 order on a phone and refund it from the
Razorpay dashboard. Check the order shows as PAID in Admin → Orders.

---

## 3. Email (Resend) — DONE 26 Oct

Live: domain `kesalifestyle.com` verified in Resend (team openmalo.apps,
region Tokyo, click/open tracking off), DNS records added by Rakesh
(DKIM TXT `resend._domainkey`, CNAMEs `rsend` and `send`), server
`.env.local` has `RESEND_API_KEY`, `EMAIL_FROM="Kesa Lifestyle
<orders@kesalifestyle.com>"` and `ORDER_NOTIFY_EMAIL=orders@kesalifestyle.com`.
Test on order KL-6 reached a Gmail inbox, not spam.

Still open:

- [ ] **Hardik**: does `orders@kesalifestyle.com` exist as a mailbox in
      Google Workspace (the domain's MX points at Google)? Customer replies
      and the internal new-order copy go there. If not, create it or tell
      the developer which address to use (one-line change in `.env.local`).
- [ ] Add Hardik to the Resend team (Settings → Team) so the account is not
      tied to one person.
- [ ] Rotate the Resend API key if the first key was ever shown on a shared
      screen (API keys → delete `kesa-website` → create again → update
      `RESEND_API_KEY` → deploy).

---

## 4. WhatsApp (Meta Cloud API) — later

1. Meta Business Suite: create a WhatsApp Business account, add the shop
   number (a number already on the WhatsApp app must be migrated first).
2. WhatsApp Manager → Message templates → Create. Category **Utility**,
   language English. Needed templates: order confirmed, COD order confirmed,
   shipped, delivered. Body for `order_confirmed`:

   ```
   Hi {{1}}, thank you for shopping with Kesa Lifestyle. Your order {{2}} is confirmed and we have received your payment of {{3}} for {{4}}. We will message you again when it ships.
   ```

   Sample values for review: `Priya`, `KL-1042`, `₹1,299`, `Pearl Drop Earrings × 1`.
3. Business Settings → System users → create a system user (Admin role),
   assign the WhatsApp app, generate a **permanent** token.
4. WhatsApp Manager → Phone numbers → copy the Phone number ID.
5. On the server, in `.env.local`:

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ORDER_TEMPLATE=order_confirmed
WHATSAPP_COD_ORDER_TEMPLATE=
WHATSAPP_SHIPPED_TEMPLATE=
WHATSAPP_DELIVERED_TEMPLATE=
```

6. Deploy. Test: Admin → Orders → a paid order → "Resend WhatsApp confirmation".

No MCP or extra connector is needed for customers to receive messages.

---

## 5. Google

Why "Kesa lifestyle" shows nothing on Google today:

- robots.txt has said "do not index" since launch (fixed in code; takes
  effect after section 1).
- The domain is days old and Google has not been told it exists.
- No Search Console property yet.

After section 1 is done:

1. Go to search.google.com/search-console, add property `kesalifestyle.com`
   (Domain type). Verify with the DNS TXT record it shows (Rakesh adds it).
2. Sitemaps → submit `https://kesalifestyle.com/sitemap.xml`.
3. URL inspection → `https://kesalifestyle.com/` → Request indexing.
4. Expect the homepage within days and products within weeks.
5. Optional: Google Business Profile for the brand name, Google Analytics 4
   (set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` in `.env.local`, deploy) for
   visitor detail beyond the admin dashboard count.

---

## 6. Remaining before customers

- [ ] Grievance officer name and contact, registered address, GST number in
      the legal pages (Hardik to supply; developer edits `src/lib/site.ts`).
- [ ] Remove the ₹1.99 test product and any test orders.
- [ ] Confirm shipping fee: ₹59 or ₹79.
- [ ] Supabase Pro for daily backups.
- [ ] Full test on a phone: browse → add to bag → checkout (online and COD)
      → confirmation email/WhatsApp → admin marks shipped → delivered →
      return request.
- [ ] Admin password: a temporary one was set on the server on 26 Oct
      (login `hello@kesalifestyle.com`). Replace it with a strong one known
      to two people and stored in a password manager. Reset with
      `node scripts/hash-password.mjs 'new-password'` (single quotes, the
      password may contain `# Launch to-do (kesalifestyle.com)

Written 22 Oct 2026. Everything here is what still needs a human; the code side
of the security audit is done (commit `60147a9`). Do the sections in order.
Never paste keys, secrets or passwords into Slack or into this file.

Deploy command (run on the server after every change below that touches
`.env.local` or after a `git push`):

```
cd /var/www/html/kesa-lifestyle && ./scripts/deploy.sh
```

---

## 1. Server env (do this first, 10 minutes)

The live server was built with the staging address, so every canonical link,
the sitemap, email links and robots.txt still say `kesa-lifestyle.dev-build.in`.
Google stays blocked until this is fixed **and** the site is rebuilt.

In WinSCP → Commands → Open in PuTTY, then:

```
cd /var/www/html/kesa-lifestyle
cp .env.local .env.local.bak
openssl rand -hex 24
nano .env.local
```

- Copy the random string the third command prints; that is your `CRON_SECRET`.
- In nano: change `NEXT_PUBLIC_SITE_URL` to `https://kesalifestyle.com`.
- Add a line `CRON_SECRET=<the random string>`.
- Save: Ctrl+O, Enter, then Ctrl+X.
- Rebuild: `./scripts/deploy.sh`
- Check: `curl -s https://kesalifestyle.com/robots.txt` must show `Allow: /`, not `Disallow: /`.
  `curl -s https://kesalifestyle.com/sitemap.xml | head -5` must show `kesalifestyle.com` links.

Same values in two more places:

- **GitHub** → repo → Settings → Secrets and variables → Actions
  - Secret `CRON_SECRET` = the random string
  - Variable `SITE_URL` = `https://kesalifestyle.com`
  - Then Actions → "Stale-order cleanup" → Run workflow, confirm it is green.
- **Supabase** → Authentication → URL Configuration
  - Site URL: `https://kesalifestyle.com`
  - Redirect URLs: add `https://kesalifestyle.com/auth/callback/**`

Optional, for auto-deploy on every push (same GitHub secrets page):

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST` | server IP |
| Secret | `DEPLOY_USER` | `root` |
| Secret | `DEPLOY_SSH_KEY` | a private key whose public half is in `/root/.ssh/authorized_keys` |
| Variable | `DEPLOY_PATH` | `/var/www/html/kesa-lifestyle` |

Tell the developer before adding these: the workflow still calls the Docker
script and must be pointed at `scripts/deploy.sh` first.

---

## 2. Razorpay (ask the account owner)

1. Is KYC complete and the account activated for live payments? Live keys
   cannot be generated before that.
2. Live **Key ID** and **Key Secret**: Settings → API Keys → Generate Live Key.
   Share the secret once, privately.
3. A live **webhook**: Settings → Webhooks → Add
   - URL: `https://kesalifestyle.com/api/webhooks/razorpay/`
   - Events: `payment.captured`, `payment.failed`
   - The webhook secret they typed.
4. Payment methods enabled: UPI, cards, netbanking, wallets.
   Payment capture setting: **automatic**.
5. Settlement bank account added; note the settlement cycle.
6. Brand name and logo set under checkout configuration, so the popup says
   "Kesa Lifestyle".
7. Add Kishan and Hardik as team members on the dashboard.

Then on the server, in `.env.local`:

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=   # same value as RAZORPAY_KEY_ID
```

Deploy, then place one real ₹10 order on a phone and refund it from the
Razorpay dashboard. Check the order shows as PAID in Admin → Orders.

---

## 3. Email (Resend) — DONE 26 Oct

Live: domain `kesalifestyle.com` verified in Resend (team openmalo.apps,
region Tokyo, click/open tracking off), DNS records added by Rakesh
(DKIM TXT `resend._domainkey`, CNAMEs `rsend` and `send`), server
`.env.local` has `RESEND_API_KEY`, `EMAIL_FROM="Kesa Lifestyle
<orders@kesalifestyle.com>"` and `ORDER_NOTIFY_EMAIL=orders@kesalifestyle.com`.
Test on order KL-6 reached a Gmail inbox, not spam.

Still open:

- [ ] **Hardik**: does `orders@kesalifestyle.com` exist as a mailbox in
      Google Workspace (the domain's MX points at Google)? Customer replies
      and the internal new-order copy go there. If not, create it or tell
      the developer which address to use (one-line change in `.env.local`).
- [ ] Add Hardik to the Resend team (Settings → Team) so the account is not
      tied to one person.
- [ ] Rotate the Resend API key if the first key was ever shown on a shared
      screen (API keys → delete `kesa-website` → create again → update
      `RESEND_API_KEY` → deploy).

---

## 4. WhatsApp (Meta Cloud API) — later

1. Meta Business Suite: create a WhatsApp Business account, add the shop
   number (a number already on the WhatsApp app must be migrated first).
2. WhatsApp Manager → Message templates → Create. Category **Utility**,
   language English. Needed templates: order confirmed, COD order confirmed,
   shipped, delivered. Body for `order_confirmed`:

   ```
   Hi {{1}}, thank you for shopping with Kesa Lifestyle. Your order {{2}} is confirmed and we have received your payment of {{3}} for {{4}}. We will message you again when it ships.
   ```

   Sample values for review: `Priya`, `KL-1042`, `₹1,299`, `Pearl Drop Earrings × 1`.
3. Business Settings → System users → create a system user (Admin role),
   assign the WhatsApp app, generate a **permanent** token.
4. WhatsApp Manager → Phone numbers → copy the Phone number ID.
5. On the server, in `.env.local`:

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ORDER_TEMPLATE=order_confirmed
WHATSAPP_COD_ORDER_TEMPLATE=
WHATSAPP_SHIPPED_TEMPLATE=
WHATSAPP_DELIVERED_TEMPLATE=
```

6. Deploy. Test: Admin → Orders → a paid order → "Resend WhatsApp confirmation".

No MCP or extra connector is needed for customers to receive messages.

---

## 5. Google

Why "Kesa lifestyle" shows nothing on Google today:

- robots.txt has said "do not index" since launch (fixed in code; takes
  effect after section 1).
- The domain is days old and Google has not been told it exists.
- No Search Console property yet.

After section 1 is done:

1. Go to search.google.com/search-console, add property `kesalifestyle.com`
   (Domain type). Verify with the DNS TXT record it shows (Rakesh adds it).
2. Sitemaps → submit `https://kesalifestyle.com/sitemap.xml`.
3. URL inspection → `https://kesalifestyle.com/` → Request indexing.
4. Expect the homepage within days and products within weeks.
5. Optional: Google Business Profile for the brand name, Google Analytics 4
   (set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` in `.env.local`, deploy) for
   visitor detail beyond the admin dashboard count.

---

## 6. Remaining before customers

- [ ] Grievance officer name and contact, registered address, GST number in
      the legal pages (Hardik to supply; developer edits `src/lib/site.ts`).
- [ ] Remove the ₹1.99 test product and any test orders.
- [ ] Confirm shipping fee: ₹59 or ₹79.
- [ ] Supabase Pro for daily backups.
- [ ] Full test on a phone: browse → add to bag → checkout (online and COD)
      → confirmation email/WhatsApp → admin marks shipped → delivered →
      return request.
) → `ADMIN_BOOTSTRAP_PASSWORD_HASH` in
      `.env.local`, deploy. Note: admin login reads only these env values;
      the server and any other deployment each have their own copy.

---

## 7. Tracking (Hardik's list, 23 Oct)

All five are code-ready. Each needs one ID in `.env.local`, then `./scripts/deploy.sh`
(they are `NEXT_PUBLIC_*`, so a rebuild is required). The cookie banner appears
automatically once any of them is set; tags stay silent until the visitor accepts.

| Item | Where to get the ID | Env line |
|---|---|---|
| Google Analytics | analytics.google.com → Admin → Create property "Kesa Lifestyle" (India, INR) → Web stream `https://kesalifestyle.com` → Measurement ID `G-…` | `NEXT_PUBLIC_GA4_MEASUREMENT_ID="G-XXXXXXXXXX"` |
| Search Console + GA | search.google.com/search-console → Add property `kesalifestyle.com` (Domain) → DNS TXT via Rakesh. Then in GA4: Admin → Product links → Search Console links → Link. | none |
| Sitemap | Already served at `/sitemap.xml`. After section 1, Search Console → Sitemaps → submit `https://kesalifestyle.com/sitemap.xml`. | none |
| Meta Pixel | business.facebook.com → Events Manager → Connect data sources → Web → name "Kesa website" → copy the Dataset / Pixel ID (digits). No developer account needed. | `NEXT_PUBLIC_META_PIXEL_ID="123456789012345"` |
| Microsoft Clarity | clarity.microsoft.com → sign in (Microsoft/Google) → Add new project "Kesa Lifestyle", site `kesalifestyle.com` → Settings → Overview → Project ID. | `NEXT_PUBLIC_CLARITY_PROJECT_ID="abcdefghij"` |

Pixel events sent (SKU as content id): PageView, ViewContent, Search, AddToCart,
AddToWishlist, InitiateCheckout, AddPaymentInfo, Purchase (eventID = order number).

Verify after deploy: Events Manager → Test events, open the site, accept the
banner, click a product → ViewContent appears. Clarity shows the first session
within a few minutes. GA4 → Reports → Realtime shows the visit.

---

## 8. Meta Ads MCP (connect Claude to the ad account)

Done once per machine. The ad account must exist first (adsmanager.facebook.com)
and the Facebook user must have access to it (Business Settings → People).

```
claude mcp add --transport http --scope user meta-ads https://mcp.facebook.com/ads
claude
/mcp   → meta-ads → Authenticate → Facebook login → Edit settings → tick business + ad account → Continue
```

Leave the terminal on the Authenticate screen until the browser says
"Authentication successful". Check with: "List my Meta ad accounts".

Spend safety: Meta Business Suite → Settings → Integrations → Ads MCP server →
set a budget cap and require approval for new campaigns. Anything Claude
creates starts paused.
