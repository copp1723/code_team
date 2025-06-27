#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Starting Quick Cleanup of Multi-Agent Orchestrator...\n');

// Files to definitely remove
const JUNK_FILES = [
  // Temporary and lock files
  '.agent-locks.json',
  '.agent-status.json',
  '.pending-reviews.json',
  '.master-agent.log',
  '.DS_Store',
  
  // Old/backup files
  'agent-orchestrator.config.old.json',
  
  // Test scripts that should be in tests/
  'test-direct.js',
  'test-models.js',
  'test-openrouter.js',
  'test-setup.sh',
  'test-ai-setup.sh',
  'test-senior-upgrade.sh',
  
  // Duplicate/deprecated scripts
  'get-all-models.js',
  'list-models.js',
  'analyze-conflicts.js',
  'run-ticket-005.sh',
  'quick-resolve.sh',
  'resolve-conflicts-ticket-002.sh',
  'execute-resolution.sh',
  'run-complete-resolution.sh',
  'run-git-commands.sh',
  
  // Migration/setup scripts that are one-time use
  'ticket002_migration.sql',
  'uploaded-tickets.txt',
  'tickets.txt',
  
  // Launcher files (should be in scripts/)
  'Launch-Orchestrator.command',
  'Launch-Orchestrator-Fixed.command',
  'Stop-Orchestrator.command',
  
  // Implementation notes (should be in docs/)
  'AGENT_IMPROVEMENTS.md',
  'HANDOFF_MULTI_AGENT_AI_SYSTEM.md',
  'MULTI_AGENT_GUIDE.md',
  'MIGRATION_SUMMARY.md',
  'CORRECTED_IMPLEMENTATION.md',
  'IMPLEMENTATION_COMPLETE.md',
  'SENIOR_AGENT_GUIDE.md',
  'SENIOR_AGENT_COMPLETE_GUIDE.md',
  
  // Shell scripts that should be consolidated
  'check-files.sh',
  'complete-integration.sh',
  'copy-orchestrator-files.sh',
  'fix-senior-implementation.sh',
  'IMPLEMENTATION_READY.sh',
  'make-executable.sh',
  'make-real-executable.sh',
  'move-from-rylie.sh',
  'start-senior-web.sh',
  'start.bat',
  
  // Verification scripts
  'verify-senior-upgrade.js',
  'verify-setup.js',
  
  // Sprint/planning files
  'sprint-dependencies.json',
  'sprint.js',
  
  // Model data (should be in config/)
  'available-models.json'
];

// Patterns for files to remove
const JUNK_PATTERNS = [
  /^\.ai-.*\.md$/,          // AI planning files
  /^\..*\.json$/,           // Hidden JSON files
  /\.log$/,                 // Log files
  /\.tmp$/,                 // Temp files
  /\.bak$/,                 // Backup files
  /^test-.*\.(js|sh)$/      // Test scripts
];

function shouldRemove(filename) {
  // Check exact matches
  if (JUNK_FILES.includes(filename)) {
    return true;
  }
  
  // Check patterns
  return JUNK_PATTERNS.some(pattern => pattern.test(filename));
}

function cleanup() {
  const files = fs.readdirSync(process.cwd());
  const removed = [];
  const kept = [];
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && shouldRemove(file)) {
      const size = stat.size;
      try {
        fs.unlinkSync(filePath);
        removed.push({ file, size });
        totalSize += size;
      } catch (err) {
        console.error(`❌ Failed to remove ${file}: ${err.message}`);
      }
    } else if (stat.isFile()) {
      kept.push(file);
    }
  });
  
  // Summary
  console.log('🗑️  Cleanup Summary:\n');
  console.log(`✅ Removed ${removed.length} files (${(totalSize / 1024).toFixed(2)} KB)`);
  
  if (removed.length > 0) {
    console.log('\nRemoved files:');
    removed.forEach(({ file, size }) => {
      console.log(`  - ${file} (${(size / 1024).toFixed(2)} KB)`);
    });
  }
  
  console.log(`\n📁 Kept ${kept.length} files for manual review:`);
  
  // Group remaining files by type
  const groups = {
    agents: kept.filter(f => f.includes('agent')),
    orchestrators: kept.filter(f => f.includes('orchestrator')),
    web: kept.filter(f => f.includes('web') || f.includes('dashboard')),
    config: kept.filter(f => f.endsWith('.json')),
    scripts: kept.filter(f => f.endsWith('.js') || f.endsWith('.sh')),
    docs: kept.filter(f => f.endsWith('.md')),
    other: []
  };
  
  // Remove duplicates and add to other
  const categorized = new Set();
  Object.entries(groups).forEach(([type, files]) => {
    if (type !== 'other') {
      files.forEach(f => categorized.add(f));
    }
  });
  
  groups.other = kept.filter(f => !categorized.has(f));
  
  // Display groups
  Object.entries(groups).forEach(([type, files]) => {
    if (files.length > 0) {
      console.log(`\n${type.toUpperCase()}:`);
      files.forEach(f => console.log(`  - ${f}`));
    }
  });
  
  console.log('\n✨ Quick cleanup complete!');
  console.log('\nNext steps:');
  console.log('1. Review remaining files');
  console.log('2. Run the full migration script: node scripts/migrate-to-clean-architecture.js');
  console.log('3. Test the refactored structure');
}

// Run cleanup
cleanup();