#!/bin/bash
# GeoShield Deployment Script
# Quick setup and run

set -e

echo "🛡️  GeoShield - Deploying..."
echo "================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.10+"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
NODE_VER=$(node --version)
echo "✅ Python: $PYTHON_VER"
echo "✅ Node.js: $NODE_VER"

# ── Backend ──────────────────────────────────────────────
echo ""
echo "📦 Installing backend dependencies..."

cd backend

# Try to create venv, fall back to --break-system-packages if venv not available
VENV_OK=false
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    if python3 -m venv venv 2>/dev/null; then
        VENV_OK=true
    else
        echo "   ⚠️  python3-venv not available, installing without venv"
        rm -rf venv
    fi
fi

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    VENV_OK=true
fi

# Install dependencies
if [ "$VENV_OK" = true ]; then
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
else
    pip install --upgrade pip --quiet --break-system-packages 2>/dev/null || true
    pip install -r requirements.txt --quiet --break-system-packages
fi

cd ..

# ── Frontend ─────────────────────────────────────────────
echo "📦 Installing & building frontend..."
cd frontend
npm install --silent
npx vite build
cd ..

# ── Start ────────────────────────────────────────────────
echo ""
echo "🚀 Starting GeoShield on port 8000..."
echo "   Open http://localhost:8000 in your browser"
echo "   Login: admin@geoshield.gov.in / admin123"
echo "   Press Ctrl+C to stop"
echo ""

# Start the server
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
