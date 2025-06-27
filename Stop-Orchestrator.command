#!/bin/bash

echo "🛑 Stopping Multi-Agent Orchestrator..."
echo ""

# Find and kill the process
PID=$(lsof -ti:8080)

if [ -z "$PID" ]; then
    echo "✅ No orchestrator server is running"
else
    kill -9 $PID
    echo "✅ Stopped server (PID: $PID)"
fi

echo ""
echo "You can now restart the orchestrator by double-clicking Launch-Orchestrator.command"
