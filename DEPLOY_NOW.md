# 🚀 Deploy GeoShield Now — Complete Guide

## Option 1: Railway (Recommended — 2 minutes)

### Step 1: Login to Railway
```bash
railway login
```
This opens your browser. Login with GitHub.

### Step 2: Create Project
```bash
cd geo-shield
railway init
# Name: geoshield
# Select: "Empty Project"
```

### Step 3: Add Variables
```bash
railway variables set PORT=8000
railway variables set PYTHON_VERSION=3.12
```

### Step 4: Deploy
```bash
railway up
```

### Step 5: Get URL
```bash
railway domain
# Returns: https://geoshield.up.railway.app
```

### Verify
```bash
curl https://geoshield.up.railway.app/api/health
```

---

## Option 2: Render (Free Tier)

### Step 1: Go to Render
1. Open https://render.com
2. Sign up with GitHub
3. Click **"New Web Service"**

### Step 2: Connect Repo
1. Select `officialarghya29/GeoShield`
2. Click **"Connect"**

### Step 3: Configure
- **Name:** geoshield
- **Runtime:** Python 3
- **Build Command:**
  ```
  cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
  ```
- **Start Command:**
  ```
  cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Port:** 8000

### Step 4: Deploy
Click **"Create Web Service"**

### Step 5: Get URL
Your app will be at: `https://geoshield.onrender.com`

---

## Option 3: Docker (Local)

```bash
cd geo-shield
docker build -t geoshield .
docker run -p 8000:8000 geoshield
# Opens at http://localhost:8000
```

---

## Option 4: Local Demo

```bash
cd geo-shield
bash deploy.sh
# Opens at http://localhost:8000
```

---

## Which Should You Choose?

| Option | Best For | Time | Cost |
|--------|----------|------|------|
| **Railway** | Live demo for judges | 2 min | Free tier |
| **Render** | Backup deployment | 5 min | Free tier |
| **Docker** | Local demo | 1 min | Free |
| **Local** | Quick test | 30 sec | Free |

---

## For SIH Demo Day

1. **Deploy to Railway** (get public URL)
2. **Put URL in presentation slides**
3. **Have local backup** (`bash deploy.sh`)
4. **Test the URL** before presenting

---

## Troubleshooting

### Railway Build Fails
```bash
# Make sure Dockerfile is correct
railway logs
```

### Render Sleeps After Inactivity
- Free tier sleeps after 15 min of inactivity
- First request takes 30-60 seconds to wake up
- Consider upgrading to paid tier for demo day

### Local Port Already in Use
```bash
# Kill existing process
pkill -f uvicorn
# Or use different port
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```
