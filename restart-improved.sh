#!/bin/bash

# Kill existing processes and restart with improved WebSocket handling
echo "🔄 Restarting Multi-Agent Orchestrator with improved WebSocket stability"
echo "======================================================================="

cd /Users/copp1723/Desktop/multi-agent-orchestrator

# Kill existing processes more thoroughly
echo "🛑 Stopping all existing processes..."
pkill -f "server-real.js" 2>/dev/null || true
pkill -f "node.*8080" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Wait for processes to fully stop
sleep 3

# Check if port is really free
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
    echo "⚠️  Port 8080 still in use, force killing..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "✅ Cleanup complete"

# Start with better logging
echo "🚀 Starting Multi-Agent Orchestrator Master Dashboard..."
cd web-interface

# Set environment for better debugging
export NODE_ENV=development
export DEBUG=*

# Start the server
node server-real.js &
WEB_PID=$!

echo "📡 Server started (PID: $WEB_PID)"
echo "⏳ Waiting for server to initialize..."

# Wait and test connection
sleep 5

if kill -0 $WEB_PID 2>/dev/null; then
    echo "✅ Server process is running"
    
    # Test HTTP connection
    if curl -s "http://localhost:8080" >/dev/null 2>&1; then
        echo "✅ HTTP server responding"
    else
        echo "⚠️  HTTP server not yet responding"
    fi
    
    # Test WebSocket
    echo "🔗 Testing WebSocket connection..."
    
    echo ""
    echo "🎉 Multi-Agent Orchestrator Master Dashboard is ready!"
    echo "=================================================="
    echo ""
    echo "📊 Dashboard: http://localhost:8080"
    echo "🔗 WebSocket: ws://localhost:8080"
    echo "📡 Server PID: $WEB_PID"
    echo ""
    echo "Features:"
    echo "  ✅ Real-time agent monitoring"
    echo "  ✅ Interactive Master Agent chat"
    echo "  ✅ Improved WebSocket stability"
    echo "  ✅ Automatic reconnection"
    echo "  ✅ Fallback HTTP support"
    echo ""
    echo "🛑 To stop: kill $WEB_PID"
    echo ""
    
    # Save PID for management
    echo $WEB_PID > ../web.pid
    
    # Show the URL prominently
    echo "🌐 Open in browser: http://localhost:8080"
    
else
    echo "❌ Server failed to start"
    echo "📝 Check the logs for errors"
fi
