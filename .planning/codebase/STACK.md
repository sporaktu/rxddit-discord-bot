# Technology Stack

**Analysis Date:** 2025-01-11

## Languages

**Primary:**
- TypeScript 5.3.3 - All application code (`package.json`, `src/*.ts`)

**Secondary:**
- JavaScript - Build scripts, Jest config (`jest.config.js`)

## Runtime

**Environment:**
- Node.js 20.x (Alpine) - `Dockerfile` lines 2, 21
- No browser runtime (Discord bot only)

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- discord.js 14.14.1 - Discord bot client library (`package.json`, `src/bot.ts`)

**Testing:**
- Jest 29.7.0 - Unit and integration tests (`jest.config.js`)
- ts-jest - TypeScript support for Jest (`jest.config.js`)

**Build/Dev:**
- TypeScript 5.3.3 - Compilation to JavaScript (`tsconfig.json`)
- ts-node - Development execution without build step (`package.json`)

## Key Dependencies

**Critical:**
- discord.js 14.14.1 - Discord API integration, message handling, reactions (`src/bot.ts`)
- better-sqlite3 11.7.0 - Embedded SQLite database for message tracking (`src/database.ts`)
- dotenv 16.4.5 - Environment variable management (`src/bot.ts`, `.env.example`)

**Infrastructure:**
- Node.js built-ins - fs, path for file operations (`src/database.ts`)

## Configuration

**Environment:**
- `.env` file for local development (gitignored)
- `.env.example` - Template with required variables
- Required vars: `DISCORD_TOKEN`, `CLIENT_ID` (optional)

**Build:**
- `tsconfig.json` - TypeScript compiler options (ES2020 target, strict mode)
- `jest.config.js` - Test runner configuration

## Platform Requirements

**Development:**
- Any platform with Node.js 20+
- No external dependencies (SQLite is embedded)

**Production:**
- Docker container (multi-stage build)
- Container registry: GitHub Container Registry (GHCR)
- Image: `ghcr.io/sporaktu/rxddit-discord-bot`
- Kubernetes deployment supported (`k8s/deployment.yaml`)
- Resource limits: CPU 500m, Memory 256Mi

---

*Stack analysis: 2025-01-11*
*Update after major dependency changes*
