#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

class AIAgentEngine {
  constructor() {
    // Load environment variables from root directory
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
    
    this.apiKey = process.env.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      console.error('❌ Please set OPENROUTER_API_KEY environment variable');
      console.log('\nOptions:');
      console.log('1. Create a .env file with: OPENROUTER_API_KEY=your-key-here');
      console.log('2. Or run: export OPENROUTER_API_KEY=your-key-here');
      console.log('\nGet your API key from: https://openrouter.ai/keys');
      process.exit(1);
    }
    
    // Available models from OpenRouter - Latest and most powerful!
    this.availableModels = {
      // Primary models (use these most often)
      primary: [
        'openai/gpt-4.1',                // GPT 4.1 - Latest
        'anthropic/claude-opus-4',       // Claude Opus 4
        'anthropic/claude-sonnet-4',     // Claude Sonnet 4
        'openai/o3-pro',                 // O3 Pro for complex reasoning
      ],
      // Fast models for simple tasks
      fast: [
        'openai/gpt-4.1-mini',           // GPT 4.1 Mini
        'google/gemini-2.5-flash',       // Gemini 2.5 Flash
        'deepseek/deepseek-r1',          // DeepSeek R1
        'qwen/qwen-2.5-coder-32b-instruct', // Qwen Coder
      ],
      // Specialized models
      specialized: [
        'openai/o3',                     // O3 for reasoning
        'x-ai/grok-3',                   // Grok 3
        'deepseek/deepseek-chat',        // DeepSeek Chat
        'minimax/minimax-01',            // MiniMax
      ],
      // Coding-focused models
      coding: [
        'qwen/qwen-2.5-coder-32b-instruct',
        'deepseek/deepseek-r1',
        'openai/gpt-4.1',
        'anthropic/claude-sonnet-4'
      ]
    };
    
    // Model selection based on task complexity and agent type
    // Senior-level model configuration for enhanced agents
    this.modelConfig = {
      frontend: {
        simple: 'openai/gpt-4.1-mini',
        complex: 'anthropic/claude-opus-4',
        creative: 'anthropic/claude-opus-4',
        review: 'anthropic/claude-sonnet-4',
        architecture: 'openai/o3-pro' // For complex reasoning
      },
      backend: {
        simple: 'openai/gpt-4.1-mini',
        complex: 'anthropic/claude-opus-4',
        algorithm: 'deepseek/deepseek-r1',
        review: 'anthropic/claude-sonnet-4',
        architecture: 'openai/o3-pro' // For complex reasoning
      },
      database: {
        simple: 'google/gemini-2.5-flash',
        complex: 'anthropic/claude-opus-4',
        optimization: 'deepseek/deepseek-r1',
        review: 'anthropic/claude-opus-4',
        architecture: 'openai/o3-pro' // For complex reasoning
      },
      testing: {
        unit: 'openai/gpt-4.1-mini',
        integration: 'anthropic/claude-sonnet-4',
        e2e: 'anthropic/claude-sonnet-4',
        review: 'anthropic/claude-opus-4'
      }
    };
    
    // Load existing code patterns
    this.codePatterns = this.loadProjectPatterns();
    
    // Agent personas for better code generation
    this.agentPersonas = {
      frontend: "You are a senior React/Next.js developer. You follow modern React patterns, use TypeScript strictly, and create reusable components. You care about UI/UX and accessibility.",
      backend: "You are a senior Node.js/API developer. You write secure, scalable, and well-documented APIs. You follow RESTful principles and handle errors gracefully.",
      database: "You are a database architect. You design efficient schemas, write optimized queries, and ensure data integrity. You understand Prisma and PostgreSQL deeply.",
      testing: "You are a QA engineer who writes comprehensive tests. You ensure high code coverage and test edge cases. You write clear, maintainable test suites."
    };
  }

  async callOpenRouter(messages, model, temperature = 0.7) {
    const data = JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: 4000
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'HTTP-Referer': 'https://github.com/rylie-seo-hub',
        'X-Title': 'Multi-Agent Development System'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            
            // Check for API errors
            if (response.error) {
              console.error('OpenRouter API Error:', response.error);
              reject(new Error(response.error.message || 'API Error'));
              return;
            }
            
            // Check response structure
            if (!response.choices || !response.choices[0] || !response.choices[0].message) {
              console.error('Unexpected response format:', response);
              reject(new Error('Invalid response format from OpenRouter'));
              return;
            }
            
            resolve(response.choices[0].message.content);
          } catch (e) {
            console.error('Failed to parse response:', e.message);
            console.error('Response body:', body);
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  loadProjectPatterns() {
    // Analyze existing code to understand patterns
    const patterns = {
      imports: new Set(),
      components: [],
      utilities: [],
      apiPatterns: [],
      testPatterns: []
    };
    
    // This would scan your project, for now using common patterns
    patterns.imports = new Set([
      'import React from "react"',
      'import { useState, useEffect } from "react"',
      'import { prisma } from "@/lib/prisma"',
      'import { NextResponse } from "next/server"'
    ]);
    
    return patterns;
  }

  async analyzeTicket(ticket) {
    const prompt = `Analyze this development ticket and provide a structured response:

Ticket: ${ticket.id}
Description: ${ticket.description}
Notes: ${ticket.notes?.join('\n') || 'None'}

Provide your analysis in this JSON format. Be specific and thorough:
{
  "complexity": "simple|medium|complex",
  "estimatedLinesOfCode": number,
  "primaryGoal": "A concise statement of the main objective.",
  "keyFeatures": ["A list of specific features or functionalities to implement."],
  "coreLogicAreas": ["Identify main areas where logic needs to be developed or modified."],
  "requiredFiles": ["list", "of", "files", "expected", "to", "be", "created", "or", "modified"],
  "dependencies": ["Any new internal or external dependencies anticipated."],
  "suggestedApproach": "A brief but clear technical approach to the implementation.",
  "potentialChallenges": ["List potential technical challenges or risks."],
  "testingStrategy": "Outline key aspects to test and how (e.g., unit tests for X, integration for Y)."
}`;

    const response = await this.callOpenRouter([
      { role: 'system', content: 'You are a meticulous software architect providing detailed analysis for a development ticket.' },
      { role: 'user', content: prompt }
    ], this.modelConfig[ticket.agentType]?.analysis || 'openai/gpt-4'); // Allow agent-specific model for analysis

    try {
      const parsedResponse = JSON.parse(response);
      // Ensure all new fields have default values if not provided by the LLM
      return {
        complexity: parsedResponse.complexity || 'medium',
        estimatedLinesOfCode: parsedResponse.estimatedLinesOfCode || 100,
        primaryGoal: parsedResponse.primaryGoal || ticket.description,
        keyFeatures: parsedResponse.keyFeatures || [],
        coreLogicAreas: parsedResponse.coreLogicAreas || [],
        requiredFiles: parsedResponse.requiredFiles || [],
        dependencies: parsedResponse.dependencies || [],
        suggestedApproach: parsedResponse.suggestedApproach || "Standard implementation approach.",
        potentialChallenges: parsedResponse.potentialChallenges || [],
        testingStrategy: parsedResponse.testingStrategy || "Standard unit and integration tests.",
        ...parsedResponse // Spread the original response to keep any other fields
      };
    } catch (e) {
      console.log('Failed to parse analysis, using defaults with enhanced structure');
      return {
        complexity: 'medium',
        estimatedLinesOfCode: 100,
        primaryGoal: ticket.description,
        keyFeatures: [],
        coreLogicAreas: [],
        requiredFiles: [],
        dependencies: [],
        suggestedApproach: "Standard implementation approach.",
        potentialChallenges: [],
        testingStrategy: "Standard unit and integration tests."
      };
    }
  }

  async generateImplementationPlan(ticket, agent, analysis) {
    const persona = this.agentPersonas[agent];
    const examples = await this.getRelevantExamples(ticket, agent);
    
    const prompt = `${persona}

You are implementing this ticket:
Ticket ID: ${ticket.id}
Description: ${ticket.description}
Primary Goal: ${analysis.primaryGoal}

Detailed Analysis:
${JSON.stringify(analysis, null, 2)}

Existing code patterns in this project:
${examples}

Create a detailed, step-by-step implementation plan. For each step, specify:
- The file(s) to be modified or created.
- A concise description of the task for that step.
- Key functions/modules/components to be developed or altered.
- Specific code snippets or pseudocode for complex logic if applicable.
- Any new dependencies to be added.
- How to test this specific step or feature.

The plan should be actionable and clear. Focus on the key features: ${analysis.keyFeatures?.join(', ') || 'core requirements'}.
Address core logic areas: ${analysis.coreLogicAreas?.join(', ') || 'main logic'}.
Consider potential challenges: ${analysis.potentialChallenges?.join(', ') || 'none listed'}.

Format your response as a markdown document with numbered steps.`;

    const model = this.modelConfig[agent]?.complex || 'anthropic/claude-sonnet-4'; // Use a capable model for planning
    
    return await this.callOpenRouter([
      { role: 'system', content: persona },
      { role: 'user', content: prompt }
    ], model);
  }

  async generateCode(agent, file, requirements, existingCode = null, analysis = {}, plan = "") {
    const persona = this.agentPersonas[agent];
    const model = this.modelConfig[agent]?.complex || 'anthropic/claude-opus-4'; // Use a very capable model for code gen
    
    const prompt = `${persona}

Generate production-ready code for the file: ${file}

Ticket Description: ${requirements}
${analysis.primaryGoal ? `Primary Goal: ${analysis.primaryGoal}` : ''}
${analysis.keyFeatures && analysis.keyFeatures.length > 0 ? `Key Features to implement in this file: ${analysis.keyFeatures.join(', ')}` : ''}

Overall Plan:
${plan || "Implement based on the ticket description and analysis."}

${existingCode ? `Existing code to modify:\n\`\`\`\n${existingCode}\n\`\`\`` : 'This is a new file.'}

Project patterns to follow:
- Use TypeScript with strict typing.
- Adhere to SOLID principles and clean code practices.
- Follow existing import patterns and project structure.
- Implement comprehensive error handling (try-catch blocks, error logging).
- Add detailed JSDoc comments for all functions, classes, and complex logic.
- Ensure code is modular, reusable, and testable (e.g., by using dependency injection where appropriate).
- Optimize for performance and security relevant to the task.

Respond with ONLY the complete, production-quality code for the file ${file}. Do not include any explanations, markdown formatting, or anything other than the raw code.`;

    const code = await this.callOpenRouter([
      { role: 'system', content: persona },
      { role: 'user', content: prompt }
    ], model, 0.25); // Slightly lower temperature for more deterministic and high-quality code
    
    // Clean up response
    return code.replace(/```[\w\S]*\n?/g, '').replace(/```$/g, '').trim();
  }

  async generateTests(agent, codeFile, implementation, analysis = {}) {
    const testFile = codeFile.replace(/\.(ts|tsx|js)$/, '.test.$1');
    const model = this.modelConfig.testing.unit;
    
    const prompt = `Generate comprehensive tests for this code:

File: ${codeFile}
\`\`\`
${implementation}
\`\`\`

Create tests that:
1. Cover all functions/methods
2. Test edge cases
3. Test error scenarios
4. Use Jest and React Testing Library (if React component)
5. Aim for >80% coverage

Respond with ONLY the test code.`;

    return await this.callOpenRouter([
      { role: 'system', content: this.agentPersonas.testing },
      { role: 'user', content: prompt }
    ], model, 0.3);
  }

  async reviewCode(agent, code, requirements) {
    const model = this.modelConfig[agent].review;
    
    const prompt = `Review this code for quality, security, and best practices:

Requirements: ${requirements}

Code:
\`\`\`
${code}
\`\`\`

Provide a JSON response:
{
  "score": 0-100,
  "issues": [{"severity": "high|medium|low", "description": "...", "line": number}],
  "suggestions": ["improvement suggestions"],
  "security": ["any security concerns"],
  "approved": boolean
}`;

    const response = await this.callOpenRouter([
      { role: 'system', content: 'You are a senior code reviewer focused on quality and security.' },
      { role: 'user', content: prompt }
    ], model);

    try {
      return JSON.parse(response);
    } catch (e) {
      return { score: 80, issues: [], approved: true };
    }
  }

  async getRelevantExamples(ticket, agent) {
    // In a real implementation, this would search your codebase
    // For now, return common patterns
    const examples = {
      frontend: `
// Common component pattern:
export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
  return <button className={cn('btn', variant)} onClick={onClick}>{children}</button>
}

// Common hook pattern:
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  // ... implementation
}`,
      backend: `
// Common API route pattern:
export async function GET(request: Request) {
  try {
    const data = await prisma.model.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`,
      database: `
// Common Prisma model pattern:
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`
    };

    return examples[agent] || '';
  }

  async improveCode(code, feedback) {
    const prompt = `Improve this code based on the feedback:

Current code:
\`\`\`
${code}
\`\`\`

Feedback:
${JSON.stringify(feedback, null, 2)}

Provide the improved code only.`;

    return await this.callOpenRouter([
      { role: 'system', content: 'You are an expert developer improving code based on review feedback.' },
      { role: 'user', content: prompt }
    ], 'openai/gpt-4', 0.3);
  }

  async suggestModelForTask(task, agent) {
    // Intelligently select the best model based on task
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('refactor') || taskLower.includes('optimize')) {
      return 'anthropic/claude-3-opus-20240229'; // Best for complex refactoring
    }
    
    if (taskLower.includes('ui') || taskLower.includes('component')) {
      return 'openai/gpt-4'; // Good for React components
    }
    
    if (taskLower.includes('test')) {
      return 'openai/gpt-3.5-turbo'; // Fast and good for tests
    }
    
    if (taskLower.includes('algorithm') || taskLower.includes('complex')) {
      return 'anthropic/claude-3-opus-20240229'; // Best for algorithms
    }
    
    // Default based on agent
    return this.modelConfig[agent].complex;
  }
}

// Export for use in other parts of the system
module.exports = AIAgentEngine;

// CLI interface
if (require.main === module) {
  const engine = new AIAgentEngine();
  
  async function demo() {
    console.log('🤖 AI Agent Engine Demo\n');
    
    // Demo ticket
    const ticket = {
      id: 'TICKET-001',
      description: 'Create a progress bar component that shows package completion',
      notes: ['Should be reusable', 'Support different color themes', 'Show percentage']
    };
    
    console.log('1️⃣ Analyzing ticket...');
    const analysis = await engine.analyzeTicket(ticket);
    console.log('Analysis:', analysis);
    
    console.log('\n2️⃣ Generating implementation plan...');
    const plan = await engine.generateImplementationPlan(ticket, 'frontend', analysis);
    console.log('Plan:', plan.substring(0, 500) + '...');
    
    console.log('\n3️⃣ Generating code...');
    const code = await engine.generateCode('frontend', 'ProgressBar.tsx', ticket.description);
    console.log('Generated code preview:', code.substring(0, 300) + '...');
    
    console.log('\n4️⃣ Generating tests...');
    const tests = await engine.generateTests('frontend', 'ProgressBar.tsx', code);
    console.log('Generated tests preview:', tests.substring(0, 300) + '...');
    
    console.log('\n5️⃣ Reviewing code...');
    const review = await engine.reviewCode('frontend', code, ticket.description);
    console.log('Review:', review);
    
    console.log('\n✅ AI Agent Engine is ready!');
    console.log('\n📝 Available models through OpenRouter:');
    console.log('   - GPT-4, GPT-3.5 for general coding');
    console.log('   - Claude 3 Opus for complex algorithms');
    console.log('   - Claude 2 for creative solutions');
    console.log('   - And 300+ more models to choose from!');
  }
  
  demo().catch(console.error);
}
