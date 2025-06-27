#!/bin/bash

# Manual System Startup
echo "🚀 Starting Multi-Agent Orchestrator..."

# Change to project directory
cd /Users/copp1723/Desktop/multi-agent-orchestrator

# Kill existing processes
echo "🛑 Stopping existing processes..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Create logs directory
mkdir -p logs

# Start web interface directly
echo "🌐 Starting web interface..."
cd web-interface

# Start web server
node server-real.js &
WEB_PID=$!

echo "✅ Web interface started with PID: $WEB_PID"
echo "📊 Dashboard should be available at: http://localhost:8080"

# Save PID for later cleanup
echo $WEB_PID > ../web.pid

# Give it a moment to start
sleep 3

# Check if it's running
if kill -0 $WEB_PID 2>/dev/null; then
    echo "✅ Web interface is running successfully!"
    echo ""
    echo "🎉 System is ready!"
    echo "📍 Access: http://localhost:8080"
    echo "🛑 To stop: kill $WEB_PID"
    echo ""
    echo "Logs will be shown below (Ctrl+C to exit):"
    echo "----------------------------------------"
    
    # Show logs
    tail -f ../logs/web-interface.log 2>/dev/null &
    wait $WEB_PID
else
    echo "❌ Web interface failed to start"
fi
