#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

class AgentMemorySystem {
  constructor() {
    // Load environment variables
    if (fs.existsSync(path.join(__dirname, '.env'))) {
      require('dotenv').config();
    }
    
    this.supermemoryApiKey = process.env.SUPERMEMORY_API_KEY || 'sm_dy7m3s5FbqC2DaFMkKoTw1_DZZJlVjVjqJuXSEFrUEjnlfMggzyBryibVhXVwlImfeOMzFXyKvzvHEMzSoGETQC';
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY;
    
    // Memory categories for different agent types
    this.memoryCategories = {
      frontend: {
        patterns: 'frontend-patterns',
        components: 'frontend-components',
        performance: 'frontend-performance',
        accessibility: 'frontend-accessibility',
        bestPractices: 'frontend-best-practices'
      },
      backend: {
        patterns: 'backend-patterns',
        architecture: 'backend-architecture',
        security: 'backend-security',
        performance: 'backend-performance',
        apis: 'backend-apis'
      },
      database: {
        schemas: 'database-schemas',
        optimization: 'database-optimization',
        migrations: 'database-migrations',
        bestPractices: 'database-best-practices'
      }
    };
  }

  /**
   * Add a memory to Supermemory
   */
  async addMemory(content, agent, category, metadata = {}) {
    const data = JSON.stringify({
      content: content,
      containerTags: [
        `agent:${agent}`,
        `category:${category}`,
        `project:${process.cwd().split('/').pop()}`
      ],
      customId: `${agent}_${category}_${Date.now()}`,
      metadata: {
        agent: agent,
        category: category,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });

    const options = {
      hostname: 'api.supermemory.ai',
      port: 443,
      path: '/v3/memories',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supermemoryApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve(response);
            } else {
              reject(new Error(`Supermemory API error: ${response.error || body}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Store code pattern in memory
   */
  async learnCodePattern(agent, pattern, description, example) {
    const content = `
# Code Pattern: ${pattern}

## Description
${description}

## Example Implementation
\`\`\`javascript
${example}
\`\`\`

## When to Use
${await this.analyzePatternUsage(pattern, agent)}
`;

    return await this.addMemory(content, agent, 'patterns', {
      patternName: pattern,
      complexity: 'advanced',
      learnedFrom: 'implementation'
    });
  }

  /**
   * Store architectural decision
   */
  async recordArchitecturalDecision(agent, decision, rationale, alternatives) {
    const content = `
# Architectural Decision Record (ADR)

## Decision: ${decision}

## Status: Accepted

## Context and Rationale
${rationale}

## Alternatives Considered
${alternatives.map(alt => `- ${alt}`).join('\n')}

## Consequences
${await this.analyzeDecisionConsequences(decision)}

## Implementation Guidelines
${await this.generateImplementationGuidelines(decision, agent)}
`;

    return await this.addMemory(content, agent, 'architecture', {
      decisionType: 'architectural',
      impact: 'high',
      reviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // Review in 90 days
    });
  }

  /**
   * Learn from code review feedback
   */
  async learnFromReview(agent, originalCode, feedback, improvedCode) {
    const content = `
# Code Review Learning

## Original Implementation
\`\`\`javascript
${originalCode}
\`\`\`

## Review Feedback
${feedback}

## Improved Implementation
\`\`\`javascript
${improvedCode}
\`\`\`

## Key Learnings
${await this.extractKeyLearnings(feedback, originalCode, improvedCode)}

## Patterns to Remember
${await this.identifyPatterns(improvedCode)}
`;

    return await this.addMemory(content, agent, 'bestPractices', {
      reviewType: 'code-improvement',
      skillLevel: 'senior',
      applicability: 'general'
    });
  }

  /**
   * Store performance optimization techniques
   */
  async recordOptimization(agent, problem, solution, metrics) {
    const content = `
# Performance Optimization

## Problem Statement
${problem}

## Solution Implemented
${solution}

## Performance Metrics
Before: ${JSON.stringify(metrics.before, null, 2)}
After: ${JSON.stringify(metrics.after, null, 2)}
Improvement: ${metrics.improvement}%

## Implementation Details
${await this.generateOptimizationDetails(solution, agent)}

## Reusable Pattern
${await this.extractReusablePattern(solution)}
`;

    return await this.addMemory(content, agent, 'performance', {
      optimizationType: metrics.type || 'general',
      improvementPercentage: metrics.improvement,
      complexity: 'advanced'
    });
  }

  /**
   * Query memories for relevant knowledge
   */
  async queryMemories(query, agent, limit = 5) {
    // This would integrate with Supermemory's search API
    // For now, returning a structured approach
    console.log(`🔍 Searching memories for: ${query}`);
    console.log(`   Agent: ${agent}`);
    console.log(`   Limit: ${limit}`);
    
    // In real implementation, this would call Supermemory search API
    return {
      query: query,
      agent: agent,
      results: [] // Would contain actual search results
    };
  }

  /**
   * AI-powered analysis methods
   */
  async analyzePatternUsage(pattern, agent) {
    const prompt = `As a principal ${agent} engineer, explain when and why to use the ${pattern} pattern. Include specific use cases and edge cases to consider.`;
    return await this.callAI(prompt);
  }

  async analyzeDecisionConsequences(decision) {
    const prompt = `Analyze the long-term consequences of this architectural decision: ${decision}. Consider scalability, maintainability, performance, and technical debt.`;
    return await this.callAI(prompt);
  }

  async generateImplementationGuidelines(decision, agent) {
    const prompt = `As a principal ${agent} engineer, provide detailed implementation guidelines for: ${decision}. Include code structure, testing approach, and migration strategy.`;
    return await this.callAI(prompt);
  }

  async extractKeyLearnings(feedback, originalCode, improvedCode) {
    const prompt = `Extract the key learning points from this code review:
    
Feedback: ${feedback}
Original: ${originalCode.substring(0, 500)}...
Improved: ${improvedCode.substring(0, 500)}...

List the most important lessons that would help a developer grow from junior to senior level.`;
    return await this.callAI(prompt);
  }

  async identifyPatterns(code) {
    const prompt = `Identify the design patterns and best practices demonstrated in this code: ${code.substring(0, 1000)}... List each pattern with a brief explanation.`;
    return await this.callAI(prompt);
  }

  async generateOptimizationDetails(solution, agent) {
    const prompt = `As a principal ${agent} engineer, provide detailed implementation steps for this optimization: ${solution}. Include code examples and potential pitfalls.`;
    return await this.callAI(prompt);
  }

  async extractReusablePattern(solution) {
    const prompt = `Extract a reusable pattern from this optimization solution that could be applied to similar problems: ${solution}`;
    return await this.callAI(prompt);
  }

  /**
   * Call OpenRouter AI for analysis
   */
  async callAI(prompt) {
    const data = JSON.stringify({
      model: "anthropic/claude-3-sonnet-20240229",
      messages: [
        {
          role: "system",
          content: "You are a principal software engineer with deep expertise in modern development practices."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/multi-agent-orchestrator',
        'X-Title': 'Agent Memory System'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve(response.choices[0].message.content);
          } catch (e) {
            resolve(prompt); // Fallback to prompt if AI fails
          }
        });
      });

      req.on('error', () => resolve(prompt));
      req.write(data);
      req.end();
    });
  }

  /**
   * Initialize agent with senior-level knowledge
   */
  async initializeSeniorKnowledge(agent) {
    console.log(`📚 Initializing senior-level knowledge for ${agent} agent...`);

    const knowledgeBase = {
      frontend: [
        {
          pattern: "Compound Component Pattern",
          description: "A pattern for creating flexible and reusable component APIs",
          example: `const Select = ({ children }) => {
  const [selectedValue, setSelectedValue] = useState(null);
  return (
    <SelectContext.Provider value={{ selectedValue, setSelectedValue }}>
      {children}
    </SelectContext.Provider>
  );
};

Select.Option = ({ value, children }) => {
  const { selectedValue, setSelectedValue } = useContext(SelectContext);
  return (
    <div onClick={() => setSelectedValue(value)}
         className={selectedValue === value ? 'selected' : ''}>
      {children}
    </div>
  );
};`
        },
        {
          pattern: "Render Props Pattern",
          description: "A pattern for sharing code between components using a prop whose value is a function",
          example: `const MouseTracker = ({ render }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return render(position);
};`
        }
      ],
      backend: [
        {
          pattern: "Circuit Breaker Pattern",
          description: "Prevents cascading failures in distributed systems",
          example: `class CircuitBreaker {
  constructor(request, options = {}) {
    this.request = request;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000;
    this.nextAttempt = Date.now();
  }
  
  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await this.request(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}`
        }
      ],
      database: [
        {
          pattern: "Database Sharding Strategy",
          description: "Horizontal partitioning for scalability",
          example: `// Consistent hashing for shard selection
function getShardKey(userId) {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % TOTAL_SHARDS;
}

// Shard-aware query
async function queryUserData(userId) {
  const shardId = getShardKey(userId);
  const connection = await getShardConnection(shardId);
  return connection.query('SELECT * FROM users WHERE id = ?', [userId]);
}`
        }
      ]
    };

    // Store each pattern in memory
    const patterns = knowledgeBase[agent] || [];
    for (const { pattern, description, example } of patterns) {
      await this.learnCodePattern(agent, pattern, description, example);
      console.log(`  ✅ Learned: ${pattern}`);
    }

    console.log(`\n🎓 ${agent} agent now has senior-level knowledge!`);
  }
}

// Export for use in enhanced agents
module.exports = AgentMemorySystem;

// CLI for testing
if (require.main === module) {
  const memory = new AgentMemorySystem();
  
  async function demo() {
    console.log('🧠 Agent Memory System Demo\n');
    
    // Test adding a memory
    try {
      const result = await memory.addMemory(
        'React Server Components allow rendering components on the server, reducing bundle size and improving performance.',
        'frontend',
        'patterns',
        { importance: 'high', source: 'react-docs' }
      );
      console.log('✅ Memory added:', result);
    } catch (error) {
      console.error('❌ Error adding memory:', error.message);
    }
    
    // Initialize senior knowledge for an agent
    await memory.initializeSeniorKnowledge('frontend');
  }
  
  demo().catch(console.error);
}
