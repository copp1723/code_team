#!/bin/bash

# Simple system check and start
cd /Users/copp1723/Desktop/multi-agent-orchestrator

echo "🔍 System Check..."

# Kill existing processes
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Check key files
echo "📁 Checking key files..."
for file in .env src/index.js web-interface/server-real.js; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
  fi
done

# Create logs
mkdir -p logs

# Start web interface
echo "🌐 Starting web interface..."
cd web-interface
node server-real.js &
echo $! > ../web.pid

echo "✅ Started! Check http://localhost:8080"
