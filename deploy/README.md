# Self-hosting Kesa Lifestyle

Runs the whole site on one Linux server with Docker: the Next.js app, a Caddy
reverse proxy that obtains HTTPS certificates automatically, and a small
scheduler that triggers the nightly/hourly jobs. The database, auth and file
storage stay on Supabase; Razorpay, Resend and WhatsApp are unchanged.

```
internet ──443──▶ caddy ──▶ app (Next.js :3000) ──▶ Supabase / Razorpay / Resend
                              ▲
                     scheduler ┘ (job routes, hourly / nightly)
```

## 1. Server prerequisites (one-time, ~15 minutes)

Ubuntu 22.04/24.04 (other distros work the same way). As a sudo user:

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# Firewall: SSH, HTTP, HTTPS only
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable

# Code
sudo mkdir -p /opt/kesa-lifestyle && sudo chown $USER /opt/kesa-lifestyle
git clone https://github.com/shanichaun348-ai/kesa-lifestyle.git /opt/kesa-lifestyle
```

If ports 80/443 are already taken by an nginx that serves other sites, do not
run the `caddy` service: remove it from `docker-compose.yml`, add
`ports: ["127.0.0.1:3000:3000"]` to `app`, and use `deploy/nginx.conf.example`
with certbot instead.

## 2. DNS

Create an **A record** for the site hostname (e.g. `kesa.dev-build.in`)
pointing at the server's public IP. Caddy needs this to resolve before the
first start, or certificate issuance fails (it retries automatically).

## 3. Configuration

```bash
cd /opt/kesa-lifestyle
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production      # fill in every value; same values as Vercel today
chmod 600 deploy/.env.production
```

`SITE_DOMAIN` and `NEXT_PUBLIC_SITE_URL` must match the DNS name. Generate
`CRON_SECRET` and `ADMIN_SESSION_SECRET` with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
(or `openssl rand -hex 32`).

## 4. First deploy

```bash
./deploy/deploy.sh
```

This builds the image (3–6 minutes the first time), starts the three
containers, and waits until `/api/health/` answers. Then open
`https://<SITE_DOMAIN>/` — the certificate is issued on first request.

## 5. Updating

Either push to `main` (the **Deploy to server** GitHub Action runs
`deploy.sh --pull` over SSH once the secrets below exist), or by hand:

```bash
cd /opt/kesa-lifestyle && ./deploy/deploy.sh --pull
```

The old container keeps serving until the new one is healthy, so a failed
build never takes the site down.

### Enabling automatic deploys from GitHub

On the server, create a deploy key and allow it:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/kesa_deploy -N "" -C "github-deploy"
cat ~/.ssh/kesa_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/kesa_deploy            # private key → GitHub secret DEPLOY_SSH_KEY
```

GitHub → repo → Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST` | server IP or hostname |
| Secret | `DEPLOY_USER` | the Linux user that owns `/opt/kesa-lifestyle` |
| Secret | `DEPLOY_SSH_KEY` | contents of `~/.ssh/kesa_deploy` (private key) |
| Secret | `CRON_SECRET` | same value as in `deploy/.env.production` |
| Variable | `SITE_URL` | `https://kesa.dev-build.in` — used by the smoke test, uptime monitor and hourly jobs |
| Variable | `DEPLOY_PATH` | only if not `/opt/kesa-lifestyle` |

## 6. Switching services to the new domain

- **Razorpay** → Settings → Webhooks: change the URL to `https://<domain>/api/webhooks/razorpay/`
- **Supabase** → Authentication → URL Configuration: Site URL and redirect `https://<domain>/auth/callback/**`
- **Resend**: sending domain can stay as it is
- **Google** (Search Console, Merchant Center feed URL) once the domain is final

## 7. Day-to-day

```bash
docker compose ps                      # status + health
docker compose logs -f --tail=200 app  # app logs (JSON lines)
docker compose logs -f caddy           # certificates, requests
docker compose restart app             # restart without rebuilding
docker compose down                    # stop everything (certs persist in volumes)
```

Rollback: `git checkout <previous-sha> && ./deploy/deploy.sh`.

## 8. What the server does NOT hold

No customer data, orders, images or videos live on the server — all of that is
in Supabase and Storage. The only sensitive file is `deploy/.env.production`.
Back up that file somewhere safe; the server itself can be rebuilt from this
README in under an hour.
