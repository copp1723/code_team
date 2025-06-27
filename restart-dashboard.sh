#!/bin/bash

# Restart the Multi-Agent Orchestrator with the correct dashboard
echo "🔄 Restarting Multi-Agent Orchestrator with Master Dashboard"
echo "=========================================================="

cd /Users/copp1723/Desktop/multi-agent-orchestrator

# Kill existing processes
echo "🛑 Stopping existing processes..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
pkill -f "server-real.js" 2>/dev/null || true

sleep 2

# Start with the updated interface
echo "🚀 Starting Master Dashboard..."
cd web-interface

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --silent
fi

# Start the server
echo "🌐 Launching Multi-Agent Orchestrator Dashboard..."
node server-real.js &
WEB_PID=$!

echo "✅ Dashboard started (PID: $WEB_PID)"
echo ""
echo "🎉 Multi-Agent Orchestrator Master Dashboard is now running!"
echo "📊 Access: http://localhost:8080"
echo ""
echo "Features:"
echo "  • Real-time agent monitoring"
echo "  • Interactive Master Agent chat"
echo "  • Workflow orchestration"
echo "  • Ticket management"
echo "  • Resource monitoring"
echo "  • System logs"
echo ""
echo "🛑 To stop: kill $WEB_PID"

# Save PID for management
echo $WEB_PID > ../web.pid

# Test connection
sleep 3
if curl -s "http://localhost:8080" >/dev/null 2>&1; then
    echo "✅ Dashboard is responding and ready!"
else
    echo "⚠️  Dashboard may still be starting up..."
fi

echo ""
echo "🔄 System ready! Your sophisticated Multi-Agent Orchestrator dashboard is now live."
