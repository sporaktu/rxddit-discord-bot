import { config } from 'dotenv';
import {
    Client,
    GatewayIntentBits,
    Events,
    PermissionsBitField,
    Message,
    MessageReaction,
    User,
    PartialMessageReaction,
    PartialUser
} from 'discord.js';

// Load environment variables
config();

// Interface for stored message data
interface StoredMessage {
    originalContent: string;
    authorId: string;
    botMessageId: string;
    channelId: string;
}

// Initialize Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// Store original messages for potential reversion
// Map structure: messageId -> StoredMessage
const messageStore = new Map<string, StoredMessage>();

// Robot emoji for reactions
const ROBOT_EMOJI = '🤖';

// Reddit URL regex patterns
const REDDIT_PATTERNS: RegExp[] = [
    /https?:\/\/(www\.)?reddit\.com\/r\/[^\s]+/gi,
    /https?:\/\/(old|new)\.reddit\.com\/r\/[^\s]+/gi,
];

/**
 * Detects Reddit links in a message
 * @param content - Message content
 * @returns Array of Reddit URLs found
 */
function detectRedditLinks(content: string): string[] {
    const links: string[] = [];
    REDDIT_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            links.push(...matches);
        }
    });
    return links;
}

/**
 * Converts Reddit URLs to rxddit URLs
 * @param url - Original Reddit URL
 * @returns Converted rxddit URL
 */
function convertToRxddit(url: string): string {
    return url
        .replace(/https?:\/\/(www\.)?reddit\.com/gi, 'https://rxddit.com')
        .replace(/https?:\/\/(old|new)\.reddit\.com/gi, 'https://rxddit.com');
}

/**
 * Converts all Reddit links in a message to rxddit links
 * @param content - Original message content
 * @returns Content with converted links
 */
function convertMessageLinks(content: string): string {
    let convertedContent = content;
    REDDIT_PATTERNS.forEach(pattern => {
        convertedContent = convertedContent.replace(pattern, (match) => convertToRxddit(match));
    });
    return convertedContent;
}

// Event: Bot is ready
client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    console.log(`🤖 rxddit Discord Bot is now running!`);
    console.log(`📝 Monitoring for Reddit links...`);
});

// Event: New message created
client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore bot messages and messages without content
    if (message.author.bot || !message.content) return;

    // Check if message contains Reddit links
    const redditLinks = detectRedditLinks(message.content);

    if (redditLinks.length > 0) {
        console.log(`🔍 Found ${redditLinks.length} Reddit link(s) in message from ${message.author.tag}`);

        try {
            // Convert Reddit links to rxddit links
            const convertedContent = convertMessageLinks(message.content);

            // Check if bot has permission to send messages
            const botMember = message.guild?.members.cache.get(client.user!.id);
            if (!botMember || !message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)) {
                console.log('❌ No permission to send messages in this channel');
                return;
            }

            // Send the converted message
            const botMessage = await message.channel.send(
                `*${message.author} posted:*\n${convertedContent}`
            );

            // Store original message info for potential reversion
            messageStore.set(message.id, {
                originalContent: message.content,
                authorId: message.author.id,
                botMessageId: botMessage.id,
                channelId: message.channel.id,
            });

            // React to the original message with robot emoji
            if (message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.AddReactions)) {
                await message.react(ROBOT_EMOJI);
                console.log(`✅ Converted and reacted to message from ${message.author.tag}`);
            } else {
                console.log('⚠️ No permission to add reactions');
            }

            // Clean up stored messages after 24 hours
            setTimeout(() => {
                messageStore.delete(message.id);
            }, 24 * 60 * 60 * 1000);

        } catch (error) {
            console.error('❌ Error processing message:', error);
        }
    }
});

// Event: Reaction added to a message
client.on(Events.MessageReactionAdd, async (
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
) => {
    // Ignore bot reactions
    if (user.bot) return;

    // Fetch partial reactions
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('❌ Error fetching reaction:', error);
            return;
        }
    }

    // Check if the reaction is the robot emoji
    if (reaction.emoji.name !== ROBOT_EMOJI) return;

    const messageId = reaction.message.id;
    const storedMessage = messageStore.get(messageId);

    // Check if we have stored info for this message
    if (!storedMessage) return;

    // Check if the user who reacted is the original message author
    if (user.id !== storedMessage.authorId) {
        console.log(`⚠️ User ${user.tag} is not the original author, ignoring reaction`);
        return;
    }

    console.log(`🔄 Original author ${user.tag} reacted to revert the message`);

    try {
        // Get the bot's message and delete it
        const channel = await client.channels.fetch(storedMessage.channelId);
        if (channel?.isTextBased()) {
            const botMessage = await channel.messages.fetch(storedMessage.botMessageId);
            if (botMessage) {
                await botMessage.delete();
                console.log('✅ Deleted converted message');
            }
        }

        // Remove the bot's reaction from the original message
        await reaction.users.remove(client.user!);
        console.log('✅ Removed bot reaction from original message');

        // Clean up stored message
        messageStore.delete(messageId);

    } catch (error) {
        console.error('❌ Error reverting message:', error);
    }
});

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN not found in environment variables!');
    console.error('💡 Please create a .env file with your bot token');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch((error: Error) => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down bot...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down bot...');
    client.destroy();
    process.exit(0);
});
