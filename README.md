# rxddit Discord Bot

A Discord bot that automatically converts Reddit links to rxddit links for better embed support. The bot monitors messages in your Discord server and converts any Reddit URLs to use [rxddit](https://github.com/MinnDevelopment/fxreddit) (similar to fxreddit), which provides enhanced embeds for Reddit content.

## Features

- **Automatic Link Conversion**: Detects Reddit links in messages and automatically converts them to rxddit.com
- **Robot Emoji Reaction**: Adds a 🤖 emoji reaction to processed messages
- **Revert Functionality**: Original message author can react with 🤖 to restore the original Reddit link
- **TypeScript**: Built with TypeScript for type safety and better development experience
- **Dockerized**: Easy deployment with Docker and Docker Compose
- **Lightweight**: Minimal resource usage with efficient message handling

## How It Works

1. User posts a message containing a Reddit link (e.g., `https://reddit.com/r/example/comments/...`)
2. Bot detects the Reddit link and posts a new message with the converted link (`https://rxddit.com/r/example/comments/...`)
3. Bot reacts to the original message with 🤖 emoji
4. If the original poster reacts with 🤖, the bot deletes the converted message and removes its reaction

## Prerequisites

- Node.js 20+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- A Discord Bot Token

## Getting Your Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section in the left sidebar
4. Click "Add Bot"
5. Under the bot's username, click "Reset Token" and copy your token
6. **Important**: Enable the following Privileged Gateway Intents:
   - Message Content Intent
   - Server Members Intent (optional, but recommended)

## Bot Permissions

Your bot needs the following permissions:
- **Read Messages/View Channels**: To see messages in channels
- **Send Messages**: To post converted links
- **Add Reactions**: To add the robot emoji
- **Read Message History**: To fetch messages for reactions

**Invite Link Template**:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877959168&scope=bot
```
Replace `YOUR_CLIENT_ID` with your bot's client ID from the Developer Portal.

## Installation & Setup

### Option 1: Docker (Recommended)

1. Clone this repository:
```bash
git clone <repository-url>
cd rxddit-discord-bot
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Edit `.env` and add your Discord bot token:
```env
DISCORD_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_client_id_here
```

4. Build and run with Docker Compose:
```bash
docker-compose up -d
```

5. View logs:
```bash
docker-compose logs -f bot
```

6. Stop the bot:
```bash
docker-compose down
```

### Option 2: Kubernetes

For production deployments to Kubernetes, see the [homelab-kubernetes repository](https://github.com/sporaktu/homelab-kubernetes) for manifests and deployment instructions.

**Quick deployment steps:**

1. Ensure the image is built and pushed to the container registry (GitHub Actions handles this automatically on push to main)

2. Create a Kubernetes secret with your Discord token:
```bash
kubectl create secret generic rxddit-discord-bot-secrets \
  --from-literal=DISCORD_TOKEN='your-token-here' \
  --from-literal=CLIENT_ID='your-client-id' \
  -n ai-bots
```

3. Apply the Kubernetes manifests from the homelab-kubernetes repository:
```bash
kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/pvc.yaml
kubectl apply -f namespaces/ai-bots/rxddit-discord-bot/deployment.yaml
```

4. Verify the deployment:
```bash
kubectl get pods -n ai-bots -l app=rxddit-discord-bot
kubectl logs -n ai-bots -l app=rxddit-discord-bot -f
```

**Using the deployment scripts:**

```bash
# Deploy a specific tag
TAG=sha-abc123 ./scripts/deploy-to-k8s.sh

# Rollback to previous version
./scripts/rollback.sh

# Rollback to specific revision
./scripts/rollback.sh 3
```

**Automated Deployment:**

The bot is automatically deployed to Kubernetes when code is pushed to the `main` branch. The deployment uses the SHA-tagged image to ensure reproducibility.

### Option 3: Local Development

1. Clone this repository:
```bash
git clone <repository-url>
cd rxddit-discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Discord bot token:
```env
DISCORD_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_client_id_here
```

5. Build the TypeScript code:
```bash
npm run build
```

6. Run the bot:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Project Structure

```
rxddit-discord-bot/
├── src/
│   └── bot.ts              # Main bot source code (TypeScript)
├── dist/                   # Compiled JavaScript (generated)
├── .env                    # Environment variables (create this)
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore file
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript configuration
├── Dockerfile              # Docker build instructions
├── docker-compose.yml      # Docker Compose configuration
└── README.md               # This file
```

## Configuration

All configuration is done through environment variables in the `.env` file:

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes |
| `CLIENT_ID` | Your Discord application client ID | No |
| `NODE_ENV` | Environment (production/development) | No |

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled bot
- `npm run dev` - Run the bot in development mode with ts-node
- `npm run watch` - Watch for TypeScript changes and recompile

## Supported Reddit URL Formats

The bot detects and converts the following Reddit URL formats:
- `https://reddit.com/r/...`
- `https://www.reddit.com/r/...`
- `https://old.reddit.com/r/...`
- `https://new.reddit.com/r/...`

All are converted to `https://rxddit.com/r/...`

## Troubleshooting

### Bot doesn't respond to messages
- Ensure the "Message Content Intent" is enabled in the Discord Developer Portal
- Verify the bot has permissions to read and send messages in the channel
- Check the bot's logs for errors

### Bot can't add reactions
- Verify the bot has "Add Reactions" permission in the channel
- Check if the channel has external emoji restrictions

### TypeScript compilation errors
- Make sure you've run `npm install` to install all dependencies
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

### Docker container won't start
- Verify your `.env` file exists and contains a valid `DISCORD_TOKEN`
- Check Docker logs: `docker-compose logs bot`
- Ensure ports aren't already in use

## License

MIT License - Feel free to use and modify as needed.

## Credits

- Built with [Discord.js](https://discord.js.org/)
- Uses [rxddit](https://github.com/MinnDevelopment/fxreddit) for enhanced Reddit embeds
- Inspired by the need for better Reddit link sharing in Discord

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
