#!/bin/bash
echo "🛡️  GeoShield - Starting Server..."
echo "=================================="

cd "$(dirname "$0")/backend"

# Kill any existing server
pkill -f "uvicorn app.main" 2>/dev/null
sleep 1

# Start server
echo "Starting backend on http://0.0.0.0:8000 ..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start (AI model training may take ~20s)..."
for i in $(seq 1 30); do
    sleep 2
    if curl -s --connect-timeout 2 http://localhost:8000/api/health > /dev/null 2>&1; then
        echo ""
        echo "✅ Server is ready!"
        echo "   🌐 Open http://localhost:8000 in your browser"
        echo "   📊 API docs: http://localhost:8000/docs"
        echo ""
        echo "   Demo logins:"
        echo "   - admin@geoshield.gov.in / admin123"
        echo "   - field@geoshield.gov.in / field123"
        echo "   - citizen@geoshield.gov.in / demo123"
        echo ""
        echo "   Press Ctrl+C to stop the server"
        wait $SERVER_PID
        exit 0
    fi
    echo -n "."
done

echo ""
echo "❌ Server failed to start. Check the logs above."
kill $SERVER_PID 2>/dev/null
exit 1
