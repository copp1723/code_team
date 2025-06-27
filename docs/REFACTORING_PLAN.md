# Multi-Agent Orchestrator Refactoring Plan

## Current Issues

### 1. **File Organization Chaos**
- 70+ loose JavaScript files in the root directory
- No clear separation of concerns
- Multiple files doing similar things (duplication)
- Test files mixed with production code
- Configuration files scattered everywhere
- Documentation files mixed with code

### 2. **Code Duplication**
- Multiple AI agent implementations (ai-agent.js, senior-ai-agent.js, enhanced-ai-agent.js, etc.)
- Several orchestrator variants
- Duplicate configuration systems
- Multiple launch scripts doing the same thing

### 3. **Poor Architecture**
- No clear module boundaries
- Tight coupling between components
- No dependency injection
- Hard-coded paths everywhere
- Global state management issues

### 4. **Technical Debt**
- Temporary files (.ai-plan-*, .workflow-*, etc.) not cleaned up
- Multiple deprecated/old implementations still present
- Shell scripts that could be Node.js scripts
- No proper build process

## Proposed Clean Architecture

```
multi-agent-orchestrator/
├── src/
│   ├── core/                    # Core business logic
│   │   ├── agents/              # Agent implementations
│   │   │   ├── base/            # Base agent classes
│   │   │   │   ├── Agent.js
│   │   │   │   └── AIAgent.js
│   │   │   ├── specialized/     # Specialized agents
│   │   │   │   ├── FrontendAgent.js
│   │   │   │   ├── BackendAgent.js
│   │   │   │   ├── DatabaseAgent.js
│   │   │   │   ├── IntegrationAgent.js
│   │   │   │   └── TestingAgent.js
│   │   │   └── master/          # Master agent
│   │   │       └── MasterAgent.js
│   │   │
│   │   ├── orchestration/       # Orchestration logic
│   │   │   ├── Orchestrator.js
│   │   │   ├── Dispatcher.js
│   │   │   └── WorkflowEngine.js
│   │   │
│   │   ├── ai/                  # AI engine components
│   │   │   ├── AIEngine.js
│   │   │   ├── ModelManager.js
│   │   │   └── PromptBuilder.js
│   │   │
│   │   └── validation/          # Validation & monitoring
│   │       ├── Validator.js
│   │       ├── Monitor.js
│   │       └── Recovery.js
│   │
│   ├── infrastructure/          # Infrastructure layer
│   │   ├── config/              # Configuration management
│   │   │   ├── ConfigLoader.js
│   │   │   └── defaults.js
│   │   ├── storage/             # Data persistence
│   │   │   ├── FileStorage.js
│   │   │   └── StateManager.js
│   │   ├── git/                 # Git operations
│   │   │   └── GitManager.js
│   │   └── logging/             # Logging system
│   │       └── Logger.js
│   │
│   ├── api/                     # API layer
│   │   ├── rest/                # REST API
│   │   │   ├── server.js
│   │   │   └── routes/
│   │   └── websocket/           # WebSocket server
│   │       └── WSServer.js
│   │
│   └── cli/                     # CLI interface
│       ├── index.js
│       └── commands/
│           ├── init.js
│           ├── agent.js
│           ├── ticket.js
│           └── integrate.js
│
├── web-interface/               # Web UI (already organized)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── server.js
│
├── config/                      # Configuration files
│   ├── default.json
│   ├── agents.json
│   └── models.json
│
├── scripts/                     # Utility scripts
│   ├── setup.js
│   ├── clean.js
│   └── migrate.js
│
├── tests/                       # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                        # Documentation
│   ├── README.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── guides/
│
├── data/                        # Runtime data (gitignored)
│   ├── logs/
│   ├── temp/
│   └── state/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Implementation Steps

### Phase 1: Core Refactoring (Week 1)

1. **Create new directory structure**
   ```bash
   mkdir -p src/{core/{agents/{base,specialized,master},orchestration,ai,validation},infrastructure/{config,storage,git,logging},api/{rest,websocket},cli/commands}
   mkdir -p {config,scripts,tests/{unit,integration,e2e},docs/guides,data/{logs,temp,state}}
   ```

2. **Consolidate agent implementations**
   - Merge all agent variants into a single, configurable system
   - Extract common functionality into base classes
   - Use composition over inheritance

3. **Unify configuration system**
   - Single source of truth for all configuration
   - Environment-based overrides
   - Schema validation

### Phase 2: Infrastructure (Week 2)

1. **Implement proper dependency injection**
   ```javascript
   // src/core/Container.js
   class Container {
     constructor() {
       this.services = new Map();
       this.singletons = new Map();
     }
     
     register(name, factory, options = {}) {
       this.services.set(name, { factory, options });
     }
     
     resolve(name) {
       // Dependency resolution logic
     }
   }
   ```

2. **Create unified logging system**
   ```javascript
   // src/infrastructure/logging/Logger.js
   class Logger {
     constructor(options) {
       this.level = options.level || 'info';
       this.transports = options.transports || [];
     }
     
     log(level, message, meta = {}) {
       // Structured logging
     }
   }
   ```

3. **Implement state management**
   ```javascript
   // src/infrastructure/storage/StateManager.js
   class StateManager {
     constructor(storage) {
       this.storage = storage;
       this.cache = new Map();
     }
     
     async getState(key) {
       // Get with caching
     }
     
     async setState(key, value) {
       // Set with persistence
     }
   }
   ```

### Phase 3: API Consolidation (Week 3)

1. **Unify all APIs into single server**
   ```javascript
   // src/api/server.js
   class APIServer {
     constructor(config) {
       this.app = express();
       this.server = http.createServer(this.app);
       this.wss = new WebSocket.Server({ server: this.server });
       
       this.setupMiddleware();
       this.setupRoutes();
       this.setupWebSocket();
     }
     
     start() {
       // Single entry point
     }
   }
   ```

2. **Create proper CLI tool**
   ```javascript
   // src/cli/index.js
   #!/usr/bin/env node
   const { Command } = require('commander');
   const program = new Command();
   
   program
     .name('orchestrator')
     .description('Multi-Agent Orchestrator CLI')
     .version('2.0.0');
   
   // Command registration
   require('./commands/init')(program);
   require('./commands/agent')(program);
   require('./commands/ticket')(program);
   require('./commands/integrate')(program);
   
   program.parse();
   ```

### Phase 4: Testing & Documentation (Week 4)

1. **Add comprehensive test suite**
   ```javascript
   // tests/unit/agents/Agent.test.js
   describe('Agent', () => {
     beforeEach(() => {
       // Setup
     });
     
     test('should initialize with config', () => {
       // Test implementation
     });
   });
   ```

2. **Generate API documentation**
   ```javascript
   // Use JSDoc for automatic documentation
   /**
    * @class Agent
    * @description Base agent class for all specialized agents
    */
   ```

## Key Improvements

### 1. **Single Entry Point**
```javascript
// index.js
const Orchestrator = require('./src/core/orchestration/Orchestrator');
const config = require('./src/infrastructure/config/ConfigLoader').load();

const orchestrator = new Orchestrator(config);
orchestrator.start();
```

### 2. **Plugin Architecture**
```javascript
// src/core/plugins/PluginManager.js
class PluginManager {
  async loadPlugin(name) {
    const plugin = await import(`./plugins/${name}`);
    return plugin.default(this.container);
  }
}
```

### 3. **Event-Driven Architecture**
```javascript
// src/core/events/EventBus.js
class EventBus extends EventEmitter {
  emit(event, data) {
    this.logger.debug(`Event: ${event}`, data);
    super.emit(event, data);
  }
}
```

### 4. **Proper Error Handling**
```javascript
// src/core/errors/AppError.js
class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
```

## Migration Script

```javascript
// scripts/migrate.js
const fs = require('fs-extra');
const path = require('path');

async function migrate() {
  // 1. Backup current structure
  await fs.copy('.', '../orchestrator-backup');
  
  // 2. Create new structure
  // ... directory creation
  
  // 3. Move and consolidate files
  const migrations = [
    { from: 'ai-agent.js', to: 'src/core/agents/base/AIAgent.js' },
    { from: 'master-agent.js', to: 'src/core/agents/master/MasterAgent.js' },
    // ... more migrations
  ];
  
  for (const { from, to } of migrations) {
    if (await fs.pathExists(from)) {
      await fs.move(from, to);
    }
  }
  
  // 4. Clean up old files
  const deprecated = [
    'senior-ai-agent.js',
    'enhanced-orchestrator.js',
    // ... more deprecated files
  ];
  
  for (const file of deprecated) {
    await fs.remove(file);
  }
}

migrate().catch(console.error);
```

## Benefits

1. **Maintainability**: Clear separation of concerns, easy to find and modify code
2. **Testability**: Dependency injection enables easy unit testing
3. **Scalability**: Plugin architecture allows easy extension
4. **Performance**: Better resource management, caching, and optimization
5. **Developer Experience**: Clear structure, good documentation, single entry points
6. **Production Ready**: Proper error handling, logging, monitoring

## Next Steps

1. Review and approve the refactoring plan
2. Set up new project structure
3. Begin incremental migration
4. Add tests as we go
5. Update documentation
6. Deploy new version

This refactoring will transform the project from a prototype into a production-ready system that's maintainable, scalable, and professional.
