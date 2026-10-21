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

## 3. Email (Resend)

Customer emails (order confirmed, shipped, delivered, returns, bag
reminders) do not go out until this is done.

1. **Hardik** confirms the sender address, e.g. `orders@kesalifestyle.com`,
   and whether a real inbox exists for `hello@kesalifestyle.com` (customer
   replies go there).
2. Create a free account at resend.com, add the domain `kesalifestyle.com`,
   copy the DNS records it shows (one DKIM TXT, one MX and one TXT on the
   `send` subdomain, optional DMARC TXT).
3. **Ask Rakesh**: "Who manages DNS for kesalifestyle.com? Please add these
   records and tell me when done." Send him the records from step 2.
4. Click Verify in Resend once the records are live. Create an API key.
5. On the server, in `.env.local`:

```
RESEND_API_KEY=
EMAIL_FROM=Kesa Lifestyle <orders@kesalifestyle.com>
```

6. Deploy. Test: Admin → Orders → a paid order → "Resend confirmation email".

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
- [ ] Admin password: strong, known to two people, stored in a password
      manager (reset with `node scripts/hash-password.mjs "new-password"` →
      `ADMIN_BOOTSTRAP_PASSWORD_HASH` in `.env.local`, deploy).
