#!/bin/bash

# Multi-Agent Orchestrator - Restart Script
# Stops all services and restarts them

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔄 Restarting Multi-Agent Orchestrator..."
echo "======================================="

# Stop existing services
"$PROJECT_ROOT/scripts/stop.sh"

echo ""
echo "Waiting 3 seconds before restart..."
sleep 3

# Start services
"$PROJECT_ROOT/scripts/launch.sh"
