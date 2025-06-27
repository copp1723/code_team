#!/bin/bash

echo "🚀 Starting Multi-Agent Orchestrator (REAL MODE)"
echo "=============================================="

# Navigate to project root
cd /Users/copp1723/Desktop/multi-agent-orchestrator

# Kill any existing processes
echo "🧹 Cleaning up..."
pkill -f "server.js" 2>/dev/null || true
pkill -f "server-real.js" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 2

# Start the actual orchestrator
echo "🤖 Starting orchestrator components..."

# 1. Start the web interface with the real server
cd web-interface
echo "🌐 Starting web interface..."

# Check which server file to use
if [ -f "server-real.js" ]; then
    node server-real.js &
else
    node server.js &
fi

WEB_PID=$!
cd ..

sleep 3

# 2. Start the main orchestrator if it exists
if [ -f "src/index.js" ]; then
    echo "🎯 Starting main orchestrator..."
    node src/index.js > logs/orchestrator.log 2>&1 &
    ORCH_PID=$!
fi

# 3. Initialize agents if launch.js exists
if [ -f "launch.js" ]; then
    echo "🤖 Initializing agents..."
    node launch.js init-agents &
fi

echo ""
echo "✅ SYSTEM STARTED!"
echo "=================="
echo ""
echo "🌐 Open in browser:"
echo "   Main Dashboard: http://localhost:8080"
echo "   Workflow UI: http://localhost:8080/workflow-ui.html"
echo ""
echo "📝 To use the system:"
echo "   1. Upload your task files in the Workflow UI"
echo "   2. Click 'Start AI Agents'"
echo "   3. Watch agents work on your tasks"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo ""

# Keep running and show any errors
tail -f web-interface/server.log 2>/dev/null || wait