#!/bin/bash

echo "🔧 Setting up Multi-Agent System in target repository"
echo "===================================================="

# Get target directory from command line or use default
TARGET_DIR="${1:-/Users/copp1723/Desktop/voice-agent-fresh-main}"

# Source directory is rylie-seo-hub-v2 where the files actually are
SOURCE_DIR="/Users/copp1723/Desktop/rylie-seo-hub-v2"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory not found: $TARGET_DIR"
    exit 1
fi

cd "$TARGET_DIR"

echo ""
echo "📋 Copying orchestrator files from rylie-seo-hub-v2..."

# Copy the core orchestrator files
cp "$SOURCE_DIR/agent-orchestrator.config.json" . 2>/dev/null && echo "✅ agent-orchestrator.config.json" || echo "❌ agent-orchestrator.config.json not found"
cp "$SOURCE_DIR/master-agent.js" . 2>/dev/null && echo "✅ master-agent.js" || echo "❌ master-agent.js not found"
cp "$SOURCE_DIR/master-agent-config.json" . 2>/dev/null && echo "✅ master-agent-config.json" || echo "❌ master-agent-config.json not found"
cp "$SOURCE_DIR/master-dispatcher.js" . 2>/dev/null && echo "✅ master-dispatcher.js" || echo "❌ master-dispatcher.js not found"
cp "$SOURCE_DIR/master-workflow.js" . 2>/dev/null && echo "✅ master-workflow.js" || echo "❌ master-workflow.js not found"
cp "$SOURCE_DIR/ai-agent.js" . 2>/dev/null && echo "✅ ai-agent.js" || echo "❌ ai-agent.js not found"
cp "$SOURCE_DIR/ai-agent-engine.js" . 2>/dev/null && echo "✅ ai-agent-engine.js" || echo "❌ ai-agent-engine.js not found"
cp "$SOURCE_DIR/ai-validation-layer.js" . 2>/dev/null && echo "✅ ai-validation-layer.js" || echo "❌ ai-validation-layer.js not found"
cp "$SOURCE_DIR/orchestrator.js" . 2>/dev/null && echo "✅ orchestrator.js" || echo "❌ orchestrator.js not found"
cp "$SOURCE_DIR/sprint-dependencies.json" . 2>/dev/null && echo "✅ sprint-dependencies.json" || echo "❌ sprint-dependencies.json not found"
cp "$SOURCE_DIR/agent-task.js" . 2>/dev/null && echo "✅ agent-task.js" || echo "❌ agent-task.js not found"
cp "$SOURCE_DIR/resource-monitor.js" . 2>/dev/null && echo "✅ resource-monitor.js" || echo "❌ resource-monitor.js not found"
cp "$SOURCE_DIR/human-oversight.js" . 2>/dev/null && echo "✅ human-oversight.js" || echo "❌ human-oversight.js not found"
cp "$SOURCE_DIR/failure-recovery.js" . 2>/dev/null && echo "✅ failure-recovery.js" || echo "❌ failure-recovery.js not found"

echo ""
echo "✅ Files copied to $TARGET_DIR"
echo ""
echo "Now the orchestrator is available in your target repository!"
echo "You can use the web interface to manage this repo."
