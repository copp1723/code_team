#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs'); // fs is still used for statusFile and lockFile
const path = require('path');
const config = require('../../config'); // Jules: Added: Use new config module

class MultiAgentOrchestrator {
  constructor() { // Jules: Removed configPath parameter
    // Jules: Changed: Use the global config module
    this.projectPath = config.get('projectPath');
    // Jules: Changed: Get communication settings from the new config structure
    this.statusFile = path.join(this.projectPath, config.get('agentCommunication.statusFile'));
    this.lockFile = path.join(this.projectPath, config.get('agentCommunication.lockFile'));
    this.agentStatus = {};
    this.fileLocks = {};
  }

  init() {
    // Initialize status and lock files
    this.loadStatus();
    this.loadLocks();
    
    // Ensure we're on the base branch and up to date
    // Jules: Changed: Get baseBranch (projectMasterBranch) from config
    const baseBranch = config.get('projectMasterBranch') || 'main';
    this.exec(`git checkout ${baseBranch}`);
    this.exec(`git pull origin ${baseBranch}`);
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        cwd: this.projectPath,
        encoding: 'utf8',
        ...options
      });
    } catch (error) {
      console.error(`Error executing: ${command}`, error.message);
      throw error;
    }
  }

  loadStatus() {
    if (fs.existsSync(this.statusFile)) {
      this.agentStatus = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
    }
  }

  saveStatus() {
    fs.writeFileSync(this.statusFile, JSON.stringify(this.agentStatus, null, 2));
  }

  loadLocks() {
    if (fs.existsSync(this.lockFile)) {
      this.fileLocks = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
    }
  }

  saveLocks() {
    fs.writeFileSync(this.lockFile, JSON.stringify(this.fileLocks, null, 2));
  }

  createAgentBranch(agentKey, taskId) {
    // Jules: Changed: Get agent definition from new config structure
    const agentConfig = config.get(`agents.definitions.${agentKey}`);
    if (!agentConfig) {
      console.error(`❌ Agent configuration for '${agentKey}' not found.`);
      throw new Error(`Agent configuration for '${agentKey}' not found.`);
    }
    const branchName = `${agentConfig.branchPrefix}/${taskId}`;
    const baseBranch = config.get('projectMasterBranch') || 'main'; // Jules: Use new config
    
    try {
      // Create branch from latest base
      this.exec(`git checkout -b ${branchName} ${baseBranch}`); // Jules: Use baseBranch from config
      
      // Update agent status
      this.agentStatus[agentKey] = {
        currentBranch: branchName,
        taskId: taskId,
        startTime: new Date().toISOString(),
        status: 'active'
      };
      this.saveStatus();
      
      console.log(`✅ Created branch ${branchName} for ${agentConfig.name || agentKey}`); // Jules: Use agentConfig.name
      return branchName;
    } catch (error) {
      console.error(`❌ Failed to create branch for ${agentConfig.name || agentKey}:`, error.message); // Jules: Use agentConfig.name
      throw error;
    }
  }

  canAccessFile(agentKey, filePath) {
    const agentConfig = config.get(`agents.definitions.${agentKey}`); // Jules: Use new config structure
    if (!agentConfig) return false; // Agent not defined
    const relativePath = path.relative(this.projectPath, filePath);
    
    // Check if file is in agent's working paths
    const inWorkingPath = agentConfig.workingPaths.some(wp =>
      relativePath.startsWith(wp) || relativePath.includes(wp.replace('**/', ''))
    );
    
    // Check if file is in excluded paths
    const inExcludedPath = (agentConfig.excludePaths || []).some(ep => // Jules: Handle undefined excludePaths
      relativePath.startsWith(ep) || relativePath.includes(ep.replace('**/', ''))
    );
    
    // Check if file is locked by another agent
    const isLocked = this.fileLocks[relativePath] && 
                     this.fileLocks[relativePath].agent !== agentKey;
    
    return inWorkingPath && !inExcludedPath && !isLocked;
  }

  lockFiles(agentKey, files) {
    const lockedFiles = [];
    
    for (const file of files) {
      if (this.canAccessFile(agentKey, file)) {
        const relativePath = path.relative(this.projectPath, file);
        this.fileLocks[relativePath] = {
          agent: agentKey,
          lockedAt: new Date().toISOString()
        };
        lockedFiles.push(relativePath);
      }
    }
    
    this.saveLocks();
    return lockedFiles;
  }

  unlockFiles(agentKey) {
    const unlockedFiles = [];
    
    for (const [file, lock] of Object.entries(this.fileLocks)) {
      if (lock.agent === agentKey) {
        delete this.fileLocks[file];
        unlockedFiles.push(file);
      }
    }
    
    this.saveLocks();
    return unlockedFiles;
  }

  syncAgent(agentKey) {
    const agentConfig = config.get(`agents.definitions.${agentKey}`); // Jules: Use new config
    if (!agentConfig) {
      console.log(`⏭️  Agent ${agentKey} not defined, skipping sync`);
      return;
    }
    const status = this.agentStatus[agentKey];
    
    if (!status || status.status !== 'active') {
      console.log(`⏭️  ${agentConfig.name || agentKey} is not active, skipping sync`); // Jules: Use agentConfig.name
      return;
    }
    
    const baseBranch = config.get('projectMasterBranch') || 'main'; // Jules: Use new config
    try {
      // Stash any uncommitted changes
      this.exec('git stash');
      
      // Fetch latest changes
      this.exec('git fetch origin');
      
      // Rebase on base branch
      this.exec(`git rebase origin/${baseBranch}`); // Jules: Use baseBranch from config
      
      // Pop stashed changes
      try {
        this.exec('git stash pop');
      } catch (e) {
        // No stash to pop
      }
      
      console.log(`✅ Synced ${agentConfig.name || agentKey} with base branch`); // Jules: Use agentConfig.name
    } catch (error) {
      console.error(`❌ Sync failed for ${agentConfig.name || agentKey}:`, error.message); // Jules: Use agentConfig.name
      
      // Abort rebase if in progress
      try {
        this.exec('git rebase --abort');
      } catch (e) {}
      
      throw error;
    }
  }

  mergeAgent(agentKey, message) {
    const agentConfig = config.get(`agents.definitions.${agentKey}`); // Jules: Use new config
    if (!agentConfig) {
      console.log(`⏭️  Agent ${agentKey} not defined, skipping merge`);
      return;
    }
    const status = this.agentStatus[agentKey];
    
    if (!status || status.status !== 'active') {
      console.log(`⏭️  ${agentConfig.name || agentKey} has no active branch`); // Jules: Use agentConfig.name
      return;
    }
    
    const baseBranch = config.get('projectMasterBranch') || 'main'; // Jules: Use new config
    try {
      // Commit any pending changes
      this.exec('git add -A');
      this.exec(`git commit -m "${message || `${agentConfig.name || agentKey}: ${status.taskId}`}"`); // Jules: Use agentConfig.name
      
      // Push branch
      this.exec(`git push -u origin ${status.currentBranch}`);
      
      // Create pull request (using GitHub CLI if available)
      try {
        const prUrl = this.exec(
          `gh pr create --base ${baseBranch} ` + // Jules: Use baseBranch from config
          `--head ${status.currentBranch} --title "${agentConfig.name || agentKey}: ${status.taskId}" ` + // Jules: Use agentConfig.name
          `--body "Automated PR from ${agentConfig.name || agentKey}"` // Jules: Use agentConfig.name
        );
        console.log(`✅ Created PR for ${agentConfig.name || agentKey}: ${prUrl}`); // Jules: Use agentConfig.name
      } catch (e) {
        console.log(`ℹ️  Pushed branch ${status.currentBranch}. Create PR manually.`);
      }
      
      // Update status
      this.agentStatus[agentKey].status = 'completed';
      this.agentStatus[agentKey].completedAt = new Date().toISOString();
      this.saveStatus();
      
      // Unlock files
      this.unlockFiles(agentKey);
      
    } catch (error) {
      console.error(`❌ Merge failed for ${agentConfig.name || agentKey}:`, error.message); // Jules: Use agentConfig.name
      throw error;
    }
  }

  runPeriodicSync() {
    // Jules: Get updateFrequency from new config structure, use config.parseInterval helper
    const updateFrequencyString = config.get('conflictResolution.updateFrequency');
    const interval = config.parseInterval(updateFrequencyString) || (30 * 60 * 1000); // Default 30 mins if not parsable
    
    setInterval(() => {
      console.log('\n🔄 Running periodic sync...');
      
      const agentDefinitions = config.get('agents.definitions'); // Jules: Use new config
      if (agentDefinitions) {
        for (const agentKey of Object.keys(agentDefinitions)) {
          try {
            this.syncAgent(agentKey);
          } catch (error) {
            console.error(`Failed to sync ${agentKey}:`, error.message);
          }
        }
      }
    }, interval);
  }

  parseInterval(frequency) { // Jules: This method is now part of the config module. Can be removed if not used elsewhere locally.
                              // For now, keeping it to ensure no breakage if it was called directly by other parts of this file not yet seen.
                              // However, runPeriodicSync now uses config.parseInterval.
    const match = frequency.match(/(\d+)([mh])/);
    if (!match) return 30 * 60 * 1000; // Default 30 minutes
    
    const [, value, unit] = match;
    const multiplier = unit === 'h' ? 60 * 60 * 1000 : 60 * 1000;
    return parseInt(value) * multiplier;
  }

  status() {
    console.log('\n📊 Agent Status:');
    console.log('================');
    
    const agentDefinitions = config.get('agents.definitions'); // Jules: Use new config
    if (agentDefinitions) {
      for (const [agentKey, agentConfig] of Object.entries(agentDefinitions)) { // Jules: Iterate agentDefinitions
        const status = this.agentStatus[agentKey];
        
        if (status) {
          console.log(`\n${agentConfig.name || agentKey}:`); // Jules: Use agentConfig.name
          console.log(`  Branch: ${status.currentBranch}`);
          console.log(`  Task: ${status.taskId}`);
          console.log(`  Status: ${status.status}`);
          console.log(`  Started: ${status.startTime}`);

          // Show locked files
          const lockedFiles = Object.entries(this.fileLocks)
            .filter(([, lock]) => lock.agent === agentKey)
            .map(([file]) => file);

          if (lockedFiles.length > 0) {
            console.log(`  Locked files: ${lockedFiles.length}`);
            lockedFiles.forEach(f => console.log(`    - ${f}`));
          }
        } else {
          console.log(`\n${agentConfig.name || agentKey}: Inactive`); // Jules: Use agentConfig.name
        }
      }
    }
    
    console.log('\n');
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];
// Jules: Removed configPath argument as it's no longer needed by the constructor
const orchestrator = new MultiAgentOrchestrator();

try {
  switch (command) {
    case 'init':
      orchestrator.init();
      console.log('✅ Orchestrator initialized');
      break;
      
    case 'create':
      const [, agentKey, taskId] = args;
      if (!agentKey || !taskId) {
        console.error('Usage: orchestrator create <agent> <task-id>');
        process.exit(1);
      }
      orchestrator.createAgentBranch(agentKey, taskId);
      break;
      
    case 'sync':
      const [, syncAgent] = args;
      if (syncAgent) {
        orchestrator.syncAgent(syncAgent);
      } else {
        // Sync all agents
        // Jules: Iterate over keys from config's agent definitions
        const agentDefsToSync = config.get('agents.definitions');
        if (agentDefsToSync) {
          for (const agentKeyToSync of Object.keys(agentDefsToSync)) {
            orchestrator.syncAgent(agentKeyToSync);
          }
        }
      }
      break;
      
    case 'merge':
      const [, mergeAgent, ...messageParts] = args;
      if (!mergeAgent) {
        console.error('Usage: orchestrator merge <agent> [message]');
        process.exit(1);
      }
      orchestrator.mergeAgent(mergeAgent, messageParts.join(' '));
      break;
      
    case 'status':
      orchestrator.status();
      break;
      
    case 'watch':
      orchestrator.init();
      orchestrator.runPeriodicSync();
      console.log('👀 Watching for changes...');
      // Keep process alive
      setInterval(() => {}, 1000);
      break;
      
    default:
      console.log(`
Multi-Agent Orchestrator

Commands:
  init              Initialize orchestrator
  create <agent> <task-id>   Create a new branch for an agent
  sync [agent]      Sync agent(s) with base branch
  merge <agent> [message]    Merge agent's work
  status            Show status of all agents
  watch             Run periodic sync
      `);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
