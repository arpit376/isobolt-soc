# Deploying IsoBolt SOC to Render (Free)

**TelcoLearn 2026** — Host your telecom SOC demo on a public URL for free.

---

## What You Need

- A **GitHub** account (free)
- A **Render** account (free) — sign up at https://render.com

That's it. No credit card needed.

---

## Step-by-Step Deployment

### 1. Push to GitHub

```bash
# Extract the project
tar xzf isobolt-soc.tar.gz
cd isobolt-soc

# Initialize git
git init
git add .
git commit -m "IsoBolt SOC — TelcoLearn 2026"

# Create a repo on GitHub (can be private), then push
git remote add origin https://github.com/YOUR_USERNAME/isobolt-soc.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if you haven't already
4. Select the **isobolt-soc** repository
5. Render will auto-detect the `Dockerfile` — configure:

   | Setting       | Value                        |
   |---------------|------------------------------|
   | Name          | `isobolt-soc`                |
   | Region        | Closest to you (e.g. Singapore) |
   | Instance Type | **Free**                     |
   | Branch        | `main`                       |

6. Click **"Create Web Service"**

Render will now:
- Pull your code
- Build the Docker image (compiles C++ engines, installs npm, builds React)
- Deploy and give you a public URL like: **https://isobolt-soc.onrender.com**

Build takes about 2-3 minutes on first deploy.

### 3. Share the URL

Send `https://isobolt-soc.onrender.com` to the Microscan team.
The C++ engines run live on the server — their browser gets real-time data via WebSocket.

---

## Important Notes About the Free Tier

**Spin-down:** Render free tier spins down after 15 minutes of inactivity.
The first visit after idle takes ~30 seconds to wake up. After that it's instant.

**Tip for demo day:** Open the URL yourself 2 minutes before the call so it's
already warm when the client visits.

**Uptime:** Free tier gives you 750 hours/month — plenty for demos. The service
stays live as long as someone is using it.

---

## Alternative: One-Click Deploy with render.yaml

The project includes a `render.yaml` blueprint. You can also deploy by:

1. Pushing to GitHub
2. Going to https://dashboard.render.com/select-repo?type=blueprint
3. Selecting the repo — Render reads `render.yaml` and configures everything automatically

---

## Updating After Changes

Any push to `main` triggers an automatic redeploy:

```bash
# Make your changes, then
git add .
git commit -m "Updated dashboard"
git push
```

Render rebuilds and deploys in ~2 minutes.

---

## Custom Domain (Optional)

On Render's free tier you can add a custom domain:

1. Go to your service → **Settings** → **Custom Domains**
2. Add `soc.telcolearn.com` (or whatever you want)
3. Update your DNS with the CNAME record Render provides

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check Render logs — usually a missing dependency |
| WebSocket not connecting | Ensure you're using `https://` not `http://` — Render forces HTTPS |
| Site shows "Service Unavailable" | It's spinning up — wait 30 seconds and refresh |
| C++ simulator not starting | Check Render logs for compilation errors |

---

**TelcoLearn 2026** · www.TelcoLearn.com
