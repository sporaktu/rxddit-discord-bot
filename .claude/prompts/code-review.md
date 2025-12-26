# rxddit Discord Bot - Code Review Prompt

You are an expert code reviewer specializing in TypeScript, Discord.js bots, and SQLite databases. Review the following codebase for a Discord bot that converts Reddit links to rxddit links for better embeds.

## Project Overview

This bot:
1. Monitors Discord messages for Reddit links (reddit.com, www.reddit.com, old.reddit.com, new.reddit.com)
2. Converts detected links to rxddit.com equivalents
3. Posts a new message with converted links and reacts with 🤖 emoji
4. Allows the original author to revert by reacting with 🤖
5. Stores all conversions in a SQLite database for persistence

## Review Checklist

### 1. Security Review

- [ ] **SQL Injection**: Check all database queries use parameterized statements
- [ ] **Input Validation**: Verify user input (message content, IDs) is properly sanitized
- [ ] **Permission Checks**: Ensure bot verifies permissions before actions
- [ ] **Environment Variables**: Confirm sensitive data (DISCORD_TOKEN) is not exposed
- [ ] **Rate Limiting**: Check if the bot handles Discord rate limits properly
- [ ] **Regex DoS (ReDoS)**: Analyze regex patterns for catastrophic backtracking vulnerabilities
- [ ] **Path Traversal**: Check database path handling for directory traversal attacks

### 2. Error Handling

- [ ] **Uncaught Exceptions**: Identify places where errors could crash the bot
- [ ] **Partial Failures**: Check handling when some operations succeed and others fail
- [ ] **Network Errors**: Verify Discord API call failures are handled gracefully
- [ ] **Database Errors**: Ensure SQLite errors don't leave data in inconsistent state
- [ ] **Missing Resources**: Check handling when messages/channels/users don't exist

### 3. Discord.js Best Practices

- [ ] **Intents**: Verify all required intents are declared (Guilds, GuildMessages, MessageContent, GuildMessageReactions)
- [ ] **Partials**: Check if partial message/reaction handling is correct
- [ ] **Caching**: Review cache usage and potential memory issues
- [ ] **Event Listeners**: Check for memory leaks from unremoved listeners
- [ ] **Sharding**: Consider if bot needs sharding support for scale

### 4. Database Design

- [ ] **Schema Design**: Review table structure for normalization and efficiency
- [ ] **Indexes**: Verify indexes exist for frequently queried columns
- [ ] **Transactions**: Check if multi-step operations use transactions
- [ ] **Connection Management**: Ensure database connections are properly closed
- [ ] **Data Retention**: Verify cleanup jobs work correctly and don't cause issues
- [ ] **Concurrency**: Check for race conditions in database access

### 5. Code Quality

- [ ] **TypeScript Types**: Verify proper typing without excessive `any` usage
- [ ] **Code Duplication**: Identify repeated code that should be refactored
- [ ] **Function Size**: Check for overly long functions that should be split
- [ ] **Naming Conventions**: Ensure consistent and descriptive naming
- [ ] **Comments**: Verify complex logic is documented
- [ ] **Dead Code**: Identify unused variables, functions, or imports

### 6. Edge Cases

- [ ] **Empty Messages**: Handle messages with no content
- [ ] **Very Long Messages**: Check behavior with Discord's 2000 char limit
- [ ] **Multiple Links**: Verify correct handling of many Reddit links in one message
- [ ] **Duplicate Links**: Check if duplicate URLs are handled correctly
- [ ] **Malformed URLs**: Test handling of invalid or partial Reddit URLs
- [ ] **Unicode/Emoji**: Verify special characters in messages are preserved
- [ ] **DM Messages**: Ensure DMs are properly ignored
- [ ] **Bot Messages**: Verify bot doesn't respond to itself or other bots
- [ ] **Deleted Messages**: Handle cases where original message is deleted
- [ ] **Channel Permissions**: Check behavior when bot loses permissions mid-operation

### 7. Performance

- [ ] **Regex Efficiency**: Review regex patterns for performance
- [ ] **Database Queries**: Check for N+1 queries or inefficient lookups
- [ ] **Memory Usage**: Look for potential memory leaks (especially in Maps/caches)
- [ ] **Async/Await**: Verify proper use of async patterns
- [ ] **Batch Operations**: Check if bulk operations could improve performance

### 8. Testing Coverage

- [ ] **Unit Tests**: Verify all utility functions have tests
- [ ] **Integration Tests**: Check database operations are tested end-to-end
- [ ] **Edge Case Tests**: Ensure unusual inputs are covered
- [ ] **Mock Usage**: Verify Discord.js mocking is appropriate
- [ ] **Test Isolation**: Confirm tests don't interfere with each other

### 9. Deployment & Operations

- [ ] **Graceful Shutdown**: Verify SIGINT/SIGTERM handlers work correctly
- [ ] **Logging**: Check if logging is sufficient for debugging production issues
- [ ] **Health Checks**: Consider adding health check endpoints
- [ ] **Configuration**: Verify all config is externalized appropriately
- [ ] **Docker**: Review Dockerfile for security and efficiency

### 10. Specific Issues to Look For

```typescript
// Check for these patterns:

// 1. Unhandled promise rejections
someAsyncFunction(); // Missing await or .catch()

// 2. Race conditions in reaction handling
if (storedMessage && !storedMessage.isReverted) {
    // Another reaction could revert between check and action
}

// 3. Regex with global flag issues
const pattern = /something/g;
pattern.test(str1); // Changes lastIndex
pattern.test(str2); // May give wrong result

// 4. Missing null checks on Discord objects
message.guild.members // guild could be null in DMs

// 5. Hardcoded timeouts without configuration
setTimeout(() => {}, 24 * 60 * 60 * 1000); // Should be configurable

// 6. Insufficient error context in logs
console.error('Error:', error); // Should include message ID, channel, etc.
```

## Output Format

Please provide your review in this format:

### Critical Issues (Must Fix)
- Issue description with file:line reference
- Explanation of impact
- Suggested fix

### High Priority (Should Fix)
- Issue description with file:line reference
- Explanation of impact
- Suggested fix

### Medium Priority (Nice to Fix)
- Issue description
- Suggested improvement

### Low Priority (Consider)
- Suggestions for future improvement

### Positive Observations
- Well-implemented patterns worth noting

---

## Files to Review

1. `src/bot.ts` - Main bot logic and Discord event handlers
2. `src/database.ts` - SQLite database operations
3. `src/linkUtils.ts` - Reddit link detection and conversion utilities
4. `tests/*.test.ts` - Test files
5. `package.json` - Dependencies
6. `tsconfig.json` - TypeScript configuration
7. `Dockerfile` & `docker-compose.yml` - Deployment configuration
