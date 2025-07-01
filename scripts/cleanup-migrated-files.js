#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up migrated files from root...\n');

// Files that were successfully migrated and can be removed from root
const MIGRATED_FILES = [
  'agent-memory-system.js',
  'agent-orchestrator.config.json',
  'agent-task.js',
  'ai-agent-engine.js',
  'ai-agent.js',
  'ai-validation-layer.js',
  'ai-workflow.js',
  'enhanced-orchestrator.js',
  'enhancement-ai-agents.js',
  'failure-recovery.js',
  'master-agent-config.json',
  'master-agent.js',
  'master-dashboard.html',
  'master-dispatcher.js',
  'master-workflow.js',
  'orchestrator.js',
  'quick-setup.js',
  'quick-start.sh',
  'resource-monitor.js',
  'restart-web-interface.sh',
  'senior-agent-metrics.js',
  'senior-ai-agent.js',
  // 'senior-enhanced-agent.js', // Removed as it's been deleted
  'setup-agents.sh',
  'setup-voice-agent.sh',
  'start-ai.sh',
  'start-real-web.sh',
  'start.sh'
];

// Files to move to docs/
const DOCS_FILES = [
  'HANDOFF-NOTE.md',
  'REFACTORING_PLAN.md',
  'WEB_INTERFACE_FIXES.md'
];

// Files to keep in root
const KEEP_IN_ROOT = [
  '.env',
  '.env.example',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'README.md',
  'README-LAUNCHER.md'
];

function cleanup() {
  let removed = 0;
  let moved = 0;
  let errors = 0;

  // Remove migrated files
  console.log('Removing duplicated files from root:');
  MIGRATED_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`  ✅ Removed: ${file}`);
        removed++;
      } catch (err) {
        console.error(`  ❌ Failed to remove ${file}: ${err.message}`);
        errors++;
      }
    }
  });

  // Move documentation files
  console.log('\nMoving documentation files:');
  DOCS_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const destPath = path.join('docs', file);
        fs.renameSync(file, destPath);
        console.log(`  ✅ Moved: ${file} → docs/`);
        moved++;
      } catch (err) {
        console.error(`  ❌ Failed to move ${file}: ${err.message}`);
        errors++;
      }
    }
  });

  // Move remaining useful files
  console.log('\nMoving remaining implementation files:');
  const remainingFiles = [
    'enhancement-distributed-orchestration.js',
    'human-oversight.js',
    'implement-ux-improvements.js',
    'launch-enhanced-system.js'
  ];

  remainingFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const destPath = path.join('src/infrastructure/monitoring', file);
        fs.renameSync(file, destPath);
        console.log(`  ✅ Moved: ${file} → src/infrastructure/monitoring/`);
        moved++;
      } catch (err) {
        console.error(`  ❌ Failed to move ${file}: ${err.message}`);
        errors++;
      }
    }
  });

  // Summary
  console.log('\n📊 Cleanup Summary:');
  console.log(`  ✅ Removed: ${removed} files`);
  console.log(`  📁 Moved: ${moved} files`);
  if (errors > 0) {
    console.log(`  ❌ Errors: ${errors}`);
  }

  // Show what's left
  const remaining = fs.readdirSync('.').filter(f => {
    const stat = fs.statSync(f);
    return stat.isFile() && !f.startsWith('.');
  });

  console.log('\n📁 Files remaining in root:');
  remaining.forEach(file => {
    const status = KEEP_IN_ROOT.includes(file) ? '✅' : '⚠️';
    console.log(`  ${status} ${file}`);
  });

  console.log('\n✨ Cleanup complete!');
  console.log('\nYour project structure is now clean and organized!');
  console.log('Next steps:');
  console.log('1. Update imports in the migrated files');
  console.log('2. Install any missing dependencies');
  console.log('3. Test the application');
  console.log('4. Commit the new structure');
}

// Run cleanup
cleanup();