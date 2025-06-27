#!/bin/bash

# Dry run - just show what files would be moved
SOURCE_DIR="/Users/copp1723/Desktop/rylie-seo-hub-v2"
DEST_DIR="/Users/copp1723/Desktop/multi-agent-orchestrator"

echo "🔍 Files that will be moved from rylie-seo-hub-v2:"
echo ""

# List all orchestration files that exist
FILES=(
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
    "setup-agents.sh"
    "start-ai.sh"
    "test-ai-setup.sh"
    "test-direct.js"
    "test-models.js"
    "test-openrouter.js"
    "get-all-models.js"
    "list-models.js"
    "available-models.json"
    "AGENT_IMPROVEMENTS.md"
    "MULTI_AGENT_GUIDE.md"
    "HANDOFF_MULTI_AGENT_AI_SYSTEM.md"
    ".master-agent.json"
    ".master-workspace.json"
    ".pending-reviews.json"
    ".agent-analysis.json"
    ".agent-locks.json"
    ".agent-status.json"
    ".ai-plan-TICKET-005.md"
    ".ai-validation-report.json"
    ".master-agent.log"
    "tickets.txt"
    "ticket002_migration.sql"
)

count=0
for file in "${FILES[@]}"; do
    if [ -f "$SOURCE_DIR/$file" ]; then
        echo "  ✓ $file"
        ((count++))
    fi
done

echo ""
echo "Total files to move: $count"
echo "Destination: $DEST_DIR"
