#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SeniorAgentMetrics {
  constructor() {
    this.metricsFile = '.senior-agent-metrics.json';
    this.validationReportFile = '.ai-validation-report.json';
    this.initializeMetrics();
  }

  initializeMetrics() {
    if (!fs.existsSync(this.metricsFile)) {
      const initialMetrics = {
        totalTickets: 0,
        averageQualityScore: 0,
        agentPerformance: {
          frontend: { tickets: 0, averageScore: 0, patterns: [] },
          backend: { tickets: 0, averageScore: 0, patterns: [] },
          database: { tickets: 0, averageScore: 0, patterns: [] }
        },
        qualityTrends: [],
        memoryUsage: {
          totalMemories: 0,
          queriesPerDay: 0,
          hitRate: 0
        },
        performanceMetrics: {
          avgGenerationTime: 0,
          avgOptimizationGain: 0,
          testCoverage: 0
        },
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.metricsFile, JSON.stringify(initialMetrics, null, 2));
    }
  }

  loadMetrics() {
    return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
  }

  saveMetrics(metrics) {
    metrics.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  recordTicketCompletion(ticketId, agentType, qualityScore, metrics = {}) {
    const data = this.loadMetrics();
    
    // Update overall metrics
    data.totalTickets++;
    data.averageQualityScore = this.calculateRunningAverage(
      data.averageQualityScore, 
      qualityScore, 
      data.totalTickets
    );
    
    // Update agent-specific metrics
    const agent = data.agentPerformance[agentType];
    agent.tickets++;
    agent.averageScore = this.calculateRunningAverage(
      agent.averageScore,
      qualityScore,
      agent.tickets
    );
    
    // Add to quality trends
    data.qualityTrends.push({
      date: new Date().toISOString(),
      ticketId,
      agentType,
      score: qualityScore,
      metrics
    });
    
    // Keep only last 100 trends
    if (data.qualityTrends.length > 100) {
      data.qualityTrends = data.qualityTrends.slice(-100);
    }
    
    // Update performance metrics if provided
    if (metrics.generationTime) {
      data.performanceMetrics.avgGenerationTime = this.calculateRunningAverage(
        data.performanceMetrics.avgGenerationTime,
        metrics.generationTime,
        data.totalTickets
      );
    }
    
    if (metrics.testCoverage) {
      data.performanceMetrics.testCoverage = this.calculateRunningAverage(
        data.performanceMetrics.testCoverage,
        metrics.testCoverage,
        data.totalTickets
      );
    }
    
    this.saveMetrics(data);
    return data;
  }

  calculateRunningAverage(currentAvg, newValue, count) {
    return ((currentAvg * (count - 1)) + newValue) / count;
  }

  generateReport() {
    const metrics = this.loadMetrics();
    const validationReports = this.loadValidationReports();
    
    console.log('\n🎓 Senior Agent Performance Dashboard');
    console.log('=====================================\n');
    
    // Overall Performance
    console.log('📊 Overall Performance:');
    console.log(`   Total Tickets Completed: ${metrics.totalTickets}`);
    console.log(`   Average Quality Score: ${metrics.averageQualityScore.toFixed(1)}/100`);
    console.log(`   Last Updated: ${new Date(metrics.lastUpdated).toLocaleString()}\n`);
    
    // Agent Performance
    console.log('🤖 Agent Performance:');
    Object.entries(metrics.agentPerformance).forEach(([type, data]) => {
      const grade = this.getQualityGrade(data.averageScore);
      console.log(`   ${type.toUpperCase()}:`);
      console.log(`     Tickets: ${data.tickets}`);
      console.log(`     Avg Score: ${data.averageScore.toFixed(1)}/100 (Grade: ${grade})`);
      console.log(`     Top Patterns: ${data.patterns.slice(0, 3).join(', ') || 'None recorded'}`);
    });
    
    // Quality Trends
    console.log('\n📈 Quality Trends (Last 10 tickets):');
    const recentTrends = metrics.qualityTrends.slice(-10);
    recentTrends.forEach(trend => {
      const date = new Date(trend.date).toLocaleDateString();
      const grade = this.getQualityGrade(trend.score);
      console.log(`   ${trend.ticketId} (${trend.agentType}): ${trend.score}/100 (${grade}) - ${date}`);
    });
    
    // Performance Metrics
    console.log('\n⚡ Performance Metrics:');
    console.log(`   Avg Generation Time: ${metrics.performanceMetrics.avgGenerationTime}s`);
    console.log(`   Avg Test Coverage: ${metrics.performanceMetrics.testCoverage.toFixed(1)}%`);
    console.log(`   Avg Optimization Gain: ${metrics.performanceMetrics.avgOptimizationGain}%`);
    
    // Validation Summary
    if (validationReports.length > 0) {
      console.log('\n🔍 Recent Validation Summary:');
      const recentValidations = validationReports.slice(-5);
      recentValidations.forEach(report => {
        const status = report.valid ? '✅' : '❌';
        console.log(`   ${status} ${report.filePath}: ${report.errors.length} errors, ${report.warnings.length} warnings`);
      });
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    this.generateRecommendations(metrics);
    
    console.log('\n' + '='.repeat(50));
  }

  loadValidationReports() {
    if (!fs.existsSync(this.validationReportFile)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.validationReportFile, 'utf8'));
    } catch (e) {
      return [];
    }
  }

  getQualityGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    return 'D';
  }

  generateRecommendations(metrics) {
    const recommendations = [];
    
    // Quality recommendations
    if (metrics.averageQualityScore < 85) {
      recommendations.push('Consider running knowledge initialization to improve pattern recognition');
    }
    
    // Agent-specific recommendations
    Object.entries(metrics.agentPerformance).forEach(([type, data]) => {
      if (data.averageScore < 80) {
        recommendations.push(`${type} agent needs additional training patterns`);
      }
      if (data.tickets < 5) {
        recommendations.push(`Increase ${type} agent usage to build experience`);
      }
    });
    
    // Performance recommendations
    if (metrics.performanceMetrics.testCoverage < 85) {
      recommendations.push('Focus on improving test coverage in generated code');
    }
    
    if (metrics.performanceMetrics.avgGenerationTime > 60) {
      recommendations.push('Consider enabling parallel processing to improve generation speed');
    }
    
    // Trend analysis
    const recentTrends = metrics.qualityTrends.slice(-5);
    if (recentTrends.length >= 3) {
      const trendDirection = this.analyzeTrend(recentTrends.map(t => t.score));
      if (trendDirection === 'declining') {
        recommendations.push('Quality scores are declining - review recent implementations for pattern drift');
      } else if (trendDirection === 'improving') {
        recommendations.push('Quality scores are improving - continue current practices');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🎉 All metrics look great! Keep up the excellent work.');
    }
    
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  analyzeTrend(scores) {
    if (scores.length < 3) return 'insufficient_data';
    
    const first = scores.slice(0, Math.floor(scores.length / 2));
    const second = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  exportMetrics() {
    const metrics = this.loadMetrics();
    const exportData = {
      ...metrics,
      exportedAt: new Date().toISOString(),
      summary: {
        totalTickets: metrics.totalTickets,
        overallGrade: this.getQualityGrade(metrics.averageQualityScore),
        topPerformingAgent: this.getTopPerformingAgent(metrics.agentPerformance),
        qualityTrend: this.analyzeTrend(metrics.qualityTrends.slice(-10).map(t => t.score))
      }
    };
    
    const exportFile = `senior-agent-metrics-export-${Date.now()}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`📤 Metrics exported to: ${exportFile}`);
    return exportFile;
  }

  getTopPerformingAgent(agentPerformance) {
    let topAgent = null;
    let topScore = 0;
    
    Object.entries(agentPerformance).forEach(([type, data]) => {
      if (data.averageScore > topScore && data.tickets > 0) {
        topScore = data.averageScore;
        topAgent = type;
      }
    });
    
    return topAgent || 'none';
  }

  generateDetailedReport() {
    const metrics = this.loadMetrics();
    
    const report = `# Senior Agent Performance Report
Generated: ${new Date().toISOString()}

## Executive Summary
- **Total Tickets**: ${metrics.totalTickets}
- **Overall Quality Score**: ${metrics.averageQualityScore.toFixed(1)}/100 (${this.getQualityGrade(metrics.averageQualityScore)})
- **Top Performing Agent**: ${this.getTopPerformingAgent(metrics.agentPerformance)}
- **Quality Trend**: ${this.analyzeTrend(metrics.qualityTrends.slice(-10).map(t => t.score))}

## Agent Performance Details

${Object.entries(metrics.agentPerformance).map(([type, data]) => `
### ${type.toUpperCase()} Agent
- **Tickets Completed**: ${data.tickets}
- **Average Score**: ${data.averageScore.toFixed(1)}/100 (${this.getQualityGrade(data.averageScore)})
- **Top Patterns**: ${data.patterns.slice(0, 5).join(', ') || 'None recorded'}
`).join('')}

## Quality Trends
${metrics.qualityTrends.slice(-20).map(trend => 
  `- ${trend.ticketId} (${trend.agentType}): ${trend.score}/100 - ${new Date(trend.date).toLocaleDateString()}`
).join('\n')}

## Performance Metrics
- **Average Generation Time**: ${metrics.performanceMetrics.avgGenerationTime}s
- **Average Test Coverage**: ${metrics.performanceMetrics.testCoverage.toFixed(1)}%
- **Average Optimization Gain**: ${metrics.performanceMetrics.avgOptimizationGain}%

## Memory System Usage
- **Total Memories**: ${metrics.memoryUsage.totalMemories}
- **Daily Queries**: ${metrics.memoryUsage.queriesPerDay}
- **Hit Rate**: ${(metrics.memoryUsage.hitRate * 100).toFixed(1)}%
`;

    const reportFile = `senior-agent-report-${Date.now()}.md`;
    fs.writeFileSync(reportFile, report);
    console.log(`📊 Detailed report generated: ${reportFile}`);
    return reportFile;
  }

  resetMetrics() {
    console.log('⚠️  Are you sure you want to reset all metrics? This cannot be undone.');
    console.log('   If yes, delete the file: ' + this.metricsFile);
  }
}

// CLI Interface
if (require.main === module) {
  const metrics = new SeniorAgentMetrics();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    metrics.generateReport();
  } else {
    const command = args[0];
    
    switch (command) {
      case 'report':
        metrics.generateReport();
        break;
        
      case 'detailed':
        metrics.generateDetailedReport();
        break;
        
      case 'export':
        metrics.exportMetrics();
        break;
        
      case 'record':
        const [ticketId, agentType, score] = args.slice(1);
        if (!ticketId || !agentType || !score) {
          console.log('Usage: node senior-agent-metrics.js record TICKET-ID agent-type score');
          process.exit(1);
        }
        metrics.recordTicketCompletion(ticketId, agentType, parseInt(score));
        console.log(`✅ Recorded completion of ${ticketId} with score ${score}`);
        break;
        
      case 'reset':
        metrics.resetMetrics();
        break;
        
      default:
        console.log(`Usage: node senior-agent-metrics.js [command]

Commands:
  report     - Show current metrics dashboard (default)
  detailed   - Generate detailed markdown report
  export     - Export metrics to JSON file
  record     - Record ticket completion: record TICKET-ID agent-type score
  reset      - Reset all metrics

Examples:
  node senior-agent-metrics.js
  node senior-agent-metrics.js detailed
  node senior-agent-metrics.js record TICKET-001 frontend 95
`);
    }
  }
}

module.exports = SeniorAgentMetrics;