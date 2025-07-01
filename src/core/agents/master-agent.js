#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const FailureRecoverySystem = require('./failure-recovery'); // Assuming this is a local utility
const config = require('../../config'); // Jules: Added: Use new config module

class MasterAgent {
  constructor() {
    // Jules: Removed: Old config loading
    this.projectPath = config.get('projectPath');
    // Jules: Note: .master-agent.json (this.masterConfigFile) is now part of the main agent-orchestrator.config.json
    // We will use config.get('masterAgent') instead of reading/writing a separate file.
    this.masterAgentConfig = config.get('masterAgent') || {}; // Get the masterAgent section or default to empty object

    this.pendingReviewsFile = path.join(this.projectPath, '.pending-reviews.json');
    this.masterLogFile = path.join(this.projectPath, '.master-agent.log');
    this.recovery = new FailureRecoverySystem();
    
    // Jules: Removed: initializeMasterConfig() call as it's handled by the main config now.
    // If specific masterAgent settings are missing from the main config, they should be defaulted here or in usage.
    // For example, if this.masterAgentConfig.masterBranch is needed, check if it exists.
    // The provided structure for agent-orchestrator.config.json includes a masterAgent section.
  }

  // Jules: Removed: initializeMasterConfig() method. Its logic is now part of the main config file definition.
  // If there's a need to ensure default values for the masterAgent section if it's missing/incomplete in the main config,
  // that logic could be added in the constructor or where specific masterAgent properties are accessed.

  exec(command, options = {}) {
    try {
      return execSync(command, {
        cwd: this.projectPath,
        encoding: 'utf8',
        ...options
      });
    } catch (error) {
      this.log(`Error executing: ${command}`, 'error');
      throw error;
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(this.masterLogFile, logEntry);
    console.log(logEntry.trim());
  }

  async runCommand() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'init':
        await this.initMasterBranch();
        break;
      case 'review':
        await this.reviewPendingWork();
        break;
      case 'integrate':
        await this.integrateApprovedWork();
        break;
      case 'status':
        await this.showMasterStatus();
        break;
      case 'validate':
        await this.validateAgentWork(args[1]);
        break;
      case 'override':
        await this.overrideAndFix();
        break;
      case 'sync':
        await this.syncAllAgents();
        break;
      case 'monitor':
        await this.startMonitoring();
        break;
      default:
        this.showHelp();
    }
  }

  async initMasterBranch() {
    this.log('Initializing Master Agent branch...');
    const masterBranchName = this.masterAgentConfig.branch || 'master-integration'; // Jules: Use config
    
    try {
      // Create master integration branch
      this.exec(`git checkout -b ${masterBranchName}`);
      
      // Create master workspace - this info is largely in the config now
      // We can log some of it or ensure it's present
      const masterWorkspaceInfo = {
        role: 'Master Agent',
        authority: this.masterAgentConfig.authority || 'supreme', // Jules: Use config
        branch: masterBranchName,
        responsibilities: this.masterAgentConfig.responsibilities ? Object.keys(this.masterAgentConfig.responsibilities) : [
          'Review all agent submissions',
          'Resolve conflicts between agents',
          'Ensure code quality standards',
          'Perform final integration testing',
          'Commit to main branch'
        ], // Jules: Use config or default
        created: new Date().toISOString()
      };
      
      // This .master-workspace.json might be deprecated if all info is in the main config's masterAgent section.
      // For now, let's write it, but it should reflect the main config.
      fs.writeFileSync(
        path.join(this.projectPath, '.master-workspace.json'),
        JSON.stringify(masterWorkspaceInfo, null, 2)
      );
      
      this.log('✅ Master Agent initialized successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.exec(`git checkout ${masterBranchName}`); // Jules: Use config
        this.log(`✅ Switched to existing ${masterBranchName} branch`);
      } else {
        throw error;
      }
    }
  }

  async reviewPendingWork() {
    this.log('Starting review of pending agent work...');
    
    // Get all agent branches
    const branches = this.exec('git branch -r')
      .split('\n')
      .filter(b => { // Jules: Use agent branch prefixes from config
        const cleaned = b.trim().replace('origin/', '');
        return Object.values(config.get('agents.definitions')).some(agentDef => cleaned.startsWith(agentDef.branchPrefix));
      })
      .map(b => b.trim().replace('origin/', ''));
    
    if (branches.length === 0) {
      this.log('No pending agent work to review');
      return;
    }
    
    const reviews = [];
    const masterBranchName = this.masterAgentConfig.branch || 'master-integration'; // Jules: Use config
    
    for (const branch of branches) {
      this.log(`\nReviewing branch: ${branch}`);
      
      // Fetch latest
      this.exec(`git fetch origin ${branch}`);
      
      // Get diff statistics
      const stats = this.exec(`git diff ${masterBranchName}...origin/${branch} --stat`); // Jules: Use config
      const files = this.exec(`git diff ${masterBranchName}...origin/${branch} --name-only`).split('\n').filter(f => f); // Jules: Use config
      
      // Analyze changes
      const analysis = await this.analyzeChanges(branch, files, masterBranchName); // Jules: Pass masterBranchName
      
      reviews.push({
        branch,
        files: files.length,
        analysis,
        timestamp: new Date().toISOString()
      });
      
      // Display review
      console.log(`\n📊 Analysis for ${branch}:`);
      console.log(`   Files changed: ${files.length}`);
      console.log(`   Risk level: ${analysis.riskLevel}`);
      console.log(`   Issues found: ${analysis.issues.length}`);
      
      if (analysis.issues.length > 0) {
        console.log('   Issues:');
        analysis.issues.forEach(issue => console.log(`     - ${issue}`));
      }
    }
    
    // Save reviews
    fs.writeFileSync(this.pendingReviewsFile, JSON.stringify(reviews, null, 2));
    this.log(`\n✅ Review complete. ${reviews.length} branches analyzed.`);
  }

  async analyzeChanges(branch, files, masterBranchName) { // Jules: Added masterBranchName parameter
    const analysis = {
      riskLevel: 'low',
      issues: [],
      suggestions: [],
      conflicts: []
    };
    
    // Jules: Use highRiskPatterns from masterAgentConfig if available
    const highRiskPatterns = this.masterAgentConfig?.reviewStandards?.highRiskPatterns || [
      { pattern: /schema\.prisma/, risk: 'database-change' },
      { pattern: /\.env/, risk: 'environment-change' },
      { pattern: /auth/, risk: 'security-sensitive' },
      { pattern: /api/, risk: 'api-change' }
    ];
    
    for (const file of files) {
      for (const { pattern, risk } of highRiskPatterns) {
        // Ensure pattern is treated as regex if it's a string
        const regex = (typeof pattern === 'string') ? new RegExp(pattern) : pattern;
        if (regex.test(file)) {
          analysis.riskLevel = 'high';
          analysis.issues.push(`${risk}: ${file}`);
        }
      }
    }
    
    // Check for conflicts
    try {
      this.exec(`git merge-tree ${masterBranchName} origin/${branch} origin/${branch}`); // Jules: Use masterBranchName
    } catch (error) {
      analysis.conflicts.push('Potential merge conflicts detected');
      analysis.riskLevel = 'high';
    }
    
    // Check boundaries
    const agentDefinitions = config.get('agents.definitions'); // Jules: Use new config
    const agentEntry = Object.entries(agentDefinitions).find(([key, agentDef]) => branch.startsWith(agentDef.branchPrefix));

    if (agentEntry) {
      const [agentKey, agentConfig] = agentEntry;
      for (const file of files) {
        const allowed = agentConfig.workingPaths.some(p => file.startsWith(p));
        // Jules: Handle potentially undefined excludePaths
        const excluded = (agentConfig.excludePaths || []).some(p => file.startsWith(p));

        if (!allowed || excluded) {
          analysis.issues.push(`Boundary violation: ${file} outside ${agentKey} scope`);
        }
      }
    }
    
    return analysis;
  }

  async integrateApprovedWork() {
    if (!fs.existsSync(this.pendingReviewsFile)) {
      this.log('No reviews to integrate');
      return;
    }
    
    const reviews = JSON.parse(fs.readFileSync(this.pendingReviewsFile, 'utf8'));
    
    // Show reviews and ask for selection
    console.log('\n🔍 Pending Reviews:');
    reviews.forEach((review, index) => {
      console.log(`  ${index + 1}. ${review.branch}`);
      console.log(`     Risk: ${review.analysis.riskLevel}`);
      console.log(`     Files: ${review.files}`);
    });
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nSelect branch to integrate (number): ', resolve);
    });
    rl.close();
    
    const index = parseInt(answer) - 1;
    if (index < 0 || index >= reviews.length) {
      this.log('Invalid selection');
      return;
    }
    
    const selected = reviews[index];
    await this.performIntegration(selected);
  }

  async performIntegration(review) {
    this.log(`Starting integration of ${review.branch}...`);
    const masterBranchName = this.masterAgentConfig.branch || 'master-integration'; // Jules: Use config
    const mainBranchName = config.get('projectMasterBranch') || 'main'; // Jules: Use config for the actual main branch
    
    try {
      // Ensure we're on master-integration
      this.exec(`git checkout ${masterBranchName}`); // Jules: Use config
      
      // Create integration commit ID
      const integrationId = crypto.randomBytes(4).toString('hex');
      
      // Merge the branch
      this.log('Attempting merge...');
      try {
        this.exec(`git merge origin/${review.branch} --no-ff -m "Master Agent Integration: ${review.branch} [${integrationId}]"`);
        this.log('✅ Merge successful');
      } catch (mergeError) {
        this.log('⚠️  Merge conflicts detected. Resolving...');
        await this.resolveConflicts(review); // This method might need masterBranchName if it interacts with it
      }
      
      // Run validation suite
      this.log('Running validation suite...');
      const validation = await this.runValidationSuite(); // This method might need masterBranchName
      
      if (!validation.passed) {
        // Jules: Check if master agent can override failures from config
        const canOverride = this.masterAgentConfig?.responsibilities?.agentManagement?.canOverrideAnyAgent || false;
        if (!canOverride) {
          this.log('❌ Validation failed and Master Agent cannot override. Rolling back...');
          this.exec('git reset --hard HEAD~1');
          throw new Error('Validation failed: ' + validation.errors.join(', '));
        } else {
          this.log('⚠️  Validation failed, but Master Agent is configured to override and continue.');
        }
      }
      
      // Create integration report
      const report = {
        integrationId,
        branch: review.branch,
        integratedAt: new Date().toISOString(),
        validation,
        files: review.files
      };
      
      // Save integration history
      const historyFile = path.join(this.projectPath, '.integration-history.json');
      const history = fs.existsSync(historyFile) 
        ? JSON.parse(fs.readFileSync(historyFile, 'utf8'))
        : [];
      history.push(report);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      
      // Push to main if configured
      const autoPushToMain = this.masterAgentConfig?.automationRules?.autoApprove?.enabled && // Jules: Check config for auto-push logic
                             (this.masterAgentConfig?.automationRules?.autoApprove?.pushToMain !== false); // Default to true if autoApprove is on

      let pushedToMain = false;
      if (autoPushToMain && validation.passed) { // Only auto-push if validation passed
        this.log(`🚀 Auto-pushing to ${mainBranchName} branch as per configuration...`);
        this.exec(`git checkout ${mainBranchName}`);
        this.exec(`git merge ${masterBranchName} --no-ff`); // Jules: Use config
        this.exec(`git push origin ${mainBranchName}`);
        this.log(`✅ Successfully pushed to ${mainBranchName} branch`);
        pushedToMain = true;
      } else if (validation.passed) { // If not auto-pushing but validation passed, ask
        const confirmPush = await this.confirmPushToMain(mainBranchName); // Jules: Pass mainBranchName
        if (confirmPush) {
          this.exec(`git checkout ${mainBranchName}`);
          this.exec(`git merge ${masterBranchName} --no-ff`); // Jules: Use config
          this.exec(`git push origin ${mainBranchName}`);
          this.log(`✅ Successfully pushed to ${mainBranchName} branch`);
          pushedToMain = true;
        }
      } else {
         this.log(`🚦 Push to ${mainBranchName} skipped due to validation status or configuration.`);
      }
      
      // Clean up integrated branch
      // Jules: Add check from config if branches should be auto-deleted
      const autoDeleteBranch = this.masterAgentConfig?.automationRules?.autoCleanup?.deleteMergedBranch !== false; // Default to true
      if (autoDeleteBranch && pushedToMain) { // Only delete if pushed to main
      try {
        this.exec(`git push origin --delete ${review.branch}`);
        this.log('✅ Cleaned up integrated branch');
      } catch (e) {
        this.log('⚠️  Could not delete remote branch');
      }
      
    } catch (error) {
      this.log(`❌ Integration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async resolveConflicts(review) {
    this.log('Applying Master Agent conflict resolution...');
    
    // Get conflicted files
    const conflicts = this.exec('git diff --name-only --diff-filter=U').split('\n').filter(f => f);
    
    for (const file of conflicts) {
      this.log(`Resolving conflict in: ${file}`);
      
      // For now, we'll take a conservative approach
      // In a real implementation, this could use AI to resolve
      try {
        // Try to use ours (master-integration) for critical files
        if (file.includes('package-lock.json')) {
          this.exec(`git checkout --ours ${file}`);
        } else {
          // For other files, attempt a smart merge
          // This is where you could integrate an AI resolver
          this.exec(`git checkout --theirs ${file}`);
        }
        this.exec(`git add ${file}`);
      } catch (e) {
        this.log(`Manual resolution required for: ${file}`, 'warn');
      }
    }
    
    // Complete the merge
    this.exec(`git commit -m "Master Agent: Resolved conflicts for ${review.branch}"`);
  }

  async runValidationSuite() {
    const validation = {
      passed: true,
      errors: [],
      warnings: []
    };
    
    // Run build
    try {
      this.log('Running build...');
      this.exec('npm run build');
    } catch (e) {
      validation.passed = false;
      validation.errors.push('Build failed');
    }
    
    // Run tests
    try {
      this.log('Running tests...');
      this.exec('npm test');
    } catch (e) {
      validation.warnings.push('Some tests failed');
    }
    
    // Run linting
    try {
      this.log('Running linter...');
      this.exec('npm run lint');
    } catch (e) {
      validation.warnings.push('Linting issues found');
    }
    
    // Check for security issues
    try {
      this.log('Checking for security issues...');
      // Check for common security patterns
      const suspiciousPatterns = [
        /console\.log.*password/i,
        /api[_-]?key.*=.*["']/i,
        /secret.*=.*["']/i
      ];
      
      const files = this.exec('git diff --name-only HEAD~1').split('\n').filter(f => f);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(this.projectPath, file), 'utf8');
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
              validation.warnings.push(`Security concern in ${file}`);
            }
          }
        }
      }
    } catch (e) {
      // Continue
    }
    
    return validation;
  }

  async confirmPushToMain(mainBranchName) { // Jules: Added mainBranchName parameter
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`\n🚀 Push to ${mainBranchName} branch? (y/n): `, resolve); // Jules: Use mainBranchName
    });
    rl.close();
    
    return answer.toLowerCase() === 'y';
  }

  async showMasterStatus() {
    console.log('\n🤖 Master Agent Status');
    console.log('====================\n');
    
    // Current branch
    const currentBranch = this.exec('git rev-parse --abbrev-ref HEAD').trim();
    console.log(`Current branch: ${currentBranch}`);
    console.log(`Master Agent Branch (from config): ${this.masterAgentConfig.branch || 'master-integration'}`);
    console.log(`Project Main Branch (from config): ${config.get('projectMasterBranch') || 'main'}`);
    
    // Pending reviews
    if (fs.existsSync(this.pendingReviewsFile)) {
      const reviews = JSON.parse(fs.readFileSync(this.pendingReviewsFile, 'utf8'));
      console.log(`\nPending reviews: ${reviews.length}`);
      reviews.forEach(r => {
        console.log(`  - ${r.branch} (risk: ${r.analysis.riskLevel})`);
      });
    }
    
    // Integration history
    const historyFile = path.join(this.projectPath, '.integration-history.json');
    if (fs.existsSync(historyFile)) {
      const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      console.log(`\nTotal integrations: ${history.length}`);
      if (history.length > 0) {
        const latest = history[history.length - 1];
        console.log(`Latest: ${latest.branch} at ${latest.integratedAt}`);
      }
    }
    
    // Agent status from the new config's agentCommunication statusFile
    const agentStatusFile = config.get('agentCommunication.statusFile'); // Jules: Use config
    const fullStatusPath = agentStatusFile ? path.join(this.projectPath, agentStatusFile) : null;

    if (fullStatusPath && fs.existsSync(fullStatusPath)) {
      const statusData = JSON.parse(fs.readFileSync(fullStatusPath, 'utf8')); // Jules: Renamed to statusData
      console.log('\nActive agents (from status file):');
      for (const [agent, info] of Object.entries(statusData)) { // Jules: Use statusData
        if (info.status === 'active') {
          console.log(`  - ${agent}: ${info.currentBranch || info.taskId || 'working'}`);
        }
      }
    } else {
      console.log(`\nAgent status file not found or not configured (expected at ${agentStatusFile || '.agent-status.json'})`);
    }
  }

  async overrideAndFix() {
    console.log('\n⚡ Master Override Mode');
    console.log('======================');
    console.log('This mode allows the Master Agent to directly fix issues across any codebase area.\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const description = await new Promise(resolve => {
      rl.question('Describe the issue to fix: ', resolve);
    });
    
    const taskId = `master-fix-${Date.now()}`;
    rl.close();
    
    // Create override branch
    this.exec(`git checkout -b master-override/${taskId}`);
    
    // Remove all boundary restrictions for master
    const overrideConfig = {
      agent: 'master',
      authority: 'override',
      taskId,
      description,
      boundaries: 'none',
      startTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(this.projectPath, '.master-override.json'),
      JSON.stringify(overrideConfig, null, 2)
    );
    
    console.log('\n✅ Master Override activated');
    console.log('📝 You can now modify any file in the codebase');
    console.log(`🔧 Task ID: ${taskId}`);
    console.log('\nWhen done, run: node master-agent.js integrate');
  }

  async syncAllAgents() {
    this.log('Syncing all active agents with latest changes...');
    
    const agentStatusFile = config.get('agentCommunication.statusFile'); // Jules: Use config
    const fullStatusPath = agentStatusFile ? path.join(this.projectPath, agentStatusFile) : null;

    if (!fullStatusPath || !fs.existsSync(fullStatusPath)) {
      this.log(`No active agents to sync (status file not found: ${agentStatusFile || '.agent-status.json'})`);
      return;
    }
    
    const statusData = JSON.parse(fs.readFileSync(fullStatusPath, 'utf8')); // Jules: Renamed
    
    for (const [agent, info] of Object.entries(statusData)) { // Jules: Use statusData
      if (info.status === 'active') {
        this.log(`Syncing ${agent}...`);
        try {
          // This would trigger the agent's sync process
          // Assuming orchestrator.js is in the same directory or PATH
          this.exec(`node orchestrator.js sync ${agent}`); // This might need adjustment if orchestrator.js path changes
          this.log(`✅ ${agent} synced`);
        } catch (e) {
          this.log(`⚠️  Failed to sync ${agent}`, 'warn');
        }
      }
    }
  }

  async startMonitoring() {
    console.log('👁️  Master Agent Monitoring Started');
    console.log('===================================\n');
    
    const monitoringIntervalString = this.masterAgentConfig?.communication?.reportingInterval || '1h'; // Jules: Use config, default 1h
    const monitoringIntervalMs = config.parseInterval(monitoringIntervalString) || (60 * 60 * 1000); // Default to 1 hour if parse fails

    setInterval(async () => {
      this.log('Running monitoring cycle...');
      
      // Check for new branches
      this.exec('git fetch --all');
      
      // Review pending work
      await this.reviewPendingWork();
      
      // Check agent health
      const agentStatusFile = config.get('agentCommunication.statusFile'); // Jules: Use config
      const fullStatusPath = agentStatusFile ? path.join(this.projectPath, agentStatusFile) : null;

      if (fullStatusPath && fs.existsSync(fullStatusPath)) {
        const statusData = JSON.parse(fs.readFileSync(fullStatusPath, 'utf8')); // Jules: Renamed
        for (const [agent, info] of Object.entries(statusData)) { // Jules: Use statusData
          if (info.status === 'active' && info.startTime) { // Jules: Check for info.startTime
            const startTime = new Date(info.startTime);
            const hoursActive = (Date.now() - startTime) / (1000 * 60 * 60);
            
            // Jules: Use staleness threshold from config or default
            const staleThresholdHours = this.masterAgentConfig?.agentManagement?.staleThresholdHours || 24;
            if (hoursActive > staleThresholdHours) {
              this.log(`⚠️  ${agent} has been active for ${hoursActive.toFixed(1)} hours (threshold: ${staleThresholdHours}h)`, 'warn');
            }
          }
        }
      }
      
    }, monitoringIntervalMs);
    
    console.log('Monitoring active. Press Ctrl+C to stop.\n');
    
    // Keep process alive
    process.stdin.resume();
  }

  showHelp() {
    console.log(`
🤖 Master Agent - Central Authority for Code Integration

Commands:
  init         Initialize Master Agent branch and workspace
  review       Review all pending agent work
  integrate    Integrate approved agent work
  status       Show Master Agent status
  validate     Validate specific agent branch
  override     Enter override mode to fix critical issues
  sync         Sync all active agents
  monitor      Start continuous monitoring

Examples:
  node master-agent.js init
  node master-agent.js review
  node master-agent.js integrate
  node master-agent.js override

The Master Agent has ultimate authority over the codebase and ensures
all agent work meets quality standards before integration.
    `);
  }
}

// Run Master Agent
const master = new MasterAgent();
master.runCommand().catch(console.error);
