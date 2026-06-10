# Deploying Funcle on Ubuntu Linux

## Prerequisites

- An Ubuntu server (20.04 or later) with SSH access
- Node.js is **not** required on the server — Docker handles everything

---

## Step 1 — Install Docker on the server

SSH into your server and run:

```bash
# Install Docker Engine (official one-liner)
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (avoids needing sudo for every command)
sudo usermod -aG docker $USER

# Apply the group change (or log out and log back in)
newgrp docker

# Verify Docker is working
docker --version
docker compose version
```

---

## Step 2 — Copy the project to the server

From your **Windows machine**, open PowerShell in `c:\Users\vince\source\Funcle` and run:

```powershell
# Replace user@your-server-ip with your actual SSH user and server IP
scp -r . user@your-server-ip:~/funcle
```

> **Alternative (recommended for future updates):** Push the code to GitHub first, then on the server run `git clone https://github.com/you/funcle` — makes updates as simple as `git pull && docker compose up -d --build`.

> **Important:** the `backend/.env` file contains local dev secrets and should **not** be relied on in production. Secrets will be set directly on the server in Step 3.

---

## Step 3 — Generate secrets on the server

SSH into the server and run:

```bash
cd ~/funcle

# Node v22 is already installed on this server, so no extra install needed.

# 1. Generate a long random JWT signing secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Hash your chosen admin password — replace 'your-admin-password' with something strong
ADMIN_HASH=$(node -e "const b=require('bcrypt'); b.hash('your-admin-password',10).then(h=>console.log(h))")

# Print them so you can verify
echo "JWT_SECRET=$JWT_SECRET"
echo "ADMIN_PASSWORD=$ADMIN_HASH"
```

> The admin password is what you use to log in at `/admin` to schedule daily puzzles.

---

## Step 4 — Create the production `.env` file

Still on the server:

```bash
cat > ~/funcle/.env << EOF
JWT_SECRET=$JWT_SECRET
ADMIN_PASSWORD=$ADMIN_HASH
EOF

# Restrict access so only your user can read it
chmod 600 ~/funcle/.env
```

Verify it looks correct:

```bash
cat ~/funcle/.env
# Should show two lines: JWT_SECRET=... and ADMIN_PASSWORD=$2b$10$...
```

---

## Step 5 — Build and start the app

```bash
cd ~/funcle

# Build the Docker image and start in the background (-d = detached)
docker compose up -d --build
```

This will:
1. Build the frontend (`npm run build` → static files)
2. Compile the backend (`tsc` → `dist/`)
3. Start the Node server on port 3000 with the SQLite database stored in a persistent Docker volume

Check it started correctly:

```bash
docker compose logs -f
# Press Ctrl+C to stop watching logs
```

You should see: `Funcle backend listening on http://localhost:3000`

---

## Step 6 — Open the firewall port

```bash
sudo ufw allow 3000
sudo ufw status   # confirm port 3000 is listed as allowed
```

If your server is on a **cloud provider** (AWS, DigitalOcean, Linode, etc.), also open port 3000 in the provider's security group or firewall panel (separate from UFW).

---

## Step 7 — Test it

Open a browser on your computer and go to:

```
http://your-server-ip:3000
```

The Funcle game should load. Visit `http://your-server-ip:3000/admin` to log in with the admin password you set in Step 3.

---

## Day-to-Day Commands

All commands run from `~/funcle` on the server:

| Task | Command |
|------|---------|
| Stop the app | `docker compose down` |
| Start the app | `docker compose up -d` |
| Restart the app | `docker compose restart` |
| View live logs | `docker compose logs -f` |
| Update after code change | `docker compose up -d --build` |
| Back up the database | `docker compose cp funcle:/data/funcle.db ./funcle-backup.db` |

---

## Optional — Custom Domain + HTTPS

If you have a domain name pointing to your server, follow these steps to get a proper URL (e.g. `https://funcle.yourdomain.com`) with a free HTTPS certificate.

### Install Nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Create an Nginx config for Funcle

```bash
sudo nano /etc/nginx/sites-available/funcle
```

Paste the following (replace `funcle.yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name funcle.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and close (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Enable the config and get an HTTPS certificate

```bash
sudo ln -s /etc/nginx/sites-available/funcle /etc/nginx/sites-enabled/
sudo nginx -t                           # check for syntax errors
sudo systemctl reload nginx

# Get a free Let's Encrypt certificate (follow the prompts)
sudo certbot --nginx -d funcle.yourdomain.com
```

Certbot will automatically update the Nginx config to redirect HTTP → HTTPS. Your kid can now access the game at `https://funcle.yourdomain.com`.

### Allow Nginx through the firewall

```bash
sudo ufw allow 'Nginx Full'   # allows ports 80 and 443
```

---

## Troubleshooting

**App won't start:**
```bash
docker compose logs funcle
```
Look for `Error:` lines — a missing `JWT_SECRET` or malformed `ADMIN_PASSWORD` hash is a common cause.

**Port 3000 not reachable:**
- Check `sudo ufw status` — port 3000 (or 80/443 if using Nginx) must be listed as `ALLOW`.
- Check your cloud provider's firewall/security group if applicable.

**Rebuild after updating code:**
```bash
git pull                         # if using git
docker compose up -d --build     # rebuild and restart
```

**Restore a database backup:**
```bash
docker compose down
docker compose cp ./funcle-backup.db funcle:/data/funcle.db
docker compose up -d
```
