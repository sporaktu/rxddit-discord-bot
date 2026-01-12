# Codebase Concerns

**Analysis Date:** 2025-01-11

## Tech Debt

**Missing Tests for Main Bot Logic:**
- Issue: Core bot event handlers not covered by tests
- Files: `src/bot.ts` excluded from coverage (`jest.config.js` line 12)
- Why: Would require mocking Discord.js client
- Impact: Critical functionality like `hasVideoOrGallery()` and auto-revert logic untested
- Fix approach: Create `tests/bot.test.ts` with Discord.js mocks

**Console Logging Instead of Structured Logging:**
- Issue: 37 console.log/console.error statements with no structured format
- Files: `src/bot.ts` throughout
- Why: Simple initial implementation
- Impact: Difficult to filter logs in production, no log levels
- Fix approach: Add simple logger (winston or pino) with structured JSON output

## Known Bugs

**None identified** - Codebase is clean

## Security Considerations

**Environment Variable Handling:**
- Risk: Token exposure if `.env` committed
- Files: `.env` (gitignored), `.env.example`
- Current mitigation: `.env` in `.gitignore`, `.env.example` has no secrets
- Recommendations: Document secure token handling in README

**Database File Permissions:**
- Risk: Database accessible to other processes if permissions wrong
- Files: `data/messages.db`
- Current mitigation: Docker runs as non-root user (`Dockerfile` lines 35-43)
- Recommendations: None needed (properly configured)

## Performance Bottlenecks

**No significant concerns identified.**

The codebase is well-optimized:
- SQLite operations use prepared statements
- Indexes on frequently queried columns (`src/database.ts`)
- 24-hour cleanup job prevents unbounded growth

## Fragile Areas

**Embed Detection Logic:**
- Files: `src/bot.ts` lines 177-221
- Why fragile: Multi-strategy embed detection (video, type, provider checks)
- Common failures: Discord embed format changes could break detection
- Safe modification: Test against real Discord embeds before changes
- Test coverage: Not covered (requires Discord.js mocking)

**5-Second Embed Wait:**
- File: `src/bot.ts` line 55 (`EMBED_WAIT_MS = 5000`)
- Why fragile: Arbitrary timeout for embed loading
- Common failures: Slow connections may not load embeds in time
- Safe modification: Make configurable via environment variable
- Test coverage: Not covered

## Scaling Limits

**SQLite Database:**
- Current capacity: Suitable for thousands of messages
- Limit: Single writer (SQLite limitation)
- Symptoms at limit: Slow writes under high concurrent load
- Scaling path: Migrate to PostgreSQL if bot serves many servers

**Single Process:**
- Current capacity: One Discord shard (up to ~2500 guilds)
- Limit: Discord requires sharding above 2500 guilds
- Symptoms at limit: Connection failures
- Scaling path: Implement Discord.js sharding

## Dependencies at Risk

**react-hot-toast (Not used - clean):**
- All dependencies are current and maintained
- discord.js 14.14.1 - Actively maintained
- better-sqlite3 11.7.0 - Actively maintained

## Missing Critical Features

**No critical features missing for current scope.**

Potential enhancements (not blockers):
- Structured logging
- Metrics/monitoring integration
- Health check endpoint

## Test Coverage Gaps

**Bot Event Handlers:**
- What's not tested: `MessageCreate`, `MessageReactionAdd` handlers
- Files: `src/bot.ts`
- Risk: Regression bugs in core message processing
- Priority: Medium
- Difficulty to test: Requires mocking Discord.js client

**Embed Detection Function:**
- What's not tested: `hasVideoOrGallery()` function
- Files: `src/bot.ts` lines 57-82
- Risk: Auto-revert logic could break silently
- Priority: High
- Difficulty to test: Need to create mock Discord embed objects

**Transaction Rollback:**
- What's not tested: Database transaction failure scenario
- Files: `src/database.ts` lines 307-313
- Risk: Low (unlikely scenario)
- Priority: Low
- Difficulty to test: Need to simulate SQLite failures

---

## Summary

| Category | Status | Severity |
|----------|--------|----------|
| Security | Good | Low |
| Error Handling | Good | Low |
| Test Coverage | Partial (87% excluding bot.ts) | Medium |
| Code Quality | Good | Low |
| Documentation | Fair | Low |
| Performance | Good | Low |

**Overall Assessment:** Production-ready code with minimal technical debt. Main improvement opportunity is expanding test coverage to include bot event handlers and adding structured logging.

---

*Concerns audit: 2025-01-11*
*Update as issues are fixed or new ones discovered*
