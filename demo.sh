#!/bin/bash
# ════════════════════════════════════════════════════════════════
# GeoShield Live Demo Script for SIH 2026 Judges
# Polished 3-minute walkthrough
# ════════════════════════════════════════════════════════════════
set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          🛡️  GeoShield Live Demo — SIH 2026                ║"
echo "║     AI-Based Landslide Risk Monitoring System              ║"
echo "║         North Eastern Region, India                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Start backend
echo "⚙️  Starting backend server..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend..."
sleep 3

# Check health
if curl -s http://localhost:8000/api/health | grep -q "healthy"; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DEMO SEQUENCE (3 minutes)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "📊 Step 1 (30s): Dashboard Overview"
echo "   → Show 20 stations, risk pie chart, rainfall trends"
echo "   → Point out real satellite data metrics"
echo "   → Open http://localhost:8000"
echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "🗺️  Step 2 (30s): GIS Risk Map"
echo "   → Show interactive map with heatmap"
echo "   → Click Cherrapunji station (known hotspot)"
echo "   → Show road status and village markers"
echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "⚡ Step 3 (60s): Landslide Simulator"
echo "   → Navigate to Simulator page"
echo "   → Select Cherrapunji, intensity = CRITICAL"
echo "   → Click 'Run Simulation'"
echo "   → Show: Risk score spikes to 95+"
echo "   → Show: Alert generated with 12,000+ affected"
echo "   → Show: Contributing factors and recommendation"
echo ""

# Run simulation via API
echo "   🔧 Running simulation via API..."
SIM_RESULT=$(curl -s -X POST http://localhost:8000/api/simulate/landslide \
  -H "Content-Type: application/json" \
  -d '{"station_id": "NER-011", "intensity": "critical"}' \
  2>/dev/null || echo '{}')

if echo "$SIM_RESULT" | grep -q "risk_score"; then
    RISK_SCORE=$(echo "$SIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['risk_assessment']['risk_score'])" 2>/dev/null || echo "N/A")
    echo "   ✅ Simulation complete! Risk score: $RISK_SCORE/100"
else
    echo "   ⚠️  Simulation requires auth. Login as admin first."
fi

echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "🛰️  Step 4 (30s): Satellite Data"
echo "   → Navigate to Satellite Data page"
echo "   → Show real elevation, soil moisture, NDVI"
echo "   → Compare Tawang (2791m) vs Agartala (12m)"
echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "🌐 Step 5 (30s): Multilingual Support"
echo "   → Switch language to Hindi → Bengali → Assamese"
echo "   → Show all labels translate correctly"
echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "📡 Step 6 (30s): Station Deep Dive"
echo "   → Click any station"
echo "   → Show sensor charts, AI gauge, weather data"
echo "   → Show contributing factors and recommendation"
echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "🌊 Step 7 (30s): Flood Risk"
echo "   → Navigate to Flood Risk page"
echo "   → Show 19 districts with flood-landslide correlation"
echo "   → Show scatter plot"
echo ""
read -p "   Press Enter when ready for next step..."

echo ""
echo "🎯 Step 8: Key Metrics"
echo "   → Training Samples: 12,000"
echo "   → Model Accuracy: 78.2%"
echo "   → Stations: 20 across 8 NER states"
echo "   → Languages: 4 (EN, HI, BN, AS)"
echo "   → API Endpoints: 33+"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  🎉 Demo Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Backend running at: http://localhost:8000"
echo "  Press Ctrl+C to stop"
echo ""

# Keep running
wait $BACKEND_PID
