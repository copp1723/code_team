#!/bin/bash

echo "🔧 Setting up Multi-Agent System in voice-agent-fresh-main"
echo "========================================================"

# Set variables
SOURCE_DIR="/Users/copp1723/Desktop/multi-agent-orchestrator"
TARGET_DIR="/Users/copp1723/Desktop/voice-agent-fresh-main"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory not found: $TARGET_DIR"
    exit 1
fi

cd "$TARGET_DIR"

echo ""
echo "📋 Copying orchestrator files..."

# Copy the core orchestrator files
cp "$SOURCE_DIR/agent-orchestrator.config.json" . 2>/dev/null || echo "⚠️  agent-orchestrator.config.json not found"
cp "$SOURCE_DIR/master-agent.js" . 2>/dev/null || echo "⚠️  master-agent.js not found"
cp "$SOURCE_DIR/master-agent-config.json" . 2>/dev/null || echo "⚠️  master-agent-config.json not found"
cp "$SOURCE_DIR/master-dispatcher.js" . 2>/dev/null || echo "⚠️  master-dispatcher.js not found"
cp "$SOURCE_DIR/master-workflow.js" . 2>/dev/null || echo "⚠️  master-workflow.js not found"
cp "$SOURCE_DIR/ai-agent.js" . 2>/dev/null || echo "⚠️  ai-agent.js not found"
cp "$SOURCE_DIR/ai-agent-engine.js" . 2>/dev/null || echo "⚠️  ai-agent-engine.js not found"
cp "$SOURCE_DIR/ai-validation-layer.js" . 2>/dev/null || echo "⚠️  ai-validation-layer.js not found"
cp "$SOURCE_DIR/orchestrator.js" . 2>/dev/null || echo "⚠️  orchestrator.js not found"
cp "$SOURCE_DIR/sprint-dependencies.json" . 2>/dev/null || echo "⚠️  sprint-dependencies.json not found"

echo ""
echo "📝 Updating configuration for Python project..."

# Create a Python-specific agent configuration
cat > agent-orchestrator.config.json << 'EOF'
{
  "project": {
    "name": "voice-agent-fresh-main",
    "remote": "https://github.com/yourusername/voice-agent-fresh-main.git",
    "baseBranch": "main",
    "localPath": "/Users/copp1723/Desktop/voice-agent-fresh-main"
  },
  "agents": {
    "frontend": {
      "name": "Frontend Agent",
      "branchPrefix": "feature/frontend",
      "workingPaths": ["static", "templates", "src/ui"],
      "excludePaths": ["src/services", "src/auth", "tests"]
    },
    "backend": {
      "name": "Backend Agent", 
      "branchPrefix": "feature/backend",
      "workingPaths": ["src/services", "src/api", "src/auth"],
      "excludePaths": ["static", "templates", "tests"]
    },
    "database": {
      "name": "Database Agent",
      "branchPrefix": "feature/database",
      "workingPaths": ["src/models", "migrations", "src/db"],
      "excludePaths": ["static", "src/api", "tests"]
    },
    "integration": {
      "name": "Integration Agent",
      "branchPrefix": "feature/integration",
      "workingPaths": [".github/workflows", "scripts", "deploy"],
      "excludePaths": ["src", "tests"]
    },
    "testing": {
      "name": "Testing Agent",
      "branchPrefix": "test",
      "workingPaths": ["tests", "src/**/*.test.py"],
      "excludePaths": []
    }
  },
  "conflictResolution": {
    "autoMergeStrategy": "rebase",
    "conflictHandling": "manual",
    "updateFrequency": "30m",
    "priorityOrder": ["database", "backend", "integration", "frontend", "testing"]
  },
  "communication": {
    "updateChannel": "filesystem",
    "statusFile": ".agent-status.json",
    "lockFile": ".agent-locks.json"
  }
}
EOF

echo "✅ Configuration updated for Python project structure"

echo ""
echo "🔑 Setting up environment..."

# Check for API key
if [ -z "$OPENROUTER_API_KEY" ]; then
    export OPENROUTER_API_KEY="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"
    echo "✅ OpenRouter API key set"
else
    echo "✅ OpenRouter API key already set"
fi

echo ""
echo "🚀 Ready to process tickets!"
echo ""
echo "Next steps:"
echo "1. The wizard should now work with real AI agents"
echo "2. When you click 'Auto-Assign All Tickets', it will actually run"
echo "3. You can monitor progress in the Terminal tab"
echo ""
echo "To test manually:"
echo "  cd $TARGET_DIR"
echo "  node master-agent.js init"
echo "  node ai-agent.js TICKET-001 testing"
