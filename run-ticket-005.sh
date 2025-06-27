#!/bin/bash

# Run AI Agent for TICKET-005 with better error handling

echo "🤖 Running AI Agent for TICKET-005: Add Pre-filled SEO Prompts to Chat"
echo ""

# Set API key
export OPENROUTER_API_KEY="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"

# Change to correct directory
cd /Users/copp1723/Desktop/rylie-seo-hub-v2

# First, let's check if we're on main branch and pull latest
echo "📥 Checking git status..."
git status

echo ""
echo "🚀 Starting AI Agent..."
echo ""

# Run the AI agent
node ai-agent.js TICKET-005 frontend

echo ""
echo "✅ AI Agent completed!"
echo ""
echo "To view the changes:"
echo "  git status"
echo "  git diff"
