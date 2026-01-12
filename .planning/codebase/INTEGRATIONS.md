# External Integrations

**Analysis Date:** 2025-01-11

## APIs & External Services

**Discord API:**
- discord.js library for all Discord interactions
- Location: `src/bot.ts` (lines 2-34)
- Functionality: Bot login, message monitoring, reaction handling, embed suppression
- Intents: Guilds, GuildMessages, MessageContent, GuildMessageReactions
- Partials: Message, Reaction, User (for partial data handling)
- Auth: `DISCORD_TOKEN` environment variable (`.env.example`)

**Reddit Link Conversion Service (redditez):**
- Service: Converts Reddit URLs to redditez.com embeds for better video playback
- Location: `src/linkUtils.ts` (lines 54-63)
- Pattern detection: Matches reddit.com, www.reddit.com, old.reddit.com, new.reddit.com, v.redd.it, i.redd.it, preview.redd.it
- Recent migration: From rxddit.com to redditez.com

## Data Storage

**Databases:**
- SQLite via better-sqlite3 - Embedded local database
  - Location: `src/database.ts`
  - Database file: `data/messages.db`
  - Tables: `messages`, `reactions`
  - Features: Foreign keys, indexes, 30-day retention cleanup

**File Storage:**
- Local filesystem only
- Database file persisted via Docker volume (`bot-data`) or Kubernetes PVC

**Caching:**
- None (all queries hit SQLite directly)

## Authentication & Identity

**Auth Provider:**
- Discord OAuth via bot token
  - Token storage: Environment variable `DISCORD_TOKEN`
  - No user authentication (bot-only service)

**OAuth Integrations:**
- None (Discord bot token only)

## Monitoring & Observability

**Error Tracking:**
- Console logging only (`console.error` statements in `src/bot.ts`)
- No external error tracking service

**Analytics:**
- Internal database statistics via `db.getStats()` (`src/database.ts`)

**Logs:**
- stdout/stderr only
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Kubernetes cluster in `ai-bots` namespace
- Docker containers on GitHub Container Registry (GHCR)
- ArgoCD for GitOps deployment (`.github/workflows/docker-build.yml`, line 68)

**CI Pipeline:**
- GitHub Actions
  - `docker-build.yml` - Build and push Docker images (push to main, tags, PRs)
  - `deploy.yml` - Manual Kubernetes deployment trigger
- Multi-platform builds: linux/amd64, linux/arm64
- Build caching via GitHub Actions cache

## Environment Configuration

**Development:**
- Required env vars: `DISCORD_TOKEN`
- Optional env vars: `CLIENT_ID`
- Secrets location: `.env` file (gitignored)
- Local database: `data/messages.db`

**Staging:**
- Not applicable (single environment)

**Production:**
- Secrets: Kubernetes secret `rxddit-discord-bot-secrets` (`k8s/deployment.yaml`, line 44)
- Database: Persistent volume claim `rxddit-discord-bot-data` (`k8s/pvc.yaml`)
- Resource limits: CPU 500m, Memory 256Mi

## Webhooks & Callbacks

**Incoming:**
- None (bot receives events via Discord Gateway, not webhooks)

**Outgoing:**
- None

---

*Integration audit: 2025-01-11*
*Update when adding/removing external services*
