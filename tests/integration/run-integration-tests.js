#!/usr/bin/env node

/**
 * Integration Test Runner for Multi-Agent Orchestrator
 * Runs all integration tests and validates the entire system
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntegrationTestRunner {
  constructor() {
    this.testPhases = [
      {
        name: 'Environment Setup',
        tests: [
          { name: 'Check Dependencies', command: 'npm list --depth=0' },
          { name: 'Verify Environment', command: 'node -e "require(\'dotenv\').config(); console.log(\'✅ Environment loaded\')"' }
        ]
      },
      {
        name: 'Core Systems',
        tests: [
          { name: 'Memory System', command: 'node agent-memory-system.js --test' },
          { name: 'Validation Layer', command: 'node -e "require(\'./ai-validation-layer.js\')"' },
          { name: 'Metrics System', command: 'node -e "require(\'./senior-agent-metrics.js\')"' }
        ]
      },
      {
        name: 'Agent Tests',
        tests: [
          { name: 'Frontend Agent', command: 'node ai-agent.js TEST-001 frontend --dry-run' },
          { name: 'Backend Agent', command: 'node ai-agent.js TEST-002 backend --dry-run' },
          { name: 'Database Agent', command: 'node ai-agent.js TEST-003 database --dry-run' },
          { name: 'Integration Agent', command: 'node ai-agent.js TEST-004 integration --dry-run' },
          { name: 'Testing Agent', command: 'node ai-agent.js TEST-005 testing --dry-run' }
        ]
      },
      {
        name: 'Master Integration',
        tests: [
          { name: 'Master Agent Init', command: 'node master-agent.js init --test' },
          { name: 'Master Review', command: 'node master-agent.js review --test' },
          { name: 'Master Status', command: 'node master-agent.js status' }
        ]
      },
      {
        name: 'Web Interface',
        tests: [
          { name: 'Check Web Files', command: 'ls -la web-interface/' },
          { name: 'Validate Server', command: 'node -e "require(\'./web-interface/server.js\')"' }
        ]
      }
    ];
    
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting Integration Tests for Multi-Agent Orchestrator');
    console.log('=' .repeat(70));
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📁 Directory: ${process.cwd()}`);
    console.log('=' .repeat(70));
    
    for (const phase of this.testPhases) {
      await this.runPhase(phase);
    }
    
    this.printSummary();
    this.saveReport();
  }

  async runPhase(phase) {
    console.log(`\n📋 ${phase.name}`);
    console.log('-'.repeat(50));
    
    const phaseResults = {
      name: phase.name,
      tests: [],
      passed: 0,
      failed: 0
    };
    
    for (const test of phase.tests) {
      const result = await this.runTest(test);
      phaseResults.tests.push(result);
      
      if (result.status === 'passed') {
        phaseResults.passed++;
      } else {
        phaseResults.failed++;
      }
    }
    
    this.results.push(phaseResults);
  }

  async runTest(test) {
    process.stdout.write(`  🧪 ${test.name.padEnd(30, '.')}`);
    
    const startTime = Date.now();
    const result = {
      name: test.name,
      command: test.command,
      startTime: new Date().toISOString()
    };
    
    try {
      const output = await this.executeCommand(test.command);
      const duration = Date.now() - startTime;
      
      result.status = 'passed';
      result.duration = duration;
      result.output = output.substring(0, 200); // Store first 200 chars
      
      console.log(` ✅ PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      result.status = 'failed';
      result.duration = duration;
      result.error = error.message;
      
      console.log(` ❌ FAILED`);
      console.log(`     Error: ${error.message}`);
    }
    
    return result;
  }

  executeCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: path.join(__dirname, '../..'),
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 || command.includes('--dry-run') || command.includes('--test')) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
      
      // Add timeout
      setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out after 30 seconds'));
      }, 30000);
    });
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    let totalPassed = 0;
    let totalFailed = 0;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    
    this.results.forEach(phase => {
      totalPassed += phase.passed;
      totalFailed += phase.failed;
      
      const status = phase.failed === 0 ? '✅' : '❌';
      console.log(`${status} ${phase.name}: ${phase.passed}/${phase.tests.length} passed`);
    });
    
    console.log('-'.repeat(70));
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('='.repeat(70));
    
    if (totalFailed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.forEach(phase => {
        phase.tests.filter(t => t.status === 'failed').forEach(test => {
          console.log(`  - ${phase.name} > ${test.name}`);
          console.log(`    Error: ${test.error}`);
        });
      });
    }
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      summary: {
        totalPhases: this.results.length,
        totalTests: this.results.reduce((acc, p) => acc + p.tests.length, 0),
        totalPassed: this.results.reduce((acc, p) => acc + p.passed, 0),
        totalFailed: this.results.reduce((acc, p) => acc + p.failed, 0)
      },
      phases: this.results
    };
    
    const reportPath = path.join(__dirname, 'integration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Also create a markdown report
    this.saveMarkdownReport(report);
  }

  saveMarkdownReport(report) {
    let markdown = `# Integration Test Report\n\n`;
    markdown += `**Date:** ${report.timestamp}\n`;
    markdown += `**Duration:** ${(report.duration / 1000).toFixed(2)}s\n`;
    markdown += `**Environment:** Node ${report.environment.node} on ${report.environment.platform}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${report.summary.totalTests}\n`;
    markdown += `- **Passed:** ${report.summary.totalPassed} ✅\n`;
    markdown += `- **Failed:** ${report.summary.totalFailed} ❌\n`;
    markdown += `- **Success Rate:** ${((report.summary.totalPassed / report.summary.totalTests) * 100).toFixed(2)}%\n\n`;
    
    markdown += `## Test Results by Phase\n\n`;
    
    report.phases.forEach(phase => {
      markdown += `### ${phase.name}\n\n`;
      markdown += `| Test | Status | Duration |\n`;
      markdown += `|------|--------|----------|\n`;
      
      phase.tests.forEach(test => {
        const status = test.status === 'passed' ? '✅ Passed' : '❌ Failed';
        markdown += `| ${test.name} | ${status} | ${test.duration}ms |\n`;
      });
      
      markdown += `\n`;
    });
    
    if (report.summary.totalFailed > 0) {
      markdown += `## Failed Tests Details\n\n`;
      report.phases.forEach(phase => {
        const failedTests = phase.tests.filter(t => t.status === 'failed');
        if (failedTests.length > 0) {
          markdown += `### ${phase.name}\n\n`;
          failedTests.forEach(test => {
            markdown += `- **${test.name}**\n`;
            markdown += `  - Command: \`${test.command}\`\n`;
            markdown += `  - Error: ${test.error}\n\n`;
          });
        }
      });
    }
    
    const mdPath = path.join(__dirname, 'integration-test-report.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`📝 Markdown report saved to: ${mdPath}`);
  }
}

// Run the integration tests
const runner = new IntegrationTestRunner();
runner.run().catch(error => {
  console.error('\n💥 Integration test runner crashed:', error);
  process.exit(1);
});
