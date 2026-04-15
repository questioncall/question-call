# 🚀 Website Deployment Guide
> Deploy a client website using GitHub + Vercel + Cloudflare (for `.edu.np` domain)

---

## 📋 Prerequisites
- Finished website codebase (local)
- GitHub account (yours)
- Vercel account → [vercel.com](https://vercel.com) (sign up free)
- Cloudflare account → [cloudflare.com](https://cloudflare.com) (sign up free)
- `.edu.np` domain registered from Nepal's registrar (Mercantile/NITC)

---

## PHASE 1 — Push Code to GitHub

### Step 1: Initialize Git in your project
Open your project folder in terminal:
```bash
cd your-project-folder
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Create a new GitHub Repository
1. Go to [github.com](https://github.com) → Click **"New"** (green button)
2. Name the repository (e.g. `client-website`)
3. Set it to **Private** (recommended for client work)
4. Do **NOT** initialize with README (you already have code)
5. Click **"Create Repository"**

### Step 3: Push your code to GitHub
Copy the commands GitHub shows you, they will look like:
```bash
git remote add origin https://github.com/YOUR_USERNAME/client-website.git
git branch -M main
git push -u origin main
```

✅ Your code is now on GitHub.

---

## PHASE 2 — Deploy on Vercel

### Step 4: Import your project to Vercel
1. Go to [vercel.com](https://vercel.com) → Click **"Add New Project"**
2. Click **"Import Git Repository"**
3. Connect your GitHub account if not already connected
4. Find your repo (`client-website`) → Click **"Import"**

### Step 5: Configure project settings
- **Framework Preset** → Select your framework (Next.js, React, HTML, etc.)
- **Root Directory** → Leave as `/` unless your code is in a subfolder
- **Build Command** → Usually auto-detected (e.g. `npm run build`)
- **Output Directory** → Usually auto-detected (e.g. `dist` or `.next`)
- Add any **Environment Variables** if your project needs them

### Step 6: Deploy
1. Click **"Deploy"**
2. Wait 1–2 minutes for the build to finish
3. Vercel gives you a free URL like: `client-website.vercel.app`
4. Open it to confirm the site is working ✅

---

## PHASE 3 — Connect Custom Domain via Cloudflare

### Step 7: Add your domain to Cloudflare
1. Go to [cloudflare.com](https://cloudflare.com) → Log in
2. Click **"Add a Site"**
3. Enter your domain: `yourschool.edu.np`
4. Select the **Free plan** → Click **"Continue"**
5. Cloudflare will scan existing DNS records — click **"Continue"**
6. Cloudflare will give you **2 Nameservers**, example:
   ```
   aria.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   📌 **Copy these — you need them in the next step**

### Step 8: Update Nameservers at Nepal Registrar
1. Log in to your Nepal domain registrar portal:
   - Mercantile: [register.com.np](https://register.com.np)
   - or NITC registrar
2. Find your domain → Go to **"Manage Nameservers"** or **"DNS Settings"**
3. Replace the existing nameservers with the **two Cloudflare nameservers** from Step 7
4. Save changes
5. ⏳ Wait **24–48 hours** for propagation (usually faster, around 2–6 hrs)

### Step 9: Get DNS values from Vercel
1. Go back to Vercel → Open your project
2. Go to **Settings → Domains**
3. Click **"Add Domain"** → Enter your domain: `yourschool.edu.np`
4. Vercel will show you DNS records to add, usually:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
   📌 **Copy these values**

### Step 10: Add DNS records in Cloudflare
1. Go to Cloudflare → Your domain → Click **"DNS"** tab
2. Click **"Add Record"** and add the records from Step 9:

   **Record 1 (root domain):**
   | Field | Value |
   |-------|-------|
   | Type | A |
   | Name | @ |
   | IPv4 Address | `76.76.21.21` |
   | Proxy | ✅ Proxied (orange cloud) |

   **Record 2 (www subdomain):**
   | Field | Value |
   |-------|-------|
   | Type | CNAME |
   | Name | www |
   | Target | `cname.vercel-dns.com` |
   | Proxy | ✅ Proxied (orange cloud) |

3. Click **Save** for each record

### Step 11: Verify domain in Vercel
1. Go back to Vercel → **Settings → Domains**
2. Your domain should show ✅ **Valid Configuration** after DNS propagates
3. Vercel auto-generates a free **SSL certificate** (HTTPS) for your domain

---

## PHASE 4 — Hand Off to Client (GitHub)

### Step 12: Transfer repository to client
> Do this after the site is live and confirmed working.

**Option A — Transfer Repo (Simple)**
1. Go to your GitHub repo → **Settings**
2. Scroll to bottom → **"Transfer"**
3. Enter the client's GitHub username or their new account
4. Confirm transfer
5. Go to the transferred repo → **Settings → Collaborators**
6. Add **your GitHub username** as a collaborator (so you keep access)

**Option B — GitHub Organization (Professional)**
1. Ask client to go to GitHub → **"+"** → **"New Organization"**
2. Create org with client's name (free plan is fine)
3. Invite you as **Owner** or **Admin**
4. Transfer the repo into the organization
5. Both you and client have access under the org

---

## PHASE 5 — Future Updates

### How to push updates after handoff:
```bash
# Make changes to code locally
git add .
git commit -m "Updated homepage banner"
git push origin main
```
> Vercel **auto-deploys** every time you push to `main` branch. No manual steps needed. ✅

---

## 🗺️ Quick Summary

```
Your Code (Local)
      ↓  git push
   GitHub Repo
      ↓  auto-connected
     Vercel  ←──── yourschool.edu.np
                         ↑
                    Cloudflare DNS
                         ↑
                  Nepal Registrar (nameservers updated)
```

---

## ❓ Common Issues

| Problem | Fix |
|--------|-----|
| Domain not working after 48hrs | Double-check nameservers are saved correctly at Nepal registrar |
| Vercel shows "Invalid Configuration" | Make sure DNS records in Cloudflare match exactly what Vercel asked for |
| Build fails on Vercel | Check build logs, make sure `npm run build` works locally first |
| SSL not working | Wait a few more hours, Vercel provisions SSL automatically after DNS confirms |
| `www` not redirecting to root | Add both A and CNAME records in Cloudflare as shown in Step 10 |

---

*Guide written for Nepal `.edu.np` domain + GitHub + Vercel + Cloudflare setup.*