cd /Users/copp1723/Desktop/multi-agent-orchestrator/web-interface

# Kill any existing process on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Set API key
export OPENROUTER_API_KEY="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"

# Install dependencies if needed
[ ! -d "node_modules" ] && npm install

# Start the server
echo "Starting server on http://localhost:8080"
node server-real.js
