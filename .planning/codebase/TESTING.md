# Testing Patterns

**Analysis Date:** 2025-01-11

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `jest.config.js` in project root

**Assertion Library:**
- Jest built-in expect
- Matchers: `toBe`, `toEqual`, `toThrow`, `toContain`, `toHaveLength`

**Run Commands:**
```bash
npm test                              # Run all tests
npm test -- --watch                   # Watch mode
npm test -- tests/linkUtils.test.ts   # Single file
npm run test:coverage                 # Coverage report
npm run test:ci                       # CI mode with JUnit output
```

## Test File Organization

**Location:**
- Separate `tests/` directory
- Not co-located with source

**Naming:**
- `{module}.test.ts` for unit tests
- `integration.test.ts` for end-to-end tests
- `setup.ts` for test utilities

**Structure:**
```
tests/
├── database.test.ts      # Database operations (680 lines)
├── linkUtils.test.ts     # URL detection/conversion (410 lines)
├── integration.test.ts   # Full workflow tests (434 lines)
└── setup.ts              # Test environment setup
```

## Test Structure

**Suite Organization:**
```typescript
describe('ModuleName', () => {
    describe('functionName', () => {
        beforeEach(() => {
            // Reset state
        });

        afterEach(() => {
            // Cleanup
        });

        it('should handle specific case', () => {
            // Arrange
            const input = 'test data';

            // Act
            const result = functionUnderTest(input);

            // Assert
            expect(result).toBe(expectedValue);
        });
    });
});
```

**Patterns:**
- `beforeEach` for per-test setup
- `afterEach` for cleanup (close database, delete files)
- `beforeAll`/`afterAll` for expensive setup
- Explicit arrange/act/assert structure

## Mocking

**Framework:**
- No external mocking library
- SQLite in-memory testing (unique database per test)

**Patterns:**
```typescript
// Unique database per test
const dbPath = getTestDbPath('testname');
const db = new MessageDatabase(dbPath);

// Cleanup after test
afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
});
```

**What to Mock:**
- Not applicable (tests use real SQLite)
- Discord.js would need mocking for bot.ts tests (not implemented)

**What NOT to Mock:**
- Database operations (test against real SQLite)
- Pure utility functions (test directly)

## Fixtures and Factories

**Test Data:**
```typescript
// Sample data object pattern
const sampleMessage: Omit<StoredMessage, 'isReverted'> = {
    messageId: 'msg123',
    channelId: 'channel456',
    guildId: 'guild789',
    authorId: 'author1',
    authorTag: 'Author#0001',
    originalContent: 'https://reddit.com/r/test/comments/123',
    convertedContent: 'https://redditez.com/r/test/comments/123',
    originalLinks: '["https://reddit.com/r/test/comments/123"]',
    convertedLinks: '["https://redditez.com/r/test/comments/123"]',
    botMessageId: 'bot123',
    createdAt: Date.now()
};

// Override pattern
db.storeMessage({ ...sampleMessage, messageId: 'unique123' });
```

**Location:**
- Inline in test files (no separate fixtures directory)
- `tests/setup.ts` for shared utilities (`getTestDbPath()`)

## Coverage

**Requirements:**
- Lines: 90%
- Functions: 90%
- Statements: 90%
- Branches: 65%

**Configuration:**
- Coverage via `jest --coverage`
- Exclusions: `src/bot.ts` (requires Discord connection)
- Output: `coverage/` directory

**View Coverage:**
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html
```

## Test Types

**Unit Tests:**
- `linkUtils.test.ts` - URL detection, conversion, regex patterns
- `database.test.ts` - CRUD operations, transactions, cleanup
- Scope: Single function/method in isolation
- Speed: <100ms per test

**Integration Tests:**
- `integration.test.ts` - Full message processing workflows
- Scope: Multiple modules working together
- Tests: Link detection → conversion → storage → revert flow
- Speed: <500ms per test

**E2E Tests:**
- Not implemented (would require Discord bot connection)
- Manual testing via live Discord server

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
    const result = await asyncFunction();
    expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
    expect(() => parse(null)).toThrow();
});
```

**Database Testing:**
```typescript
// Unique database per test file
let db: MessageDatabase;
const dbPath = getTestDbPath('database-test');

beforeEach(() => {
    db = new MessageDatabase(dbPath);
});

afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
});
```

**Snapshot Testing:**
- Not used in this codebase
- Explicit assertions preferred for clarity

## Test Isolation

**Serial Execution:**
- `maxWorkers: 1` in Jest config
- Required for SQLite I/O safety

**Database Isolation:**
- Unique database file per test via `getTestDbPath()`
- Files cleaned up in `afterEach`

**Timeout:**
- 10 seconds per test (`testTimeout: 10000`)

---

*Testing analysis: 2025-01-11*
*Update when test patterns change*
