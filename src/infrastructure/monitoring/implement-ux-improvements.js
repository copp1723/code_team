#!/usr/bin/env node

/**
 * Multi-Agent Orchestrator - UX Improvements Module
 * Enhances user experience with additional features
 */

const fs = require('fs');
const path = require('path');

class UXImprovements {
  constructor() {
    this.improvements = [];
  }

  async implement() {
    console.log('🎨 Implementing UX Improvements...\n');
    
    // 1. Create performance monitoring dashboard
    await this.createPerformanceDashboard();
    
    // 2. Add auto-complete for commands
    await this.addAutoComplete();
    
    // 3. Create agent activity visualizer
    await this.createActivityVisualizer();
    
    // 4. Add notification system
    await this.addNotificationSystem();
    
    // 5. Create quick action shortcuts
    await this.createQuickActions();
    
    // 6. Add dark mode support
    await this.addDarkMode();
    
    // 7. Create status bar component
    await this.createStatusBar();
    
    console.log('\n✅ UX improvements implemented successfully!');
    this.generateReport();
  }

  async createPerformanceDashboard() {
    console.log('📊 Creating performance dashboard...');
    
    const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Performance Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .metric-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #2196F3;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .chart-container {
            height: 200px;
            margin-top: 20px;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>Agent Performance Dashboard</h1>
    <div class="dashboard">
        <div class="metric-card">
            <div class="metric-value" id="activeAgents">0</div>
            <div class="metric-label">Active Agents</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="tasksCompleted">0</div>
            <div class="metric-label">Tasks Completed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="avgResponseTime">0ms</div>
            <div class="metric-label">Avg Response Time</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="successRate">0%</div>
            <div class="metric-label">Success Rate</div>
        </div>
    </div>
    <div class="metric-card">
        <canvas id="performanceChart"></canvas>
    </div>
    <script>
        // WebSocket connection for real-time updates
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics-update') {
                updateMetrics(data.metrics);
            }
        };
        
        function updateMetrics(metrics) {
            document.getElementById('activeAgents').textContent = metrics.activeAgents || 0;
            document.getElementById('tasksCompleted').textContent = metrics.tasksCompleted || 0;
            document.getElementById('avgResponseTime').textContent = (metrics.avgResponseTime || 0) + 'ms';
            document.getElementById('successRate').textContent = (metrics.successRate || 0) + '%';
        }
        
        // Initialize chart
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Agent Performance',
                    data: [],
                    borderColor: '#2196F3',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    </script>
</body>
</html>`;

    fs.writeFileSync(
      path.join(__dirname, 'web-interface/performance-dashboard.html'),
      dashboardHTML
    );
    
    this.improvements.push('Performance Dashboard');
  }

  async addAutoComplete() {
    console.log('🔤 Adding command auto-complete...');
    
    const autoCompleteJS = `
// Auto-complete functionality for terminal commands
class AutoComplete {
  constructor() {
    this.commands = [
      'assign-agent',
      'create-ticket',
      'master-integration',
      'get-status',
      'run-ai-workflow',
      'generate-report',
      'init-agent-knowledge',
      'get-agent-metrics'
    ];
    
    this.agentTypes = ['frontend', 'backend', 'database', 'integration', 'testing'];
  }
  
  suggest(input) {
    const suggestions = this.commands.filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase())
    );
    return suggestions;
  }
  
  attachToInput(inputElement) {
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    suggestionBox.style.cssText = \`
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      display: none;
      z-index: 1000;
    \`;
    
    inputElement.parentNode.appendChild(suggestionBox);
    
    inputElement.addEventListener('input', (e) => {
      const value = e.target.value;
      const suggestions = this.suggest(value);
      
      if (suggestions.length > 0 && value.length > 0) {
        suggestionBox.innerHTML = suggestions.map(s => 
          \`<div class="suggestion-item" style="padding: 8px; cursor: pointer;">\${s}</div>\`
        ).join('');
        suggestionBox.style.display = 'block';
        
        // Position below input
        const rect = inputElement.getBoundingClientRect();
        suggestionBox.style.left = rect.left + 'px';
        suggestionBox.style.top = (rect.bottom + 2) + 'px';
        suggestionBox.style.width = rect.width + 'px';
      } else {
        suggestionBox.style.display = 'none';
      }
    });
    
    suggestionBox.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-item')) {
        inputElement.value = e.target.textContent;
        suggestionBox.style.display = 'none';
        inputElement.focus();
      }
    });
  }
}

// Export for use in web interface
window.AutoComplete = AutoComplete;
`;

    fs.writeFileSync(
      path.join(__dirname, 'web-interface/autocomplete.js'),
      autoCompleteJS
    );
    
    this.improvements.push('Command Auto-Complete');
  }

  async createActivityVisualizer() {
    console.log('📈 Creating agent activity visualizer...');
    
    const visualizerComponent = `
<!-- Agent Activity Visualizer Component -->
<div class="activity-visualizer">
  <style>
    .activity-visualizer {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .agent-timeline {
      display: flex;
      gap: 10px;
      margin: 20px 0;
    }
    
    .agent-track {
      flex: 1;
      background: #f0f0f0;
      border-radius: 4px;
      padding: 10px;
      min-height: 100px;
    }
    
    .activity-block {
      background: #4CAF50;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      margin: 5px 0;
      font-size: 12px;
      animation: slideIn 0.3s ease-out;
    }
    
    .activity-block.processing {
      background: #2196F3;
    }
    
    .activity-block.error {
      background: #f44336;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(-20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  </style>
  
  <h3>Agent Activity Timeline</h3>
  <div class="agent-timeline">
    <div class="agent-track" data-agent="frontend">
      <h4>Frontend</h4>
      <div class="activities"></div>
    </div>
    <div class="agent-track" data-agent="backend">
      <h4>Backend</h4>
      <div class="activities"></div>
    </div>
    <div class="agent-track" data-agent="database">
      <h4>Database</h4>
      <div class="activities"></div>
    </div>
    <div class="agent-track" data-agent="integration">
      <h4>Integration</h4>
      <div class="activities"></div>
    </div>
    <div class="agent-track" data-agent="testing">
      <h4>Testing</h4>
      <div class="activities"></div>
    </div>
  </div>
</div>

<script>
  // Activity tracking
  function addActivity(agent, activity, status = 'processing') {
    const track = document.querySelector(\`.agent-track[data-agent="\${agent}"] .activities\`);
    if (track) {
      const block = document.createElement('div');
      block.className = \`activity-block \${status}\`;
      block.textContent = activity;
      track.insertBefore(block, track.firstChild);
      
      // Keep only last 5 activities
      while (track.children.length > 5) {
        track.removeChild(track.lastChild);
      }
    }
  }
  
  // Listen for activity updates
  if (window.ws) {
    window.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'agent-activity') {
        addActivity(data.agent, data.activity, data.status);
      }
    });
  }
</script>
`;

    // Add to existing index.html
    const indexPath = path.join(__dirname, 'web-interface/index.html');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      if (!content.includes('activity-visualizer')) {
        // Insert before closing body tag
        content = content.replace('</body>', visualizerComponent + '\n</body>');
        fs.writeFileSync(indexPath, content);
      }
    }
    
    this.improvements.push('Activity Visualizer');
  }

  async addNotificationSystem() {
    console.log('🔔 Adding notification system...');
    
    const notificationJS = `
// Notification System for Multi-Agent Orchestrator
class NotificationSystem {
  constructor() {
    this.queue = [];
    this.container = this.createContainer();
  }
  
  createContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    \`;
    document.body.appendChild(container);
    return container;
  }
  
  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = \`notification notification-\${type}\`;
    notification.style.cssText = \`
      background: white;
      padding: 15px 20px;
      margin-bottom: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideInRight 0.3s ease-out;
      position: relative;
      overflow: hidden;
    \`;
    
    const icon = this.getIcon(type);
    const content = \`
      <span style="font-size: 20px;">\${icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 500; margin-bottom: 2px;">\${this.getTitle(type)}</div>
        <div style="font-size: 14px; color: #666;">\${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; padding: 5px;">✕</button>
    \`;
    
    notification.innerHTML = content;
    
    // Add progress bar for auto-dismiss
    const progress = document.createElement('div');
    progress.style.cssText = \`
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: \${this.getColor(type)};
      animation: progress \${duration}ms linear;
    \`;
    notification.appendChild(progress);
    
    this.container.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
  
  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }
  
  getTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information'
    };
    return titles[type] || titles.info;
  }
  
  getColor(type) {
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };
    return colors[type] || colors.info;
  }
}

// CSS animations
const style = document.createElement('style');
style.textContent = \`
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }
\`;
document.head.appendChild(style);

// Initialize notification system
window.notifications = new NotificationSystem();
`;

    fs.writeFileSync(
      path.join(__dirname, 'web-interface/notifications.js'),
      notificationJS
    );
    
    this.improvements.push('Notification System');
  }

  async createQuickActions() {
    console.log('⚡ Creating quick action shortcuts...');
    
    const quickActionsHTML = `
<!-- Quick Actions Bar -->
<div class="quick-actions" style="
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  padding: 10px 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  display: flex;
  gap: 10px;
  z-index: 1000;
">
  <button class="quick-action" onclick="quickAction('create-ticket')" title="Create Ticket (Ctrl+T)">
    <span>🎫</span>
  </button>
  <button class="quick-action" onclick="quickAction('assign-agent')" title="Assign Agent (Ctrl+A)">
    <span>🤖</span>
  </button>
  <button class="quick-action" onclick="quickAction('status')" title="System Status (Ctrl+S)">
    <span>📊</span>
  </button>
  <button class="quick-action" onclick="quickAction('master-review')" title="Master Review (Ctrl+R)">
    <span>👑</span>
  </button>
  <button class="quick-action" onclick="quickAction('metrics')" title="View Metrics (Ctrl+M)">
    <span>📈</span>
  </button>
  <button class="quick-action" onclick="quickAction('terminal')" title="Terminal (Ctrl+\`)">
    <span>💻</span>
  </button>
</div>

<style>
  .quick-action {
    background: transparent;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .quick-action:hover {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(1.1);
  }
  
  .quick-action:active {
    transform: scale(0.95);
  }
</style>

<script>
  // Quick action handler
  function quickAction(action) {
    switch(action) {
      case 'create-ticket':
        document.querySelector('[onclick*="showTicketForm"]')?.click();
        break;
      case 'assign-agent':
        document.querySelector('[onclick*="showAssignForm"]')?.click();
        break;
      case 'status':
        sendCommand('get-status');
        break;
      case 'master-review':
        sendCommand('master-integration');
        break;
      case 'metrics':
        window.open('performance-dashboard.html', '_blank');
        break;
      case 'terminal':
        document.getElementById('terminal')?.scrollIntoView();
        break;
    }
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          quickAction('create-ticket');
          break;
        case 'a':
          e.preventDefault();
          quickAction('assign-agent');
          break;
        case 's':
          e.preventDefault();
          quickAction('status');
          break;
        case 'r':
          e.preventDefault();
          quickAction('master-review');
          break;
        case 'm':
          e.preventDefault();
          quickAction('metrics');
          break;
        case '\`':
          e.preventDefault();
          quickAction('terminal');
          break;
      }
    }
  });
</script>
`;

    // Add to index.html
    const indexPath = path.join(__dirname, 'web-interface/index.html');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      if (!content.includes('quick-actions')) {
        content = content.replace('</body>', quickActionsHTML + '\n</body>');
        fs.writeFileSync(indexPath, content);
      }
    }
    
    this.improvements.push('Quick Actions Bar');
  }

  async addDarkMode() {
    console.log('🌙 Adding dark mode support...');
    
    const darkModeCSS = `
/* Dark Mode Styles */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --shadow: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
  --shadow: rgba(0, 0, 0, 0.3);
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.card, .metric-card, .agent-card {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  box-shadow: 0 2px 8px var(--shadow);
}

/* Dark mode toggle */
.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 50px;
  padding: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 1001;
}

.theme-toggle input {
  display: none;
}

.theme-toggle label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
}

.theme-icon {
  font-size: 20px;
  transition: opacity 0.3s ease;
}
`;

    const darkModeJS = `
// Dark Mode Toggle
function initDarkMode() {
  const toggle = document.createElement('div');
  toggle.className = 'theme-toggle';
  toggle.innerHTML = \`
    <label>
      <input type="checkbox" id="darkModeToggle">
      <span class="theme-icon" id="lightIcon">☀️</span>
      <span class="theme-icon" id="darkIcon" style="display: none;">🌙</span>
    </label>
  \`;
  
  document.body.appendChild(toggle);
  
  const darkModeToggle = document.getElementById('darkModeToggle');
  const lightIcon = document.getElementById('lightIcon');
  const darkIcon = document.getElementById('darkIcon');
  
  // Check saved preference
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkModeToggle.checked = true;
    lightIcon.style.display = 'none';
    darkIcon.style.display = 'block';
  }
  
  darkModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
      lightIcon.style.display = 'none';
      darkIcon.style.display = 'block';
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
      lightIcon.style.display = 'block';
      darkIcon.style.display = 'none';
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initDarkMode);
`;

    // Save dark mode files
    fs.writeFileSync(
      path.join(__dirname, 'web-interface/dark-mode.css'),
      darkModeCSS
    );
    
    fs.writeFileSync(
      path.join(__dirname, 'web-interface/dark-mode.js'),
      darkModeJS
    );
    
    this.improvements.push('Dark Mode Support');
  }

  async createStatusBar() {
    console.log('📊 Creating status bar component...');
    
    const statusBarHTML = `
<!-- Status Bar -->
<div class="status-bar" style="
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 5px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  z-index: 999;
">
  <div class="status-left">
    <span id="connectionStatus">🟢 Connected</span>
    <span style="margin: 0 10px;">|</span>
    <span id="activeAgentsStatus">Agents: 0/5</span>
  </div>
  
  <div class="status-center">
    <span id="systemStatus">System Ready</span>
  </div>
  
  <div class="status-right">
    <span id="uptimeStatus">Uptime: 0m</span>
    <span style="margin: 0 10px;">|</span>
    <span id="memoryStatus">Memory: 0MB</span>
    <span style="margin: 0 10px;">|</span>
    <span id="apiStatus">API: ✓</span>
  </div>
</div>

<script>
  // Status bar updates
  let startTime = Date.now();
  
  setInterval(() => {
    // Update uptime
    const uptime = Math.floor((Date.now() - startTime) / 60000);
    document.getElementById('uptimeStatus').textContent = \`Uptime: \${uptime}m\`;
  }, 60000);
  
  // Listen for status updates
  if (window.ws) {
    window.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'status-update') {
        // Update active agents
        const activeCount = Object.values(data.data.agents).filter(s => s === 'active').length;
        document.getElementById('activeAgentsStatus').textContent = \`Agents: \${activeCount}/5\`;
        
        // Update memory
        if (data.data.resources) {
          document.getElementById('memoryStatus').textContent = \`Memory: \${data.data.resources.memoryGB}GB\`;
        }
      }
      
      if (data.type === 'connection') {
        document.getElementById('connectionStatus').textContent = '🟢 Connected';
      }
    });
    
    window.ws.addEventListener('close', () => {
      document.getElementById('connectionStatus').textContent = '🔴 Disconnected';
    });
  }
</script>
`;

    // Add status bar styles
    const statusBarCSS = `
/* Adjust body padding for status bar */
body {
  padding-bottom: 35px;
}

/* Quick actions position adjustment */
.quick-actions {
  bottom: 50px !important;
}
`;

    // Save status bar files
    fs.writeFileSync(
      path.join(__dirname, 'web-interface/status-bar.html'),
      statusBarHTML
    );
    
    fs.writeFileSync(
      path.join(__dirname, 'web-interface/status-bar.css'),
      statusBarCSS
    );
    
    this.improvements.push('Status Bar');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      improvements: this.improvements,
      files: {
        created: [
          'web-interface/performance-dashboard.html',
          'web-interface/autocomplete.js',
          'web-interface/notifications.js',
          'web-interface/dark-mode.css',
          'web-interface/dark-mode.js',
          'web-interface/status-bar.html',
          'web-interface/status-bar.css'
        ],
        modified: [
          'web-interface/index.html'
        ]
      },
      features: {
        performance: 'Real-time performance monitoring dashboard',
        autocomplete: 'Command auto-completion for better UX',
        visualizer: 'Live agent activity timeline',
        notifications: 'Toast notification system',
        shortcuts: 'Keyboard shortcuts and quick actions',
        darkMode: 'Dark mode with persistent preference',
        statusBar: 'System status bar with live updates'
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'ux-improvements-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Improvement report saved to: ux-improvements-report.json');
    console.log('\n🎯 Next steps:');
    console.log('  1. Update web-interface/index.html to include new scripts');
    console.log('  2. Test all new features');
    console.log('  3. Customize styles to match your preferences');
  }
}

// Run improvements
if (require.main === module) {
  const ux = new UXImprovements();
  ux.implement().catch(console.error);
}

module.exports = UXImprovements;
