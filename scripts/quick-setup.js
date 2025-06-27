#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Multi-Agent Orchestrator Quick Setup\n');

// Check Node.js version
const nodeVersion = process.version;
console.log(`✅ Node.js ${nodeVersion} detected`);

// Check if git is installed
try {
  execSync('git --version', { stdio: 'ignore' });
  console.log('✅ Git is installed');
} catch (e) {
  console.error('❌ Git is not installed. Please install Git first.');
  process.exit(1);
}

// Initialize git if needed
if (!fs.existsSync('.git')) {
  console.log('📁 Initializing Git repository...');
  execSync('git init');
  console.log('✅ Git repository initialized');
}

// Check for .env file
if (!fs.existsSync('.env')) {
  console.log('\n⚠️  No .env file found');
  
  if (fs.existsSync('.env.example')) {
    console.log('📄 Copying .env.example to .env...');
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ .env file created');
    console.log('\n⚠️  IMPORTANT: Edit .env and add your OpenRouter API key!');
  }
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Root dependencies installed');
} catch (e) {
  console.error('❌ Failed to install root dependencies');
}

// Install web interface dependencies
if (fs.existsSync('web-interface/package.json')) {
  console.log('\n📦 Installing web interface dependencies...');
  try {
    execSync('cd web-interface && npm install', { stdio: 'inherit' });
    console.log('✅ Web interface dependencies installed');
  } catch (e) {
    console.error('❌ Failed to install web interface dependencies');
  }
}

// Create a test project if needed
const testProjectPath = '../test-project';
if (!fs.existsSync(testProjectPath)) {
  console.log('\n📁 Creating test project...');
  
  fs.mkdirSync(testProjectPath, { recursive: true });
  
  // Initialize test project
  process.chdir(testProjectPath);
  execSync('git init');
  execSync('npm init -y');
  
  // Create basic structure
  const dirs = [
    'src/components',
    'src/pages', 
    'src/server/api',
    'src/lib',
    'prisma',
    'tests'
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  📁 Created ${dir}`);
  });
  
  // Create basic files
  fs.writeFileSync('README.md', '# Test Project\n\nThis is a test project for the Multi-Agent Orchestrator.');
  fs.writeFileSync('prisma/schema.prisma', `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`);
  
  fs.writeFileSync('.gitignore', `node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log`);
  
  // Create package.json with scripts
  const testPackageJson = {
    name: "test-project",
    version: "1.0.0",
    scripts: {
      "dev": "echo 'Development server'",
      "build": "echo 'Building project'",
      "test": "echo 'Running tests'",
      "lint": "echo 'Linting code'"
    }
  };
  fs.writeFileSync('package.json', JSON.stringify(testPackageJson, null, 2));
  
  execSync('git add .');
  execSync('git commit -m "Initial test project setup"');
  
  console.log('✅ Test project created at ../test-project');
  
  // Change back to orchestrator directory
  process.chdir('../multi-agent-orchestrator');
}

// Update config to point to test project
console.log('\n⚙️  Updating configuration...');
const configPath = 'agent-orchestrator.config.json';
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.project.localPath = '../test-project';
  config.project.name = 'test-project';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Configuration updated to use test project');
}

// Create initial tickets
if (!fs.existsSync('tickets.txt')) {
  console.log('\n📝 Creating sample tickets...');
  const sampleTickets = `TICKET-001: Create user authentication component
- Should have login and signup forms
- Use React hooks for state management
- Include form validation
- Dependencies: None

TICKET-002: Add API endpoint for user registration
- POST /api/auth/register
- Validate email and password
- Hash password with bcrypt
- Return JWT token
- Dependencies: TICKET-001

TICKET-003: Create user profile page
- Display user information
- Allow editing of profile
- Include avatar upload
- Dependencies: TICKET-001, TICKET-002
`;
  fs.writeFileSync('tickets.txt', sampleTickets);
  console.log('✅ Sample tickets created');
}

console.log('\n🎉 Setup Complete!\n');
console.log('Next steps:');
console.log('1. Edit .env and add your OpenRouter API key');
console.log('2. Run "node master-agent.js init" to initialize the master agent');
console.log('3. Run "npm run web" to start the web interface');
console.log('4. Visit http://localhost:8080 to use the dashboard');
console.log('\nOr run "node ai-agent.js interactive" to start developing with AI!');
