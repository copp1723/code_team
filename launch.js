// Direct launch script for the web interface
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Multi-Agent Orchestrator - Direct Launch');
console.log('==========================================');

const projectRoot = '/Users/copp1723/Desktop/multi-agent-orchestrator';
const webInterfacePath = path.join(projectRoot, 'web-interface');

// Ensure logs directory exists
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Kill existing processes on port 8080
console.log('🛑 Cleaning up existing processes...');
try {
  const { execSync } = require('child_process');
  execSync('lsof -ti:8080 | xargs kill -9', { stdio: 'ignore' });
} catch (e) {
  // No processes to kill
}

// Start web interface
console.log('🌐 Starting web interface...');
console.log(`📁 Working directory: ${webInterfacePath}`);

const webProcess = spawn('node', ['server-real.js'], {
  cwd: webInterfacePath,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

// Handle web interface output
webProcess.stdout.on('data', (data) => {
  console.log(`[WEB] ${data.toString().trim()}`);
});

webProcess.stderr.on('data', (data) => {
  console.error(`[WEB ERROR] ${data.toString().trim()}`);
});

// Handle process events
webProcess.on('spawn', () => {
  console.log('✅ Web interface process spawned');
  console.log('📊 Dashboard should be available at: http://localhost:8080');
  
  // Test the connection after a delay
  setTimeout(() => {
    console.log('🔍 Testing connection...');
    const http = require('http');
    const req = http.get('http://localhost:8080', (res) => {
      console.log('✅ Web interface is responding!');
      console.log('🎉 System is ready!');
    });
    
    req.on('error', (err) => {
      console.log('⚠️  Web interface may still be starting up...');
    });
    
    req.setTimeout(5000);
  }, 3000);
});

webProcess.on('error', (error) => {
  console.error('❌ Failed to start web interface:', error.message);
});

webProcess.on('exit', (code) => {
  console.log(`Web interface exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  webProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('📝 Web interface starting... (Press Ctrl+C to stop)');
