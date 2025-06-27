#!/bin/bash

# Quick system verification and launch
echo "🔥 MULTI-AGENT ORCHESTRATOR - INSTANT LAUNCH"
echo "==========================================="

cd /Users/copp1723/Desktop/multi-agent-orchestrator

# Kill existing and start fresh
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Quick start web interface
cd web-interface
echo "🚀 Starting web interface..."
node server-real.js &
WEB_PID=$!

echo "✅ Started! PID: $WEB_PID"
echo "🌐 Dashboard: http://localhost:8080"

# Quick test
sleep 3
if kill -0 $WEB_PID 2>/dev/null; then
    echo "✅ SYSTEM IS RUNNING!"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Open your browser"
    echo "2. Go to: http://localhost:8080"
    echo "3. Use the Multi-Agent Orchestrator dashboard"
    echo ""
    echo "🛑 To stop: kill $WEB_PID"
else
    echo "❌ Failed to start"
fi
