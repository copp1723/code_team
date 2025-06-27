#!/bin/bash

# Script to move all multi-agent orchestration files out of rylie-seo-hub-v2
# and into the dedicated multi-agent-orchestrator directory

SOURCE_DIR="/Users/copp1723/Desktop/rylie-seo-hub-v2"
DEST_DIR="/Users/copp1723/Desktop/multi-agent-orchestrator"

echo "🚀 Moving Multi-Agent Orchestration files from rylie-seo-hub-v2..."
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"
echo ""

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Core agent files
CORE_FILES=(
    "agent-orchestrator.config.json"
    "agent-task.js"
    "ai-agent-engine.js"
    "ai-agent.js"
    "ai-validation-layer.js"
    "ai-workflow.js"
    "analyze-conflicts.js"
    "enhancement-ai-agents.js"
    "enhancement-distributed-orchestration.js"
    "failure-recovery.js"
    "human-oversight.js"
    "master-agent-config.json"
    "master-agent.js"
    "master-dashboard.html"
    "master-dispatcher.js"
    "master-workflow.js"
    "orchestrator.js"
    "resource-monitor.js"
    "sprint-dependencies.json"
    "sprint.js"
)

# Setup and test files
SETUP_FILES=(
    "setup-agents.sh"
    "start-ai.sh"
    "test-ai-setup.sh"
    "test-direct.js"
    "test-models.js"
    "test-openrouter.js"
    "get-all-models.js"
    "list-models.js"
    "available-models.json"
)

# Documentation files
DOC_FILES=(
    "AGENT_IMPROVEMENTS.md"
    "MULTI_AGENT_GUIDE.md"
    "HANDOFF_MULTI_AGENT_AI_SYSTEM.md"
)

# State files
STATE_FILES=(
    ".master-agent.json"
    ".master-workspace.json"
    ".pending-reviews.json"
    ".agent-analysis.json"
    ".agent-locks.json"
    ".agent-status.json"
    ".ai-plan-TICKET-005.md"
    ".ai-validation-report.json"
    ".master-agent.log"
)

# Ticket files
TICKET_FILES=(
    "tickets.txt"
    "ticket002_migration.sql"
)

# Function to move files
move_files() {
    local files=("$@")
    local moved=0
    local skipped=0
    
    for file in "${files[@]}"; do
        if [ -f "$SOURCE_DIR/$file" ]; then
            echo "  ✓ Moving $file"
            mv "$SOURCE_DIR/$file" "$DEST_DIR/"
            ((moved++))
        else
            echo "  ⚠️  Skipping $file (not found)"
            ((skipped++))
        fi
    done
    
    echo "    Moved: $moved, Skipped: $skipped"
    echo ""
}

# Move files by category
echo "📁 Moving core agent files..."
move_files "${CORE_FILES[@]}"

echo "🔧 Moving setup and test files..."
move_files "${SETUP_FILES[@]}"

echo "📚 Moving documentation..."
move_files "${DOC_FILES[@]}"

echo "💾 Moving state files..."
move_files "${STATE_FILES[@]}"

echo "🎫 Moving ticket files..."
move_files "${TICKET_FILES[@]}"

# Update paths in configuration files
echo "🔄 Updating configuration paths..."

# Update agent-orchestrator.config.json if it exists
if [ -f "$DEST_DIR/agent-orchestrator.config.json" ]; then
    echo "  ✓ Updating paths in agent-orchestrator.config.json"
    # Replace rylie-seo-hub-v2 paths with current directory references
    sed -i '' 's|/Users/copp1723/Desktop/rylie-seo-hub-v2|.|g' "$DEST_DIR/agent-orchestrator.config.json"
fi

# Update master-agent-config.json if it exists
if [ -f "$DEST_DIR/master-agent-config.json" ]; then
    echo "  ✓ Updating paths in master-agent-config.json"
    sed -i '' 's|/Users/copp1723/Desktop/rylie-seo-hub-v2|.|g' "$DEST_DIR/master-agent-config.json"
fi

# Create a README for the consolidated orchestrator
echo "📝 Creating README..."
cat > "$DEST_DIR/README.md" << 'EOF'
# Multi-Agent Orchestrator System

This directory contains the complete Multi-Agent Orchestrator system, consolidated from the rylie-seo-hub-v2 project.

## Directory Structure

```
multi-agent-orchestrator/
├── web-interface/          # Web dashboard and UI
├── core agents/           # AI and orchestration files
├── documentation/         # Guides and handoffs
├── scripts/              # Setup and utility scripts
└── state files/          # Runtime state and logs
```

## Quick Start

1. **Launch the Web Interface:**
   ```bash
   cd web-interface
   npm install
   npm start
   ```
   Then open http://localhost:8080

2. **Run AI Workflow:**
   ```bash
   ./start-ai.sh
   ```

3. **Manual Orchestration:**
   ```bash
   node orchestrator.js
   ```

## Key Components

- **Master Agent**: Oversees all operations (`master-agent.js`)
- **AI Agents**: Autonomous code generation (`ai-agent.js`)
- **Orchestrator**: Manages agent coordination (`orchestrator.js`)
- **Web Interface**: Visual dashboard and control panel

## Configuration

- `agent-orchestrator.config.json`: Agent definitions and paths
- `master-agent-config.json`: Master agent settings
- `sprint-dependencies.json`: Ticket dependencies

## Documentation

- `MULTI_AGENT_GUIDE.md`: Complete system guide
- `AGENT_IMPROVEMENTS.md`: Enhancement ideas
- `HANDOFF_MULTI_AGENT_AI_SYSTEM.md`: AI system details
EOF

echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Moved orchestration files to: $DEST_DIR"
echo "  - Updated configuration paths"
echo "  - Created README.md"
echo ""
echo "⚠️  Important next steps:"
echo "  1. Update any remaining hardcoded paths in the moved files"
echo "  2. Test the orchestrator from its new location"
echo "  3. Update the web-interface server paths if needed"
echo "  4. Remove any orchestration-related dependencies from rylie's package.json"
echo ""
echo "🎯 The rylie-seo-hub-v2 project is now clean of orchestration files!"
