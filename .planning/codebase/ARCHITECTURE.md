# Architecture

**Analysis Date:** 2025-01-11

## Pattern Overview

**Overall:** Event-Driven Monolith with Data Persistence

**Key Characteristics:**
- Single Discord bot process
- Event-driven message processing (Discord Gateway)
- Embedded SQLite for state persistence
- Stateless request handling (each message processed independently)

## Layers

**Event/Presentation Layer:**
- Purpose: Handle Discord events and orchestrate responses
- Contains: Event handlers for messages and reactions
- Location: `src/bot.ts`
- Depends on: Service layer (linkUtils), Data layer (database)
- Used by: Discord.js client events

**Service/Business Logic Layer:**
- Purpose: URL detection and transformation logic
- Contains: Link parsing, regex patterns, conversion functions
- Location: `src/linkUtils.ts`
- Depends on: Nothing (pure functions)
- Used by: Event layer (bot.ts)

**Data/Persistence Layer:**
- Purpose: Message and reaction storage/retrieval
- Contains: SQLite wrapper, CRUD operations, cleanup logic
- Location: `src/database.ts`
- Depends on: better-sqlite3 library
- Used by: Event layer (bot.ts)

## Data Flow

**Message Processing Flow:**

1. User posts message containing Reddit link
2. `MessageCreate` event fires (`src/bot.ts`)
3. `detectRedditLinks()` finds Reddit URLs (`src/linkUtils.ts`)
4. `convertMessageLinks()` transforms to redditez URLs
5. Bot sends converted message to channel
6. `db.storeMessage()` records in SQLite (`src/database.ts`)
7. Original message embeds suppressed
8. Robot emoji reaction added to bot message
9. After 5s delay, embeds checked for video/gallery
10. If not video/gallery content: auto-revert (delete bot message, restore embeds)

**Revert Flow (User-Initiated):**

1. User reacts with 🤖 emoji to bot message
2. `MessageReactionAdd` event fires
3. Original author verified
4. `db.markAsReverted()` atomically marks message (`src/database.ts`)
5. Bot message deleted
6. Original message embeds restored

**State Management:**
- File-based: SQLite database at `data/messages.db`
- No in-memory caching
- Automatic 30-day cleanup via scheduled job

## Key Abstractions

**MessageDatabase Class:**
- Purpose: Encapsulate all database operations
- Location: `src/database.ts`
- Pattern: Singleton (via `getDatabase()` function)
- Methods: `storeMessage()`, `getMessage()`, `markAsReverted()`, `cleanupOldMessages()`

**Link Detection Functions:**
- Purpose: Pure functions for URL processing
- Location: `src/linkUtils.ts`
- Pattern: Functional (no side effects)
- Functions: `detectRedditLinks()`, `convertToRxddit()`, `convertMessageLinks()`

**Regex Patterns:**
- Purpose: Match Reddit URL variants
- Location: `src/linkUtils.ts`
- Pattern: Frozen immutable objects (`Object.freeze()`)
- Constant: `REDDIT_PATTERNS`

## Entry Points

**Main Bot Entry:**
- Location: `src/bot.ts`
- Compiled to: `dist/bot.js`
- Triggers: `node dist/bot.js` or `npm start`
- Responsibilities: Initialize Discord client, register event handlers, start cleanup job

**Database Entry:**
- Location: `src/database.ts` → `getDatabase()`
- Triggers: First call (lazy initialization)
- Responsibilities: Create database, initialize schema, return singleton instance

## Error Handling

**Strategy:** Try/catch at event handler boundaries with console logging

**Patterns:**
- All Discord event handlers wrapped in try/catch (`src/bot.ts` lines 112-226)
- Errors logged to console with context
- Non-blocking (one error doesn't stop other message processing)
- Graceful shutdown on SIGINT/SIGTERM signals (`src/bot.ts` lines 316-336)

## Cross-Cutting Concerns

**Logging:**
- Console.log for info, console.error for errors
- No structured logging framework
- Includes context: channel, message ID, user

**Validation:**
- Discord.js validates message objects
- Regex patterns validate URL formats
- Database uses parameterized queries (SQL injection prevention)

**Cleanup:**
- 24-hour interval cleanup job (`src/bot.ts` line 98)
- 30-day message retention (`MESSAGE_RETENTION_DAYS`)
- Cascading deletes for reactions via foreign keys

---

*Architecture analysis: 2025-01-11*
*Update when major patterns change*
