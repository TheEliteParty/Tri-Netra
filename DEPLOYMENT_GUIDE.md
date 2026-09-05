# 🚀 GeoShield Deployment Guide

## Option 1: Railway (Recommended — Free Tier)

### Steps:
1. Go to https://railway.app and sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `officialarghya29/GeoShield`
4. Railway will auto-detect the Dockerfile and build
5. Set environment variable:
   - Key: `PORT` → Value: `8000`
6. Click **"Deploy"**
7. Your app will be live at `https://your-app-name.up.railway.app`

### Verify:
```
https://your-app-name.up.railway.app/api/health
```

---

## Option 2: Render (Free Tier)

### Steps:
1. Go to https://render.com and sign up with GitHub
2. Click **"New"** → **"Web Service"**
3. Connect `officialarghya29/GeoShield`
4. Configure:
   - **Name:** geoshield
   - **Runtime:** Python 3
   - **Build Command:** `cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt`
   - **Start Command:** `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Port:** 8000
5. Click **"Create Web Service"**
6. Your app will be live at `https://geoshield.onrender.com`

### Verify:
```
https://geoshield.onrender.com/api/health
```

---

## Option 3: Local Demo (Easiest)

```bash
git clone https://github.com/officialarghya29/GeoShield.git
cd GeoShield
bash deploy.sh
# Opens at http://localhost:8000
```

---

## Option 4: Docker

```bash
docker build -t geoshield .
docker run -p 8000:8000 geoshield
# Opens at http://localhost:8000
```

---

## For SIH Demo Day

**Recommended:** Deploy to Railway first, then use the public URL for your demo.

**Backup:** Have the local demo ready with `bash deploy.sh` in case of internet issues.

**Slide Link:** Put the Railway/Render URL in your presentation slides.
