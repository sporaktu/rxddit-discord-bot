# Coding Conventions

**Analysis Date:** 2025-01-11

## Naming Patterns

**Files:**
- `camelCase.ts` for source modules (`bot.ts`, `database.ts`, `linkUtils.ts`)
- `kebab-case.test.ts` for test files (`linkUtils.test.ts`, `database.test.ts`)
- `UPPERCASE.md` for important documentation (`README.md`, `KUBERNETES_DEPLOYMENT_PLAN.md`)

**Functions:**
- camelCase for all functions (`detectRedditLinks`, `convertToRxddit`, `hasVideoOrGallery`)
- No special prefix for async functions
- Event handlers use descriptive names (`client.on('messageCreate', ...)`)

**Variables:**
- camelCase for variables (`messageId`, `channelId`, `botMessage`)
- UPPER_SNAKE_CASE for constants (`ROBOT_EMOJI`, `MESSAGE_RETENTION_DAYS`, `EMBED_WAIT_MS`)
- No underscore prefix for private members (use `private` keyword)

**Types:**
- PascalCase for interfaces (`StoredMessage`, `StoredReaction`)
- PascalCase for classes (`MessageDatabase`)
- No I prefix for interfaces

## Code Style

**Formatting:**
- 4-space indentation (consistent throughout)
- Single quotes for strings
- Semicolons always present
- No trailing commas
- No explicit formatter config (manual consistency)

**Linting:**
- No ESLint or Prettier configuration
- TypeScript strict mode enforces code quality (`tsconfig.json`)
- Compiler flags: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`

## Import Organization

**Order:**
1. External packages (dotenv, discord.js, better-sqlite3)
2. Relative imports (./database, ./linkUtils)
3. Type imports mixed with regular imports

**Grouping:**
- No blank lines between import groups
- Destructured imports on single line when short
- Multi-line destructured imports for many items

**Path Aliases:**
- None configured (relative paths only)

## Error Handling

**Patterns:**
- Try/catch at event handler boundaries (`src/bot.ts`)
- Errors logged with context using `console.error()`
- Non-blocking error handling (one failure doesn't stop other operations)

**Error Types:**
- Throw on database initialization failure
- Log and continue on message processing errors
- Graceful shutdown on SIGINT/SIGTERM

**Logging:**
- `console.log()` for info messages
- `console.error()` for errors with context
- Include message ID, channel ID in error logs

## Logging

**Framework:**
- Console logging (no external library)
- No log levels beyond log/error

**Patterns:**
- Log state transitions: "Bot is online", "Message processed"
- Log external calls: Discord API operations
- Log errors with context: `console.error('Failed to process:', error)`

**When:**
- Bot startup and shutdown
- Message processing (success and failure)
- Cleanup job execution
- Revert operations

## Comments

**When to Comment:**
- Explain non-obvious logic (e.g., "Reset lastIndex for global regex")
- Document business rules (e.g., auto-revert conditions)
- Mark TODO items for future work

**JSDoc/TSDoc:**
- Used for exported functions in `src/linkUtils.ts`
- Format: `@param` and `@returns` tags
- Not required for internal functions

**TODO Comments:**
- Format: `// TODO: description`
- No username or issue linking

## Function Design

**Size:**
- Functions generally under 50 lines
- Helper functions extracted for complex logic
- Main event handlers are longer (acceptable for orchestration)

**Parameters:**
- Max 3-4 parameters for most functions
- Object destructuring for database operations (e.g., `storeMessage(data)`)
- Explicit type annotations on all parameters

**Return Values:**
- Explicit return statements
- Return type annotations on all functions
- `void` for side-effect-only functions
- Boolean returns for atomic operations (`markAsReverted()`)

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export class`)
- Single default export for main class (`MessageDatabase`)
- Re-export from index not used (flat structure)

**Barrel Files:**
- Not used (each file imports directly from source)
- Circular dependency avoidance not an issue (small codebase)

**Module Boundaries:**
- `linkUtils.ts` - Pure functions, no side effects
- `database.ts` - Stateful, manages singleton instance
- `bot.ts` - Orchestrator, wires everything together

---

*Convention analysis: 2025-01-11*
*Update when patterns change*
