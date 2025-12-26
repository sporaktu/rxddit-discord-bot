# Code Review Command

Review the entire codebase using the code review checklist in `.claude/prompts/code-review.md`.

## Instructions

1. Read the code review prompt from `.claude/prompts/code-review.md`
2. Read all source files:
   - `src/bot.ts`
   - `src/database.ts`
   - `src/linkUtils.ts`
3. Read all test files in `tests/`
4. Read configuration files:
   - `package.json`
   - `tsconfig.json`
   - `jest.config.js`
   - `Dockerfile`
   - `docker-compose.yml`
5. Analyze the code against each checklist item
6. Provide findings in the specified output format

Focus especially on:
- Security vulnerabilities
- Error handling gaps
- Race conditions
- Edge cases that could crash the bot
- Discord.js best practices

Be thorough but practical - prioritize issues that could cause real problems in production.
