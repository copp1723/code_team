#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('../../config'); // Jules: Added: Use new config module

class AgentTaskRunner {
  constructor() {
    // Jules: Removed: Old config loading
    this.projectPath = config.get('projectPath');
  }

  async selectAgent() {
    const agentDefinitions = config.get('agents.definitions'); // Jules: Changed: Use new config structure
    const agents = Object.entries(agentDefinitions);
    
    console.log('\n🤖 Select an agent:');
    agents.forEach(([key, agentConfig], index) => { // Jules: Changed: agent to agentConfig for clarity
      console.log(`  ${index + 1}. ${agentConfig.name || key} (${key})`); // Jules: Changed: Use agentConfig.name
    });
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('\nEnter number: ', (answer) => {
        rl.close();
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < agents.length) {
          resolve(agents[index][0]);
        } else {
          console.error('Invalid selection');
          process.exit(1);
        }
      });
    });
  }

  async getTaskId() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('\n📝 Enter task ID (e.g., fix-navbar, add-auth, update-schema): ', (answer) => {
        rl.close();
        if (answer.trim()) {
          resolve(answer.trim().toLowerCase().replace(/\s+/g, '-'));
        } else {
          console.error('Task ID is required');
          process.exit(1);
        }
      });
    });
  }

  generateTaskScript(agentKey, taskId) {
    const agentConfig = config.get(`agents.definitions.${agentKey}`); // Jules: Changed: Use new config structure
    const branchName = `${agentConfig.branchPrefix}/${taskId}`;
    const projectMasterBranch = config.get('projectMasterBranch'); // Jules: Added: Get master branch from config
    
    const script = `#!/bin/bash
# Auto-generated script for ${agentConfig.name || agentKey} - Task: ${taskId}
# Generated at: ${new Date().toISOString()}

set -e  # Exit on error

PROJECT_PATH="${this.projectPath}"
BRANCH_NAME="${branchName}"
AGENT_KEY="${agentKey}"

cd "$PROJECT_PATH"

echo "🚀 Starting ${agentConfig.name || agentKey} on task: ${taskId}"

# 1. Ensure we're on the latest base branch
echo "📥 Fetching latest changes..."
git fetch origin

# 2. Create and switch to agent branch
echo "🌿 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" "origin/${projectMasterBranch}"

# 3. Create work boundaries file
cat > .agent-work-boundaries.json << EOF
{
  "agent": "${agentKey}",
  "taskId": "${taskId}",
  "branch": "$BRANCH_NAME",
  "allowedPaths": ${JSON.stringify(agentConfig.workingPaths, null, 2)},
  "excludedPaths": ${JSON.stringify(agentConfig.excludePaths || [], null, 2)}, # Jules: Added: Handle potentially undefined excludePaths
  "startTime": "${new Date().toISOString()}"
}
EOF

# 4. Set up pre-commit hook to enforce boundaries
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Pre-commit hook to enforce agent boundaries

BOUNDARIES_FILE=".agent-work-boundaries.json"

if [ ! -f "$BOUNDARIES_FILE" ]; then
  exit 0  # No boundaries defined, allow commit
fi

# Parse allowed and excluded paths
ALLOWED_PATHS=$(cat "$BOUNDARIES_FILE" | grep -A10 '"allowedPaths"' | grep '"' | cut -d'"' -f2 | grep -v allowedPaths || true)
EXCLUDED_PATHS=$(cat "$BOUNDARIES_FILE" | grep -A10 '"excludedPaths"' | grep '"' | cut -d'"' -f2 | grep -v excludedPaths || true)

# Get list of modified files
MODIFIED_FILES=$(git diff --cached --name-only)

VIOLATIONS=""

for file in $MODIFIED_FILES; do
  # Skip boundary file itself
  if [ "$file" = "$BOUNDARIES_FILE" ]; then
    continue
  fi
  
  # Check if file is in allowed paths
  ALLOWED=false
  if [ -n "$ALLOWED_PATHS" ]; then
    while IFS= read -r path; do
      if [[ "$file" == $path* ]]; then
        ALLOWED=true
        break
      fi
    done <<< "$ALLOWED_PATHS"
  fi
  
  # Check if file is in excluded paths
  EXCLUDED=false
  if [ -n "$EXCLUDED_PATHS" ]; then
    while IFS= read -r path; do
      if [[ "$file" == $path* ]]; then
        EXCLUDED=true
        break
      fi
    done <<< "$EXCLUDED_PATHS"
  fi
  
  if [ "$EXCLUDED" = true ] || [ "$ALLOWED" = false ]; then
    VIOLATIONS="$VIOLATIONS\\n  - $file"
  fi
done

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Agent boundary violation detected!"
  echo -e "\\nThe following files are outside your agent's work boundaries:$VIOLATIONS"
  echo -e "\\nPlease remove these changes or request permission to modify these files."
  exit 1
fi

echo "✅ All changes are within agent boundaries"
HOOK

chmod +x .git/hooks/pre-commit

# 5. Create agent workspace summary
echo "📊 Creating workspace summary..."
cat > .agent-workspace.md << EOF
# ${agentConfig.name || agentKey} Workspace

**Task ID:** ${taskId}  
**Branch:** $BRANCH_NAME  
**Started:** $(date)

## Work Boundaries

### Allowed Paths
${agentConfig.workingPaths.map(p => '- `' + p + '`').join('\n')}

### Excluded Paths  
${(agentConfig.excludePaths || []).map(p => '- `' + p + '`').join('\n')}

## Task Guidelines

1. Only modify files within your allowed paths
2. Run tests before committing
3. Keep commits atomic and well-described
4. Update this file with progress notes

## Progress Notes

- [ ] Task started
- [ ] Implementation complete
- [ ] Tests written
- [ ] Documentation updated
- [ ] Ready for review

## Commands

\`\`\`bash
# Check your boundaries
cat .agent-work-boundaries.json

# Run tests for your area
npm test -- ${agentConfig.workingPaths[0]}

# Commit your changes
git add .
git commit -m "${agentConfig.name || agentKey}: <description>"

# Push your branch
git push -u origin $BRANCH_NAME

# Create PR
gh pr create --base ${projectMasterBranch} --title "${agentConfig.name || agentKey}: ${taskId}"
\`\`\`
EOF

# 6. Show agent status
echo ""
echo "✅ Agent workspace initialized!"
echo ""
echo "📁 Working directories:"
${agentConfig.workingPaths.map(p => `echo "   - $PROJECT_PATH/${p}"`).join('\n')}
echo ""
echo "🚫 Excluded directories:"
${(agentConfig.excludePaths || []).map(p => `echo "   - $PROJECT_PATH/${p}"`).join('\n')}
echo ""
echo "📝 Next steps:"
echo "   1. Make your changes in the allowed directories"
echo "   2. Test your changes"
echo "   3. Commit with descriptive messages"
echo "   4. Push and create a PR"
echo ""
echo "💡 Tip: The pre-commit hook will prevent accidental changes outside your boundaries"
`;

    return script;
  }

  async run() {
    console.log('🤖 Multi-Agent Task Runner');
    console.log('========================\n');
    
    const agentKey = await this.selectAgent();
    const taskId = await this.getTaskId();
    
    const script = this.generateTaskScript(agentKey, taskId);
    const scriptPath = path.join(this.projectPath, `.run-${agentKey}-${taskId}.sh`);
    
    // Save script
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');
    
    console.log(`\n📄 Generated script: ${scriptPath}`);
    
    // Ask to run
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\n▶️  Run the script now? (y/n): ', (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'y') {
        console.log('\n🏃 Running script...\n');
        
        const child = spawn('bash', [scriptPath], {
          cwd: this.projectPath,
          stdio: 'inherit'
        });
        
        child.on('exit', (code) => {
          if (code === 0) {
            console.log('\n✅ Script completed successfully!');
            
            // Clean up script
            try {
              fs.unlinkSync(scriptPath);
            } catch (e) {}
          } else {
            console.error(`\n❌ Script failed with code ${code}`);
          }
        });
      } else {
        console.log(`\n💡 You can run the script later with:`);
        console.log(`   bash ${scriptPath}`);
      }
    });
  }
}

// Create runner and start
const runner = new AgentTaskRunner();
runner.run().catch(console.error);
