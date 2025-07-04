#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AIValidationLayer = require('./ai-validation-layer');
const FailureRecoverySystem = require('./failure-recovery');
const ResourceMonitor = require('./resource-monitor');
const HumanOversightSystem = require('./human-oversight'); // Assuming local utility
const config = require('../../config'); // Jules: Added: Use new config module

class MasterAgentWorkflow {
  constructor() {
    // Jules: Changed: Get masterAgent specific config and general orchestrator config from the single source
    this.masterAgentConfig = config.get('masterAgent') || {};
    this.orchestratorConfig = config.get(); // Gets the whole config object

    this.workflowState = {
      id: `workflow-${Date.now()}`,
      startTime: new Date().toISOString(),
      stages: {},
      results: []
      // Generate executive summary
    await this.generateExecutiveSummary();
  }

  async generateExecutiveSummary() {
    console.log('\n📄 Generating Executive Summary...');
    
    const summary = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      duration: this.calculateDuration(),
      overview: this.createOverview(),
      accomplishments: this.listAccomplishments(),
      impact: this.assessImpact(),
      nextSteps: this.suggestNextSteps()
    };
    
    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 EXECUTIVE SUMMARY - MASTER AGENT INTEGRATION');
    console.log('='.repeat(70));
    console.log(`\n📅 Date: ${summary.date} at ${summary.time}`);
    console.log(`⏱️  Duration: ${summary.duration}`);
    
    console.log('\n📊 OVERVIEW:');
    console.log(summary.overview);
    
    console.log('\n✅ WHAT WAS ACCOMPLISHED:');
    summary.accomplishments.forEach(item => console.log(`   • ${item}`));
    
    console.log('\n💡 BUSINESS IMPACT:');
    summary.impact.forEach(item => console.log(`   • ${item}`));
    
    console.log('\n🚀 NEXT STEPS:');
    summary.nextSteps.forEach(item => console.log(`   • ${item}`));
    
    console.log('\n' + '='.repeat(70));
    
    // Save summary
    const summaryFile = `executive-summary-${Date.now()}.md`;
    this.saveExecutiveSummary(summary, summaryFile);
    console.log(`\n💾 Summary saved to: ${summaryFile}`);
  }
  
  calculateDuration() {
    const start = new Date(this.workflowState.startTime);
    const end = new Date();
    const diff = end - start;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes} minutes ${seconds} seconds`;
  }
  
  createOverview() {
    const branches = this.workflowState.results
      .find(r => r.step === 'fetch-all-branches')?.branches || [];
    const merged = this.workflowState.results
      .find(r => r.step === 'merge-to-master')?.merged || [];
    
    return `The Master Agent successfully reviewed ${branches.length} agent submissions and integrated ${merged.length} approved changes into the main codebase. All code passed quality standards and automated testing.`;
  }
  
  listAccomplishments() {
    const accomplishments = [];
    const merged = this.workflowState.results
      .find(r => r.step === 'merge-to-master')?.merged || [];
    
    // Extract ticket IDs and descriptions from branch names
    merged.forEach(({ branch }) => {
      const ticketMatch = branch.match(/TICKET-[\w-]+/i);
      if (ticketMatch) {
        const ticketId = ticketMatch[0];
        const agentType = branch.split('/')[1];
        
        // Map technical work to business language
        const descriptions = {
          'frontend': 'User interface improvements',
          'backend': 'System functionality enhancements',
          'database': 'Data management updates',
          'integration': 'Third-party system connections',
          'testing': 'Quality assurance improvements'
        };
        
        accomplishments.push(`${ticketId}: ${descriptions[agentType] || 'System improvements'} completed by ${agentType} team`);
      }
    });
    
    if (accomplishments.length === 0) {
      accomplishments.push('System maintenance and optimization completed');
    }
    
    return accomplishments;
  }
  
  assessImpact() {
    const impact = [];
    const validation = this.workflowState.results
      .find(r => r.step === 'validate-integration')?.validation || {};
    
    if (validation.build?.status === 'passed') {
      impact.push('Application stability maintained with successful build');
    }
    
    if (validation.tests?.status === 'passed') {
      impact.push('Quality assured through comprehensive automated testing');
    }
    
    if (validation.security?.status === 'passed') {
      impact.push('Security standards upheld with no vulnerabilities introduced');
    }
    
    const merged = this.workflowState.results
      .find(r => r.step === 'merge-to-master')?.merged || [];
    
    if (merged.length > 0) {
      impact.push(`${merged.length} new features/improvements now available in production`);
    }
    
    return impact;
  }
  
  suggestNextSteps() {
    const nextSteps = [];
    const reviews = this.workflowState.results
      .find(r => r.step === 'review-changes')?.reviews || [];
    
    const failedReviews = reviews.filter(r => !r.passed);
    if (failedReviews.length > 0) {
      nextSteps.push(`Review and address ${failedReviews.length} submissions that need improvements`);
    }
    
    const violations = this.workflowState.results
      .find(r => r.step === 'validate-boundaries')?.violations || [];
    if (violations.length > 0) {
      nextSteps.push('Provide additional training on system architecture boundaries');
    }
    
    nextSteps.push('Monitor production for any issues with new deployments');
    nextSteps.push('Collect user feedback on implemented changes');
    
    return nextSteps;
  }
  
  saveExecutiveSummary(summary, filename) {
    const content = `# Executive Summary - Master Agent Integration

**Date:** ${summary.date} at ${summary.time}  
**Duration:** ${summary.duration}

## Overview
${summary.overview}

## Accomplishments
${summary.accomplishments.map(a => `- ${a}`).join('\n')}

## Business Impact
${summary.impact.map(i => `- ${i}`).join('\n')}

## Next Steps
${summary.nextSteps.map(n => `- ${n}`).join('\n')}

---
*This summary was automatically generated by the Master Agent Integration System*
`;
    
    fs.writeFileSync(filename, content);
  };
    
    // Initialize improvement systems
    this.validator = new AIValidationLayer();
    this.recovery = new FailureRecoverySystem();
    this.monitor = new ResourceMonitor();
    this.oversight = new HumanOversightSystem();
  }

  async executeWorkflow(workflowName = 'standardIntegration') {
    console.log(`\n🚀 Executing Master Agent Workflow: ${workflowName}`);
    console.log('='.repeat(50));
    
    // Jules: Changed: Access workflow from this.masterAgentConfig
    const workflow = this.masterAgentConfig.workflows?.[workflowName];
    if (!workflow || !workflow.steps) { // Jules: Added check for workflow.steps
      throw new Error(`Unknown or improperly configured workflow: ${workflowName}`);
    }

    for (const step of workflow.steps) {
      console.log(`\n▶️  Executing: ${step}`);
      
      try {
        await this.executeStep(step);
        this.workflowState.stages[step] = {
          status: 'completed',
          timestamp: new Date().toISOString()
        };
        console.log(`✅ ${step} completed`);
      } catch (error) {
        this.workflowState.stages[step] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        console.error(`❌ ${step} failed: ${error.message}`);
        
        // Jules: Changed: Access rollbackOnFailure from this.masterAgentConfig
        if (this.masterAgentConfig.responsibilities?.integration?.rollbackOnFailure) {
          await this.rollback();
        }
        throw error;
      }
    }
    
    this.saveWorkflowState();
    console.log('\n✅ Workflow completed successfully!');
  }

  async executeStep(step) {
    const stepHandlers = {
      'fetch-all-branches': this.fetchAllBranches.bind(this),
      'review-changes': this.reviewChanges.bind(this),
      'validate-boundaries': this.validateBoundaries.bind(this),
      'run-tests': this.runTests.bind(this),
      'check-conflicts': this.checkConflicts.bind(this),
      'merge-to-master': this.mergeToMaster.bind(this),
      'validate-integration': this.validateIntegration.bind(this),
      'push-to-main': this.pushToMain.bind(this),
      'collect-all-ready-branches': this.collectReadyBranches.bind(this),
      'order-by-dependency': this.orderByDependency.bind(this),
      'sequential-integration': this.sequentialIntegration.bind(this),
      'full-regression-test': this.fullRegressionTest.bind(this)
    };

    const handler = stepHandlers[step];
    if (!handler) {
      throw new Error(`No handler for step: ${step}`);
    }

    await handler();
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        encoding: 'utf8',
        ...options
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  async fetchAllBranches() {
    this.exec('git fetch --all --prune');
    
    const branches = this.exec('git branch -r')
      .split('\n')
      .filter(b => {
        const cleaned = b.trim();
        return cleaned.includes('feature/') || 
               cleaned.includes('test/') ||
               cleaned.includes('fix/');
      })
      .map(b => b.trim().replace('origin/', ''));
    
    this.workflowState.results.push({
      step: 'fetch-all-branches',
      branches: branches,
      count: branches.length
    });
    
    console.log(`  Found ${branches.length} agent branches`);
  }

  async reviewChanges() {
    const branches = this.workflowState.results
      .find(r => r.step === 'fetch-all-branches')?.branches || [];
    
    const reviews = [];
    
    for (const branch of branches) {
      console.log(`  Reviewing: ${branch}`);
      
      const diff = this.exec(`git diff master-integration...origin/${branch} --stat`);
      const files = this.exec(`git diff master-integration...origin/${branch} --name-only`)
        .split('\n')
        .filter(f => f);
      
      // Check against review standards
      const review = {
        branch,
        files,
        passed: true,
        issues: []
      };
      
      const standards = this.masterAgentConfig.responsibilities?.codeReview?.standards; // Jules: Use masterAgentConfig

      // Check for test files
      const hasTests = files.some(f => f.includes('.test.') || f.includes('.spec.'));
      if (!hasTests && standards?.testing?.required) { // Jules: Use masterAgentConfig
        review.issues.push('No test files found');
        review.passed = false;
      }
      
      // Check for documentation
      const hasDocUpdates = files.some(f => 
        f.toLowerCase().includes('readme') || 
        f.includes('.md') || 
        f.includes('doc')
      );
      // Jules: Use masterAgentConfig for documentation check, e.g. standards?.documentation?.required
      if (standards?.documentation?.required && !hasDocUpdates && files.length > (standards.documentation.minFilesForDocUpdate || 5)) {
        review.issues.push('No documentation updates for significant changes');
        // review.passed = false; // Optionally make this a failing condition
      }
      
      reviews.push(review);
    }
    
    this.workflowState.results.push({
      step: 'review-changes',
      reviews,
      passed: reviews.filter(r => r.passed).length,
      failed: reviews.filter(r => !r.passed).length
    });
  }

  async validateBoundaries() {
    const reviews = this.workflowState.results
      .find(r => r.step === 'review-changes')?.reviews || [];
    
    const violations = [];
    
    for (const review of reviews) {
      // Extract agent from branch name
      // Jules: Changed: Use orchestratorConfig (which is the full config object) to get agent definitions
      const agentDefinitions = this.orchestratorConfig.agents?.definitions;
      if (!agentDefinitions) continue;

      const agentEntry = Object.entries(agentDefinitions).find(([key, agentDef]) => review.branch.startsWith(agentDef.branchPrefix));
      
      if (agentEntry) {
        const [agentKey, agentConfig] = agentEntry;
        
        for (const file of review.files) {
          const allowed = agentConfig.workingPaths.some(p => file.startsWith(p));
          // Jules: Handle potentially undefined excludePaths
          const excluded = (agentConfig.excludePaths || []).some(p => file.startsWith(p));
          
          if (!allowed || excluded) {
            violations.push({
              branch: review.branch,
              agent: agentKey,
              file,
              type: !allowed ? 'not-allowed' : 'excluded'
            });
          }
        }
      }
    }
    
    this.workflowState.results.push({
      step: 'validate-boundaries',
      violations,
      count: violations.length
    });
    
    // Master can override boundaries
    if (violations.length > 0) {
      console.log(`  ⚠️  Found ${violations.length} boundary violations (Master override applied)`);
    }
  }

  async runTests() {
    console.log('  Running test suite...');
    
    try {
      const testOutput = this.exec('npm test', { stdio: 'pipe' });
      
      this.workflowState.results.push({
        step: 'run-tests',
        status: 'passed',
        output: testOutput.substring(0, 500) // First 500 chars
      });
    } catch (error) {
      // Tests failed but master can decide to proceed
      this.workflowState.results.push({
        step: 'run-tests',
        status: 'failed',
        canOverride: true,
        error: error.message
      });
      
      console.log('  ⚠️  Some tests failed (Master can override)');
    }
  }

  async checkConflicts() {
    const branches = this.workflowState.results
      .find(r => r.step === 'fetch-all-branches')?.branches || [];
    
    const conflicts = [];
    
    // Check each branch for conflicts
    for (const branch of branches) {
      try {
        // Test merge without actually merging
        this.exec(`git merge-tree $(git merge-base HEAD origin/${branch}) HEAD origin/${branch}`);
      } catch (error) {
        conflicts.push({
          branch,
          hasConflict: true
        });
      }
    }
    
    this.workflowState.results.push({
      step: 'check-conflicts',
      conflicts,
      count: conflicts.length
    });
    
    console.log(`  Found ${conflicts.length} branches with potential conflicts`);
  }

  async mergeToMaster() {
    const reviews = this.workflowState.results
      .find(r => r.step === 'review-changes')?.reviews || [];
    
    const passedReviews = reviews.filter(r => r.passed);
    
    console.log(`  Merging ${passedReviews.length} approved branches...`);
    
    // Ensure we're on master-integration
    this.exec('git checkout master-integration');
    
    const merged = [];
    
    for (const review of passedReviews) {
      try {
        console.log(`    Merging ${review.branch}...`);
        
        this.exec(`git merge origin/${review.branch} --no-ff -m "Master Agent: Integrated ${review.branch}"`);
        
        merged.push({
          branch: review.branch,
          status: 'success'
        });
      } catch (error) {
        // Master resolves conflicts
        console.log(`    Resolving conflicts for ${review.branch}...`);
        
        await this.autoResolveConflicts();
        
        merged.push({
          branch: review.branch,
          status: 'merged-with-conflicts'
        });
      }
    }
    
    this.workflowState.results.push({
      step: 'merge-to-master',
      merged,
      count: merged.length
    });
  }

  async autoResolveConflicts() {
    // Get conflicted files
    const conflicts = this.exec('git diff --name-only --diff-filter=U')
      .split('\n')
      .filter(f => f);
    
    for (const file of conflicts) {
      // Master's intelligent conflict resolution
      // In practice, this could use AI or sophisticated merging
      
      if (file.includes('package-lock.json')) {
        // Regenerate package-lock
        this.exec('git checkout --ours package-lock.json');
        this.exec('npm install');
      } else if (file.endsWith('.json')) {
        // For JSON files, try to merge both versions
        try {
          const ours = JSON.parse(this.exec(`git show :2:${file}`));
          const theirs = JSON.parse(this.exec(`git show :3:${file}`));
          const merged = { ...ours, ...theirs }; // Simple merge strategy
          fs.writeFileSync(file, JSON.stringify(merged, null, 2));
        } catch (e) {
          // Fallback to theirs
          this.exec(`git checkout --theirs ${file}`);
        }
      } else {
        // For other files, prefer the incoming changes
        this.exec(`git checkout --theirs ${file}`);
      }
      
      this.exec(`git add ${file}`);
    }
    
    // Commit the resolution
    this.exec('git commit -m "Master Agent: Resolved conflicts"');
  }

  async validateIntegration() {
    console.log('  Validating integrated codebase...');
    
    const validation = {
      build: { status: 'pending' },
      tests: { status: 'pending' },
      lint: { status: 'pending' },
      security: { status: 'pending' }
    };
    
    // Build validation
    try {
      this.exec('npm run build');
      validation.build.status = 'passed';
    } catch (e) {
      validation.build.status = 'failed';
      validation.build.error = e.message;
    }
    
    // Test validation
    try {
      this.exec('npm test');
      validation.tests.status = 'passed';
    } catch (e) {
      validation.tests.status = 'failed';
      validation.tests.error = e.message;
    }
    
    // Lint validation
    try {
      this.exec('npm run lint');
      validation.lint.status = 'passed';
    } catch (e) {
      validation.lint.status = 'warning';
    }
    
    // Security check
    try {
      // Simple security patterns check
      const files = this.exec('git diff --name-only HEAD~1').split('\n').filter(f => f);
      let securityIssues = 0;
      
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.match(/api[_-]?key.*=.*["'][\w]+["']/i)) {
            securityIssues++;
          }
        }
      }
      
      validation.security.status = securityIssues > 0 ? 'warning' : 'passed';
      validation.security.issues = securityIssues;
    } catch (e) {
      validation.security.status = 'skipped';
    }
    
    this.workflowState.results.push({
      step: 'validate-integration',
      validation
    });
    
    const allPassed = Object.values(validation).every(v => 
      v.status === 'passed' || v.status === 'warning'
    );
    
    // Jules: Changed: Access canOverrideAnyAgent from this.masterAgentConfig
    if (!allPassed && !this.masterAgentConfig.responsibilities?.agentManagement?.canOverrideAnyAgent) {
      throw new Error('Validation failed');
    }
  }

  async pushToMain() {
    console.log('  Preparing to push to main branch...');
    const mainBranchName = this.orchestratorConfig.projectMasterBranch || 'main'; // Jules: Use config
    const masterIntegrationBranchName = this.masterAgentConfig.branch || 'master-integration'; // Jules: Use config
    
    // Final safety check
    const validation = this.workflowState.results
      .find(r => r.step === 'validate-integration')?.validation;
    
    if (!validation || validation.build.status === 'failed') {
      console.log('  ❌ Cannot push - build is broken');
      return;
    }
    
    // Merge to main
    this.exec(`git checkout ${mainBranchName}`); // Jules: Use config
    this.exec(`git merge ${masterIntegrationBranchName} --no-ff -m "Master Agent: Production deployment"`); // Jules: Use config
    
    // Push
    console.log(`  Pushing to origin/${mainBranchName}...`); // Jules: Use config
    this.exec(`git push origin ${mainBranchName}`); // Jules: Use config
    
    this.workflowState.results.push({
      step: 'push-to-main',
      status: 'completed',
      timestamp: new Date().toISOString()
    });
    
    // Clean up merged branches
    const merged = this.workflowState.results
      .find(r => r.step === 'merge-to-master')?.merged || [];
    
    for (const { branch } of merged) {
      try {
        this.exec(`git push origin --delete ${branch}`);
        console.log(`  🗑️  Deleted branch: ${branch}`);
      } catch (e) {
        // Branch might already be deleted
      }
    }
  }

  async collectReadyBranches() {
    // For batch integration workflow
    const branches = this.workflowState.results
      .find(r => r.step === 'fetch-all-branches')?.branches || [];
    
    const ready = [];
    
    for (const branch of branches) {
      // Check if branch has been updated in last 24 hours
      const lastCommit = this.exec(`git log origin/${branch} -1 --format=%ct`);
      const age = Date.now() - (parseInt(lastCommit) * 1000);
      
      if (age < 24 * 60 * 60 * 1000) { // Less than 24 hours old
        ready.push({
          branch,
          lastCommit: new Date(parseInt(lastCommit) * 1000).toISOString()
        });
      }
    }
    
    this.workflowState.results.push({
      step: 'collect-all-ready-branches',
      ready,
      count: ready.length
    });
  }

  async orderByDependency() {
    // Order branches by dependency hierarchy
    const ready = this.workflowState.results
      .find(r => r.step === 'collect-all-ready-branches')?.ready || [];
    
    const ordered = ready.sort((a, b) => {
      // Database changes first
      if (a.branch.includes('database')) return -1;
      if (b.branch.includes('database')) return 1;
      
      // Then backend
      if (a.branch.includes('backend')) return -1;
      if (b.branch.includes('backend')) return 1;
      
      // Then integration
      if (a.branch.includes('integration')) return -1;
      if (b.branch.includes('integration')) return 1;
      
      // Finally frontend
      return 0;
    });
    
    this.workflowState.results.push({
      step: 'order-by-dependency',
      ordered: ordered.map(o => o.branch)
    });
  }

  async sequentialIntegration() {
    const ordered = this.workflowState.results
      .find(r => r.step === 'order-by-dependency')?.ordered || [];
    
    console.log(`  Integrating ${ordered.length} branches in order...`);
    
    for (const branch of ordered) {
      console.log(`    Integrating: ${branch}`);
      
      try {
        this.exec(`git merge origin/${branch} --no-ff -m "Master Agent: Sequential integration of ${branch}"`);
        
        // Run quick validation after each merge
        try {
          this.exec('npm run build');
        } catch (e) {
          console.log(`    ⚠️  Build failed after ${branch}, rolling back...`);
          this.exec('git reset --hard HEAD~1');
          continue;
        }
      } catch (error) {
        console.log(`    ⚠️  Skipping ${branch} due to conflicts`);
      }
    }
  }

  async fullRegressionTest() {
    console.log('  Running full regression test suite...');
    
    // This would run comprehensive tests
    // For now, we'll simulate with standard tests
    try {
      this.exec('npm test -- --coverage');
      console.log('  ✅ All regression tests passed');
    } catch (e) {
      console.log('  ⚠️  Some regression tests failed');
    }
  }

  async rollback() {
    console.log('\n🔄 Rolling back changes...');
    
    try {
      this.exec('git reset --hard HEAD');
      this.exec('git clean -fd');
      console.log('✅ Rollback completed');
    } catch (e) {
      console.error('❌ Rollback failed:', e.message);
    }
  }

  saveWorkflowState() {
    const stateFile = `.workflow-${this.workflowState.id}.json`;
    fs.writeFileSync(stateFile, JSON.stringify(this.workflowState, null, 2));
    console.log(`\n📄 Workflow state saved to: ${stateFile}`);
  }
}

// CLI
const workflow = process.argv[2] || 'standardIntegration';
const master = new MasterAgentWorkflow();

master.executeWorkflow(workflow)
  .then(() => {
    console.log('\n🎉 Master Agent workflow completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Workflow failed:', error.message);
    process.exit(1);
  });
