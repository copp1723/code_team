#!/usr/bin/env node

/**
 * Multi-Agent Orchestrator - Enhanced Launch Script
 * Starts the complete system with all senior-level agent capabilities
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class SystemLauncher {
  constructor() {
    this.processes = new Map();
    this.startTime = Date.now();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async launch() {
    console.clear();
    this.printBanner();
    
    try {
      // 1. Check prerequisites
      await this.checkPrerequisites();
      
      // 2. Initialize systems
      await this.initializeSystems();
      
      // 3. Start core services
      await this.startCoreServices();
      
      // 4. Launch web interface
      await this.launchWebInterface();
      
      // 5. Display status
      this.displayStatus();
      
      // 6. Setup handlers
      this.setupHandlers();
      
    } catch (error) {
      this.log(`\n❌ Launch failed: ${error.message}`, 'red');
      this.cleanup();
      process.exit(1);
    }
  }

  printBanner() {
    console.log(colors.cyan + `
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🤖  MULTI-AGENT ORCHESTRATOR - ENHANCED EDITION  🤖            ║
║                                                                  ║
║   All agents now operate with senior-level capabilities          ║
║   Powered by advanced AI and intelligent memory systems          ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
` + colors.reset);
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking prerequisites...', 'yellow');
    
    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`  ✓ Node.js ${nodeVersion}`, 'green');
    
    // Check required files
    const requiredFiles = [
      '.env',
      'package.json',
      'orchestrator.js',
      'master-agent.js',
      'ai-agent.js',
      'agent-memory-system.js',
      'web-interface/server.js'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    this.log('  ✓ All required files present', 'green');
    
    // Check dependencies
    try {
      require('dotenv').config();
      this.log('  ✓ Environment loaded', 'green');
    } catch (e) {
      throw new Error('Failed to load environment: ' + e.message);
    }
    
    // Check API configuration
    if (!process.env.OPENROUTER_API_KEY) {
      this.log('  ⚠️  Warning: OPENROUTER_API_KEY not set in .env', 'yellow');
      this.log('     AI features will be limited', 'yellow');
    } else {
      this.log('  ✓ API key configured', 'green');
    }
  }

  async initializeSystems() {
    this.log('\n🚀 Initializing systems...', 'yellow');
    
    // Initialize memory system
    this.log('  📧 Initializing agent memory system...', 'cyan');
    await this.runCommand('node agent-memory-system.js init');
    this.log('  ✓ Memory system initialized', 'green');
    
    // Initialize knowledge bases
    const agentTypes = ['frontend', 'backend', 'database', 'integration', 'testing'];
    for (const agent of agentTypes) {
      this.log(`  📚 Loading ${agent} knowledge base...`, 'cyan');
      await this.runCommand(`node agent-memory-system.js init-knowledge ${agent}`);
    }
    this.log('  ✓ All knowledge bases loaded', 'green');
    
    // Initialize master agent
    this.log('  👑 Initializing master agent...', 'cyan');
    await this.runCommand('node master-agent.js init');
    this.log('  ✓ Master agent ready', 'green');
  }

  async startCoreServices() {
    this.log('\n⚙️  Starting core services...', 'yellow');
    
    // Start resource monitor
    this.log('  📊 Starting resource monitor...', 'cyan');
    const monitor = this.startProcess('resource-monitor', 'node', ['resource-monitor.js']);
    this.processes.set('monitor', monitor);
    
    // Start metrics collector
    this.log('  📈 Starting metrics collector...', 'cyan');
    const metrics = this.startProcess('metrics', 'node', ['senior-agent-metrics.js', '--daemon']);
    this.processes.set('metrics', metrics);
    
    this.log('  ✓ Core services running', 'green');
  }

  async launchWebInterface() {
    this.log('\n🌐 Launching web interface...', 'yellow');
    
    // Check if port is available
    const port = process.env.PORT || 8080;
    
    // Start the web server
    const webServer = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, 'web-interface'),
      env: { ...process.env, PORT: port }
    });
    
    this.processes.set('web-server', webServer);
    
    // Wait for server to start
    await new Promise(resolve => {
      webServer.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('running on')) {
          resolve();
        }
      });
    });
    
    this.log(`  ✓ Web interface running on http://localhost:${port}`, 'green');
  }

  displayStatus() {
    console.log('\n' + '═'.repeat(70));
    this.log('✅ SYSTEM READY', 'bright');
    console.log('═'.repeat(70));
    
    const port = process.env.PORT || 8080;
    
    console.log('\n📋 Quick Start Guide:');
    console.log(`
  1. Open your browser to: ${colors.cyan}http://localhost:${port}${colors.reset}
  
  2. Use the web interface to:
     • Create and manage tickets
     • Assign enhanced agents to tasks
     • Monitor agent progress
     • Review and integrate work
  
  3. Command line options:
     • ${colors.yellow}npm run senior-agent TICKET-ID agent-type${colors.reset}
     • ${colors.yellow}npm run master review${colors.reset}
     • ${colors.yellow}npm run metrics${colors.reset}
  
  4. Available enhanced agents:
     • ${colors.green}frontend${colors.reset} - React, performance, accessibility
     • ${colors.green}backend${colors.reset} - APIs, microservices, security
     • ${colors.green}database${colors.reset} - Schema design, optimization
     • ${colors.green}integration${colors.reset} - API gateway, event-driven
     • ${colors.green}testing${colors.reset} - Comprehensive test suites
`);
    
    console.log('═'.repeat(70));
    this.log('\n💡 Press Ctrl+C to stop all services\n', 'yellow');
  }

  setupHandlers() {
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n\n🛑 Shutting down...', 'yellow');
      this.cleanup();
    });
    
    process.on('SIGTERM', () => {
      this.cleanup();
    });
    
    // Monitor processes
    this.processes.forEach((proc, name) => {
      proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          this.log(`\n⚠️  Service '${name}' exited with code ${code}`, 'red');
        }
        this.processes.delete(name);
        
        // If web server crashes, exit
        if (name === 'web-server') {
          this.log('Web server stopped. Shutting down...', 'red');
          this.cleanup();
        }
      });
      
      proc.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error && !error.includes('DeprecationWarning')) {
          this.log(`\n⚠️  ${name} error: ${error}`, 'red');
        }
      });
    });
  }

  startProcess(name, command, args) {
    const proc = spawn(command, args, {
      env: process.env,
      detached: false
    });
    
    // Log output if in debug mode
    if (process.env.DEBUG) {
      proc.stdout.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
      });
    }
    
    return proc;
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error && !stderr.includes('test mode')) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  cleanup() {
    this.log('\nCleaning up...', 'yellow');
    
    // Kill all child processes
    this.processes.forEach((proc, name) => {
      this.log(`  Stopping ${name}...`, 'cyan');
      proc.kill('SIGTERM');
    });
    
    // Close readline interface
    this.rl.close();
    
    const runtime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.log(`\n✅ System stopped. Runtime: ${runtime}s`, 'green');
    
    process.exit(0);
  }
}

// Auto-launch improvements check
async function checkForImprovements() {
  console.log('\n🔍 Checking for system improvements...\n');
  
  const improvements = [
    {
      name: 'Performance Monitoring',
      check: () => fs.existsSync('performance-monitor.js'),
      suggestion: 'Add real-time performance monitoring dashboard'
    },
    {
      name: 'Auto-scaling',
      check: () => fs.existsSync('auto-scaler.js'),
      suggestion: 'Implement automatic agent scaling based on workload'
    },
    {
      name: 'Backup System',
      check: () => fs.existsSync('backup-system.js'),
      suggestion: 'Add automated backup for agent memories and states'
    },
    {
      name: 'Analytics Dashboard',
      check: () => fs.existsSync('web-interface/analytics.html'),
      suggestion: 'Create analytics dashboard for agent performance'
    },
    {
      name: 'CI/CD Integration',
      check: () => fs.existsSync('.github/workflows/ci.yml'),
      suggestion: 'Set up continuous integration and deployment'
    }
  ];
  
  const missing = improvements.filter(imp => !imp.check());
  
  if (missing.length > 0) {
    console.log('💡 Suggested improvements for better user experience:\n');
    missing.forEach((imp, index) => {
      console.log(`  ${index + 1}. ${imp.name}`);
      console.log(`     ${colors.cyan}${imp.suggestion}${colors.reset}\n`);
    });
    
    console.log('Would you like to implement these improvements? (y/n)');
    
    // Add improvement implementation logic here
  } else {
    console.log('✅ All recommended improvements are already implemented!\n');
  }
}

// Main execution
async function main() {
  // Check for improvements first
  await checkForImprovements();
  
  // Launch the system
  const launcher = new SystemLauncher();
  await launcher.launch();
}

// Start the system
main().catch(error => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
