#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AIValidationLayer {
  constructor() {
    this.validationRules = {
      syntax: {
        enabled: true,
        validators: ['eslint', 'tsc', 'prettier']
      },
      security: {
        enabled: true,
        patterns: [
          { regex: /api[_-]?key|secret|password|token/i, severity: 'high', message: 'Potential hardcoded secret' },
          { regex: /eval\(|Function\(|setTimeout\([^,]+,/, severity: 'high', message: 'Dangerous code execution' },
          { regex: /\$\{.*\}/, severity: 'medium', message: 'Template literal injection risk' },
          { regex: /<script|onclick|onerror|onload/i, severity: 'medium', message: 'Potential XSS vulnerability' },
          { regex: /innerHTML\s*=/, severity: 'high', message: 'Potential XSS via innerHTML' },
          { regex: /SELECT.*\+|UPDATE.*\+|DELETE.*\+/, severity: 'high', message: 'Potential SQL injection' }
        ]
      },
      // Senior-level validation rules
      architecture: {
        enabled: true,
        checks: {
          'SOLID_principles': this.checkSOLID,
          'design_patterns': this.checkPatterns,
          'separation_of_concerns': this.checkSeparation
        }
      },
      performance: {
        enabled: true,
        checks: {
          'algorithm_efficiency': this.checkBigO,
          'memory_usage': this.checkMemoryLeaks,
          'bundle_size': this.checkBundleSize
        }
      },
      seniorSecurity: {
        enabled: true,
        checks: {
          'OWASP_compliance': this.checkOWASP,
          'input_validation': this.checkInputValidation,
          'authentication': this.checkAuth
        }
      },
      quality: {
        enabled: true,
        maxComplexity: 8, // Stricter for senior level
        maxFileSize: 300, // Stricter for senior level
        minTestCoverage: 85, // Senior level requirement
        requiredPatterns: [
          { pattern: /^\/\*\*[\s\S]*?\*\//, message: 'Missing JSDoc comment', fileTypes: ['.js', '.ts'] }
        ]
      },
      hallucination: {
        enabled: true,
        checks: [
          'nonExistentImports',
          'phantomMethods',
          'incorrectAPIUsage',
          'impossibleLogic'
        ]
      }
    };

    this.validationCache = new Map();
    this.reportFile = '.ai-validation-report.json';
  }

  async validateCode(code, filePath, context = {}) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      timestamp: new Date().toISOString(),
      filePath,
      context
    };

    try {
      // 1. Syntax validation
      if (this.validationRules.syntax.enabled) {
        const syntaxResults = await this.validateSyntax(code, filePath);
        results.errors.push(...syntaxResults.errors);
        results.warnings.push(...syntaxResults.warnings);
      }

      // 2. Security validation
      if (this.validationRules.security.enabled) {
        const securityResults = this.validateSecurity(code);
        results.errors.push(...securityResults.errors);
        results.warnings.push(...securityResults.warnings);
      }

      // 3. Quality validation
      if (this.validationRules.quality.enabled) {
        const qualityResults = this.validateQuality(code, filePath);
        results.warnings.push(...qualityResults.warnings);
        results.suggestions.push(...qualityResults.suggestions);
      }

      // 4. Senior-level architecture validation
      if (this.validationRules.architecture.enabled) {
        const architectureResults = this.validateArchitecture(code);
        results.warnings.push(...architectureResults.warnings);
        results.suggestions.push(...architectureResults.suggestions);
      }

      // 5. Senior-level performance validation
      if (this.validationRules.performance.enabled) {
        const performanceResults = this.validatePerformance(code);
        results.warnings.push(...performanceResults.warnings);
        results.suggestions.push(...performanceResults.suggestions);
      }

      // 6. Senior-level security validation
      if (this.validationRules.seniorSecurity.enabled) {
        const seniorSecurityResults = this.validateSeniorSecurity(code);
        results.errors.push(...seniorSecurityResults.errors);
        results.warnings.push(...seniorSecurityResults.warnings);
      }

      // 7. Hallucination detection
      if (this.validationRules.hallucination.enabled) {
        const hallucinationResults = await this.detectHallucinations(code, filePath, context);
        results.errors.push(...hallucinationResults.errors);
        results.warnings.push(...hallucinationResults.warnings);
      }

      results.valid = results.errors.length === 0;
      
      // Save validation report
      this.saveValidationReport(results);
      
      return results;
    } catch (error) {
      results.errors.push({
        type: 'validation-error',
        message: `Validation failed: ${error.message}`,
        severity: 'critical'
      });
      results.valid = false;
      return results;
    }
  }

  async validateSyntax(code, filePath) {
    const results = { errors: [], warnings: [] };
    const tempFile = path.join('/tmp', `ai-validate-${Date.now()}${path.extname(filePath)}`);
    
    try {
      fs.writeFileSync(tempFile, code);
      
      // ESLint check
      try {
        execSync(`npx eslint ${tempFile} --format json`, { encoding: 'utf8' });
      } catch (error) {
        if (error.stdout) {
          const eslintResults = JSON.parse(error.stdout);
          eslintResults.forEach(file => {
            file.messages.forEach(msg => {
              const item = {
                type: 'syntax',
                message: msg.message,
                line: msg.line,
                column: msg.column
              };
              if (msg.severity === 2) results.errors.push(item);
              else results.warnings.push(item);
            });
          });
        }
      }

      // TypeScript check for .ts/.tsx files
      if (['.ts', '.tsx'].includes(path.extname(filePath))) {
        try {
          execSync(`npx tsc ${tempFile} --noEmit --skipLibCheck`, { encoding: 'utf8' });
        } catch (error) {
          const tsErrors = error.stdout.split('\n').filter(line => line.includes('error TS'));
          tsErrors.forEach(error => {
            results.errors.push({
              type: 'typescript',
              message: error.trim()
            });
          });
        }
      }
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
    
    return results;
  }

  validateSecurity(code) {
    const results = { errors: [], warnings: [] };
    
    this.validationRules.security.patterns.forEach(pattern => {
      const matches = code.match(new RegExp(pattern.regex, 'g'));
      if (matches) {
        const item = {
          type: 'security',
          pattern: pattern.regex.toString(),
          message: pattern.message,
          occurrences: matches.length
        };
        
        if (pattern.severity === 'high') {
          results.errors.push(item);
        } else {
          results.warnings.push(item);
        }
      }
    });
    
    return results;
  }

  validateQuality(code, filePath) {
    const results = { warnings: [], suggestions: [] };
    const lines = code.split('\n');
    
    // Check file size
    if (lines.length > this.validationRules.quality.maxFileSize) {
      results.warnings.push({
        type: 'quality',
        message: `File exceeds ${this.validationRules.quality.maxFileSize} lines (${lines.length} lines)`
      });
    }
    
    // Check for required patterns
    this.validationRules.quality.requiredPatterns.forEach(req => {
      if (req.fileTypes.includes(path.extname(filePath))) {
        if (!code.match(req.pattern)) {
          results.suggestions.push({
            type: 'quality',
            message: req.message
          });
        }
      }
    });
    
    // Cyclomatic complexity (simplified check)
    const complexityIndicators = [/if\s*\(/g, /else/g, /for\s*\(/g, /while\s*\(/g, /case\s+/g];
    let complexity = 1;
    complexityIndicators.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    if (complexity > this.validationRules.quality.maxComplexity) {
      results.warnings.push({
        type: 'complexity',
        message: `High cyclomatic complexity: ${complexity} (max: ${this.validationRules.quality.maxComplexity})`
      });
    }
    
    return results;
  }

  async detectHallucinations(code, filePath, context) {
    const results = { errors: [], warnings: [] };
    
    // Check for non-existent imports
    const importRegex = /import\s+(?:{[^}]+}|[\w\s,]+)\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    const imports = [];
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }
    
    for (const imp of imports) {
      // Check if it's a relative import
      if (imp.startsWith('.')) {
        const importPath = path.resolve(path.dirname(filePath), imp);
        const possiblePaths = [
          importPath,
          `${importPath}.js`,
          `${importPath}.ts`,
          `${importPath}.jsx`,
          `${importPath}.tsx`,
          path.join(importPath, 'index.js'),
          path.join(importPath, 'index.ts')
        ];
        
        const exists = possiblePaths.some(p => fs.existsSync(p));
        if (!exists) {
          results.errors.push({
            type: 'hallucination',
            message: `Import references non-existent file: ${imp}`
          });
        }
      } else if (!imp.startsWith('@') && !this.isNodeBuiltin(imp)) {
        // Check if package exists in node_modules
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          
          if (!allDeps[imp]) {
            results.warnings.push({
              type: 'hallucination',
              message: `Import references package not in package.json: ${imp}`
            });
          }
        }
      }
    }
    
    // Check for phantom method calls
    const methodCallRegex = /(\w+)\.(\w+)\(/g;
    const commonPhantomMethods = [
      'processAsync', 'transformData', 'validateInput', 'executeQuery',
      'performAction', 'handleResponse', 'updateState', 'fetchData'
    ];
    
    while ((match = methodCallRegex.exec(code)) !== null) {
      const [, obj, method] = match;
      if (commonPhantomMethods.includes(method) && !code.includes(`${method}:`)) {
        results.warnings.push({
          type: 'hallucination',
          message: `Possible phantom method call: ${obj}.${method}()`
        });
      }
    }
    
    return results;
  }

  validateArchitecture(code) {
    const results = { warnings: [], suggestions: [] };
    
    Object.keys(this.validationRules.architecture.checks).forEach(checkName => {
      const checkMethod = this.validationRules.architecture.checks[checkName];
      const issues = checkMethod.call(this, code);
      issues.forEach(issue => {
        results.suggestions.push({
          type: 'architecture',
          check: checkName,
          message: issue
        });
      });
    });
    
    return results;
  }

  validatePerformance(code) {
    const results = { warnings: [], suggestions: [] };
    
    Object.keys(this.validationRules.performance.checks).forEach(checkName => {
      const checkMethod = this.validationRules.performance.checks[checkName];
      const issues = checkMethod.call(this, code);
      issues.forEach(issue => {
        results.warnings.push({
          type: 'performance',
          check: checkName,
          message: issue
        });
      });
    });
    
    return results;
  }

  validateSeniorSecurity(code) {
    const results = { errors: [], warnings: [] };
    
    Object.keys(this.validationRules.seniorSecurity.checks).forEach(checkName => {
      const checkMethod = this.validationRules.seniorSecurity.checks[checkName];
      const issues = checkMethod.call(this, code);
      issues.forEach(issue => {
        if (issue.includes('A03: Injection') || issue.includes('hardcoded')) {
          results.errors.push({
            type: 'senior-security',
            check: checkName,
            message: issue
          });
        } else {
          results.warnings.push({
            type: 'senior-security',
            check: checkName,
            message: issue
          });
        }
      });
    });
    
    return results;
  }

  // Senior-level validation methods
  checkSOLID(code) {
    const issues = [];
    
    // Single Responsibility Principle
    const classMatches = code.match(/class\s+(\w+)/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const className = match.split(' ')[1];
        const classCode = this.extractClassCode(code, className);
        const methodCount = (classCode.match(/^\s*\w+\s*\(/gm) || []).length;
        if (methodCount > 10) {
          issues.push(`Class ${className} may violate SRP (${methodCount} methods)`);
        }
      });
    }
    
    return issues;
  }

  checkPatterns(code) {
    const issues = [];
    const goodPatterns = [
      { pattern: /const.*=.*\(.*\)\s*=>/, name: 'Functional components' },
      { pattern: /interface\s+\w+/g, name: 'TypeScript interfaces' },
      { pattern: /export\s+default/, name: 'Default exports' }
    ];
    
    goodPatterns.forEach(({ pattern, name }) => {
      if (!code.match(pattern)) {
        issues.push(`Consider using ${name} pattern`);
      }
    });
    
    return issues;
  }

  checkSeparation(code) {
    const issues = [];
    
    // Check for mixed concerns
    if (code.includes('fetch(') && code.includes('useState(')) {
      issues.push('Consider separating API calls from component state');
    }
    
    if (code.includes('console.log') && !code.includes('test')) {
      issues.push('Remove console.log statements from production code');
    }
    
    return issues;
  }

  checkBigO(code) {
    const issues = [];
    
    // Check for nested loops
    const nestedLoopPattern = /for\s*\([^}]*\{[^}]*for\s*\(/g;
    if (code.match(nestedLoopPattern)) {
      issues.push('Nested loops detected - consider algorithm optimization');
    }
    
    // Check for inefficient array methods
    const inefficientPatterns = [
      { pattern: /\.find\([^}]*\.find\(/g, message: 'Multiple find operations - consider optimization' },
      { pattern: /\.forEach\([^}]*\.forEach\(/g, message: 'Nested forEach - consider map/filter' }
    ];
    
    inefficientPatterns.forEach(({ pattern, message }) => {
      if (code.match(pattern)) {
        issues.push(message);
      }
    });
    
    return issues;
  }

  checkMemoryLeaks(code) {
    const issues = [];
    
    // Check for event listeners without cleanup
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      issues.push('Event listeners should be cleaned up in useEffect cleanup');
    }
    
    // Check for timers without cleanup
    if (code.includes('setInterval') && !code.includes('clearInterval')) {
      issues.push('Intervals should be cleared to prevent memory leaks');
    }
    
    return issues;
  }

  checkBundleSize(code) {
    const issues = [];
    
    // Check for large imports
    const heavyLibraries = ['lodash', 'moment', 'axios'];
    heavyLibraries.forEach(lib => {
      if (code.includes(`from '${lib}'`) && !code.includes(`from '${lib}/`)) {
        issues.push(`Consider importing specific functions from ${lib} to reduce bundle size`);
      }
    });
    
    return issues;
  }

  checkOWASP(code) {
    const issues = [];
    
    // OWASP Top 10 checks
    const owaspChecks = [
      { pattern: /\.innerHTML\s*=/, message: 'A03: Injection - Use textContent or sanitize HTML' },
      { pattern: /document\.write\(/, message: 'A03: Injection - Avoid document.write' },
      { pattern: /eval\(/, message: 'A03: Injection - Never use eval()' },
      { pattern: /password.*=.*['"][^'"]*['"]/, message: 'A02: Cryptographic Failures - Hardcoded password' }
    ];
    
    owaspChecks.forEach(({ pattern, message }) => {
      if (code.match(pattern)) {
        issues.push(message);
      }
    });
    
    return issues;
  }

  checkInputValidation(code) {
    const issues = [];
    
    // Check for API routes without validation
    if (code.includes('req.body') && !code.includes('validate')) {
      issues.push('API endpoints should validate input data');
    }
    
    // Check for form inputs without validation
    if (code.includes('input') && !code.includes('required') && !code.includes('pattern')) {
      issues.push('Form inputs should include client-side validation');
    }
    
    return issues;
  }

  checkAuth(code) {
    const issues = [];
    
    // Check for protected routes
    if (code.includes('router.') && !code.includes('auth') && !code.includes('middleware')) {
      issues.push('API routes should include authentication middleware');
    }
    
    // Check for JWT handling
    if (code.includes('jwt') && !code.includes('verify')) {
      issues.push('JWT tokens should be properly verified');
    }
    
    return issues;
  }

  extractClassCode(code, className) {
    const classStart = code.indexOf(`class ${className}`);
    if (classStart === -1) return '';
    
    let braceCount = 0;
    let classEnd = classStart;
    
    for (let i = classStart; i < code.length; i++) {
      if (code[i] === '{') braceCount++;
      if (code[i] === '}') braceCount--;
      if (braceCount === 0 && code[i] === '}') {
        classEnd = i;
        break;
      }
    }
    
    return code.substring(classStart, classEnd + 1);
  }

  isNodeBuiltin(module) {
    const builtins = [
      'fs', 'path', 'http', 'https', 'crypto', 'os', 'util',
      'stream', 'buffer', 'events', 'querystring', 'url', 'child_process'
    ];
    return builtins.includes(module);
  }

  saveValidationReport(results) {
    const reports = fs.existsSync(this.reportFile) 
      ? JSON.parse(fs.readFileSync(this.reportFile, 'utf8'))
      : [];
    
    reports.push(results);
    
    // Keep only last 100 reports
    if (reports.length > 100) {
      reports.splice(0, reports.length - 100);
    }
    
    fs.writeFileSync(this.reportFile, JSON.stringify(reports, null, 2));
  }

  async validateBatch(files) {
    const results = [];
    for (const file of files) {
      const code = fs.readFileSync(file, 'utf8');
      const validation = await this.validateCode(code, file);
      results.push(validation);
    }
    return results;
  }
}

module.exports = AIValidationLayer;

// CLI interface
if (require.main === module) {
  const validator = new AIValidationLayer();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node ai-validation-layer.js <file1> [file2] ...');
    process.exit(1);
  }
  
  (async () => {
    for (const file of args) {
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        continue;
      }
      
      console.log(`\nValidating ${file}...`);
      const code = fs.readFileSync(file, 'utf8');
      const results = await validator.validateCode(code, file);
      
      if (results.valid) {
        console.log('✅ Validation passed');
      } else {
        console.log('❌ Validation failed');
        console.log('Errors:', results.errors);
      }
      
      if (results.warnings.length > 0) {
        console.log('⚠️  Warnings:', results.warnings);
      }
      
      if (results.suggestions.length > 0) {
        console.log('💡 Suggestions:', results.suggestions);
      }
    }
  })();
}