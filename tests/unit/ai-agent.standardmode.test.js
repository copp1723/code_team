const AIEnabledAgent = require('../../../src/core/agents/ai-agent');
const AIAgentEngine = require('../../../src/core/agents/ai-agent-engine');
const AIValidationLayer = require('../../../src/core/ai/ai-validation-layer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock dependencies
jest.mock('../../../src/core/agents/ai-agent-engine');
jest.mock('../../../src/core/ai/ai-validation-layer');
jest.mock('fs');
jest.mock('child_process');

describe('AIEnabledAgent - Standard Mode', () => {
  let agent;
  let mockTicket;

  beforeEach(() => {
    // Reset mocks for each test
    AIAgentEngine.mockClear();
    AIValidationLayer.mockClear();
    fs.existsSync.mockClear();
    fs.writeFileSync.mockClear();
    fs.mkdirSync.mockClear();
    fs.readFileSync.mockClear();
    execSync.mockClear();

    mockTicket = {
      id: 'TICKET-STD-001',
      description: 'Create a simple utility function.',
      agentType: 'backend' // Added for the enhanced analyzeTicket
    };

    // Setup default mock implementations
    const mockAiInstance = {
      analyzeTicket: jest.fn().mockResolvedValue({
        complexity: 'simple',
        estimatedLinesOfCode: 10,
        primaryGoal: 'Create a utility function',
        keyFeatures: ['adds two numbers'],
        coreLogicAreas: ['addition logic'],
        requiredFiles: ['src/utils/math.js'],
        dependencies: [],
        suggestedApproach: 'Create a function `add(a, b)`',
        potentialChallenges: [],
        testingStrategy: 'Unit test with various inputs'
      }),
      generateImplementationPlan: jest.fn().mockResolvedValue('1. Create math.js\n2. Implement add function'),
      generateCode: jest.fn().mockResolvedValue('function add(a, b) { return a + b; }'),
      generateTests: jest.fn().mockResolvedValue('// Test for add function'),
      reviewCode: jest.fn().mockResolvedValue({ score: 90, approved: true, issues: [], suggestions: [] }),
      improveCode: jest.fn().mockResolvedValue('function add(a, b) { return a + b; } // Improved')
    };
    AIAgentEngine.mockImplementation(() => mockAiInstance);

    const mockValidatorInstance = {
      validateCode: jest.fn().mockResolvedValue({ valid: true, errors: [] })
    };
    AIValidationLayer.mockImplementation(() => mockValidatorInstance);

    fs.existsSync.mockReturnValue(false); // Default to file not existing
    fs.readFileSync.mockReturnValue(''); // Default for existing file content

    agent = new AIEnabledAgent('backend', mockTicket);
    agent.seniorMode = false; // Ensure standard mode
  });

  test('should execute standard mode workflow and generate files', async () => {
    fs.existsSync.mockReturnValueOnce(false); // Branch does not exist
    fs.existsSync.mockReturnValueOnce(false); // Ensure main file dir does not exist for mkdir
    fs.existsSync.mockReturnValueOnce(false); // Main file does not exist
    fs.existsSync.mockReturnValueOnce(false); // Ensure test file dir does not exist for mkdir

    const result = await agent.execute();

    expect(result.success).toBe(true);
    expect(result.mode).toBe('standard');

    const aiInstance = AIAgentEngine.mock.results[0].value;
    expect(aiInstance.analyzeTicket).toHaveBeenCalledWith(expect.objectContaining({ id: 'TICKET-STD-001' }));
    expect(aiInstance.generateImplementationPlan).toHaveBeenCalled();
    expect(aiInstance.generateCode).toHaveBeenCalledTimes(1);
    expect(aiInstance.generateCode).toHaveBeenCalledWith(
      'backend',
      'src/utils/math.js',
      mockTicket.description,
      null, // existingCode
      expect.any(Object), // analysis
      expect.stringContaining('Implement add function') // plan
    );
    expect(aiInstance.generateTests).toHaveBeenCalledTimes(1);

    // Check file system interactions
    expect(fs.writeFileSync).toHaveBeenCalledWith('.ai-plan-TICKET-STD-001.md', expect.any(String));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname('src/utils/math.js'), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith('src/utils/math.js', expect.stringContaining('function add(a, b)'));

    const testFilePath = 'src/utils/math.test.js';
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(testFilePath), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(testFilePath, '// Test for add function');

    // Check git commands
    expect(execSync).toHaveBeenCalledWith('git checkout -b feature/backend/ticket-std-001', { cwd: process.cwd() });
    expect(execSync).toHaveBeenCalledWith('git add .', { cwd: process.cwd() });
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining('git commit -m "feat(TICKET-STD-001):'), { cwd: process.cwd() });
  });

  test('should attempt to fix code if validation fails', async () => {
    const aiInstance = AIAgentEngine.mock.results[0].value;
    const validatorInstance = AIValidationLayer.mock.results[0].value;

    validatorInstance.validateCode
      .mockResolvedValueOnce({ valid: false, errors: [{ message: 'Syntax error' }] }) // First validation fails
      .mockResolvedValueOnce({ valid: true, errors: [] }); // Second validation passes

    await agent.execute();

    expect(validatorInstance.validateCode).toHaveBeenCalledTimes(2);
    expect(aiInstance.improveCode).toHaveBeenCalledTimes(1);
    expect(aiInstance.improveCode).toHaveBeenCalledWith(
      'function add(a, b) { return a + b; }', // Original code
      { feedback: 'Fix the following validation errors:\n[\n  {\n    "message": "Syntax error"\n  }\n]' }
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith('src/utils/math.js', 'function add(a, b) { return a + b; } // Improved');
  });

  test('should attempt to improve code if review score is low', async () => {
    const aiInstance = AIAgentEngine.mock.results[0].value;
    const validatorInstance = AIValidationLayer.mock.results[0].value;

    validatorInstance.validateCode.mockResolvedValue({ valid: true, errors: [] }); // Validation passes
    aiInstance.reviewCode.mockResolvedValueOnce({ score: 60, approved: false, issues: [{message: "Low quality"}] }); // Review fails

    await agent.execute();

    expect(aiInstance.reviewCode).toHaveBeenCalledTimes(1);
    expect(aiInstance.improveCode).toHaveBeenCalledTimes(1);
    expect(aiInstance.improveCode).toHaveBeenCalledWith(
      'function add(a, b) { return a + b; }', // Original code
      { score: 60, approved: false, issues: [{message: "Low quality"}] } // Review feedback
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith('src/utils/math.js', 'function add(a, b) { return a + b; } // Improved');
  });

  test('should use inferred files if analysis does not provide them', async () => {
    const aiInstance = AIAgentEngine.mock.results[0].value;
    aiInstance.analyzeTicket.mockResolvedValue({
        complexity: 'simple',
        estimatedLinesOfCode: 10,
        primaryGoal: 'Create a utility function',
        keyFeatures: ['adds two numbers'],
        requiredFiles: [], // Empty requiredFiles to trigger inference
        suggestedApproach: 'Create a function `add(a, b)`'
    });

    // Mock specific inferRequiredFiles behavior for this agent type and ticket
    jest.spyOn(agent, 'inferRequiredFiles').mockReturnValue(['src/inferred/util.js']);
    jest.spyOn(agent, 'extractComponentName'); // Keep an eye on this if inferRequiredFiles changes

    fs.existsSync.mockReturnValueOnce(false); // Branch
    fs.existsSync.mockReturnValueOnce(false); // Inferred file dir
    fs.existsSync.mockReturnValueOnce(false); // Inferred file
    fs.existsSync.mockReturnValueOnce(false); // Inferred test file dir

    await agent.execute();

    expect(agent.inferRequiredFiles).toHaveBeenCalled();
    expect(aiInstance.generateCode).toHaveBeenCalledWith(
      'backend',
      'src/inferred/util.js', // Check that the inferred file is used
      mockTicket.description,
      null,
      expect.any(Object),
      expect.any(String)
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith('src/inferred/util.js', expect.any(String));
    agent.inferRequiredFiles.mockRestore(); // Clean up spy
  });

});

// Basic E2E-like test (can be in a separate file e.g., tests/integration/ai-agent.e2e.test.js if desired)
// For simplicity, adding it here. It requires more setup if AIAgentEngine is not mocked.
// This version will use the mocked AIAgentEngine to avoid actual LLM calls and API keys.
describe('AIEnabledAgent - Standard Mode (E2E-like with Mocks)', () => {
  const testTicketId = 'TICKET-E2E-STD-001';
  const planFilePath = `.ai-plan-${testTicketId}.md`;
  const codeFilePath = 'src/utils/e2e-math.js';
  const testCodeFilePath = 'src/utils/e2e-math.test.js';

  beforeEach(() => {
    // Clean up any files from previous test runs
    if (fs.existsSync(planFilePath)) fs.unlinkSync(planFilePath);
    // For code/test files, need to handle directory cleanup if created, fs.rmSync might be better
    // For now, simple unlink, assuming dirs are managed by mocks or setup for real runs
    if (fs.existsSync(codeFilePath)) fs.unlinkSync(codeFilePath);
    if (fs.existsSync(testCodeFilePath)) fs.unlinkSync(testCodeFilePath);
    if (fs.existsSync(path.dirname(codeFilePath))) {
        // Simplified cleanup: remove file, then try to remove dir if empty.
        // In a real test suite, use a more robust cleanup (e.g., rimraf for the test output dir)
        try { fs.rmdirSync(path.dirname(codeFilePath)); } catch (e) { /* ignore if not empty */ }
    }
     if (fs.existsSync(path.dirname(testCodeFilePath))) {
        try { fs.rmdirSync(path.dirname(testCodeFilePath)); } catch (e) { /* ignore if not empty */ }
    }


    // Setup mocks for this E2E-like test
     AIAgentEngine.mockImplementation(() => ({
      analyzeTicket: jest.fn().mockResolvedValue({
        complexity: 'simple',
        primaryGoal: 'E2E test goal',
        keyFeatures: ['e2e feature'],
        requiredFiles: [codeFilePath],
        estimatedLinesOfCode: 5
      }),
      generateImplementationPlan: jest.fn().mockResolvedValue('E2E Plan: Implement math function'),
      generateCode: jest.fn().mockResolvedValue('// E2E Code'),
      generateTests: jest.fn().mockResolvedValue('// E2E Test'),
      reviewCode: jest.fn().mockResolvedValue({ score: 90, approved: true }),
      improveCode: jest.fn()
    }));
    AIValidationLayer.mockImplementation(() => ({
      validateCode: jest.fn().mockResolvedValue({ valid: true })
    }));

    // Reset fs mocks and set up for creation
    fs.existsSync.mockImplementation(filePath => {
      // Specific logic for this test if needed, or default to false
      if (filePath === planFilePath || filePath === codeFilePath || filePath === testCodeFilePath) return false;
      if (filePath === path.dirname(codeFilePath) || filePath === path.dirname(testCodeFilePath)) return false;
      return false; // Default: nothing exists
    });
    fs.writeFileSync.mockImplementation(()_ => {}); // Don't actually write
    fs.mkdirSync.mockImplementation(()_ => {});   // Don't actually make dirs
    execSync.mockImplementation(()_ => {});     // Don't actually run git commands
  });


  test('should run end-to-end creating plan, code, and test files', async () => {
    const mockE2ETicket = {
      id: testTicketId,
      description: 'E2E test: Create a simple e2e utility function.',
      agentType: 'backend'
    };
    const e2eAgent = new AIEnabledAgent('backend', mockE2ETicket);
    e2eAgent.seniorMode = false;

    // Unmock fs for this specific test to check for file creation
    // We need to be careful here: we want to mock AI calls but check real fs operations (or mocked fs that records calls)
    // For this setup, we'll check that the fs.writeFileSync and mkdirSync mocks were called correctly.

    await e2eAgent.execute();

    expect(fs.writeFileSync).toHaveBeenCalledWith(planFilePath, 'E2E Plan: Implement math function');
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(codeFilePath), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(codeFilePath, '// E2E Code');
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(testCodeFilePath), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(testCodeFilePath, '// E2E Test');

    // Verify git commands were called
    expect(execSync).toHaveBeenCalledWith(`git checkout -b feature/backend/${testTicketId.toLowerCase()}`, expect.any(Object));
    expect(execSync).toHaveBeenCalledWith('git add .', expect.any(Object));
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining(`feat(${testTicketId})`), expect.any(Object));
  });
});
