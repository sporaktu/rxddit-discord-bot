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
    PartialUser,
    Partials,
    Embed
} from 'discord.js';
import { getDatabase, closeDatabase, MessageDatabase } from './database';
import { detectRedditLinks, convertToRxddit, convertMessageLinks, ROBOT_EMOJI } from './linkUtils';

// Load environment variables
config();

// Initialize Discord client with necessary intents and partials
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.User,
    ],
});

// Initialize database
let db: MessageDatabase;

// Cleanup interval in milliseconds (24 hours)
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
// Message retention in days
const MESSAGE_RETENTION_DAYS = 30;

/**
 * Run database cleanup to remove old messages
 */
function runCleanup(): void {
    const deleted = db.cleanupOldMessages(MESSAGE_RETENTION_DAYS);
    if (deleted > 0) {
        console.log(`Cleaned up ${deleted} old message(s) from database`);
    }
}

// Time to wait for embeds to load (in milliseconds)
const EMBED_WAIT_MS = 5000;

/**
 * Check if embeds contain video or gallery content
 * @param embeds - Array of Discord embeds to check
 * @returns true if any embed contains video or gallery content
 */
function hasVideoOrGallery(embeds: Embed[]): boolean {
    return embeds.some(embed => {
        // Check for video content
        if (embed.video) {
            return true;
        }

        // Check embed type for video
        if (embed.data.type === 'video') {
            return true;
        }

        // Check for gallery/rich content from Reddit (galleries are typically 'rich' type)
        // rxddit embeds galleries as rich content with multiple items
        if (embed.data.type === 'rich' && embed.provider?.name?.toLowerCase().includes('rxddit')) {
            return true;
        }

        return false;
    });
}

// Event: Bot is ready
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`rxddit Discord Bot is now running!`);
    console.log(`Monitoring for Reddit links...`);

    // Initialize database
    db = getDatabase();
    console.log(`Database initialized`);

    // Run cleanup immediately on startup (in case bot was offline)
    runCleanup();

    // Schedule cleanup of old messages (run daily)
    setInterval(runCleanup, CLEANUP_INTERVAL_MS);
});

// Event: New message created
client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore bot messages and messages without content
    if (message.author.bot || !message.content) return;

    // Check if message contains Reddit links
    const redditLinks = detectRedditLinks(message.content);

    if (redditLinks.length > 0) {
        console.log(`Found ${redditLinks.length} Reddit link(s) in message from ${message.author.tag}`);

        try {
            // Convert Reddit links to rxddit links
            const convertedContent = convertMessageLinks(message.content);
            const convertedLinks = redditLinks.map(link => convertToRxddit(link));

            // Check if message is from a guild (not DM)
            if (!message.guild) {
                console.log(`Ignoring DM message`);
                return;
            }

            // Check if channel is text-based and supports permissions
            if (!message.channel.isTextBased() || message.channel.isDMBased()) {
                console.log(`Channel type not supported`);
                return;
            }

            // Check if client user is available (should always be after login)
            const botUser = client.user;
            if (!botUser) {
                console.log(`Bot user not available`);
                return;
            }

            // Check if bot has permission to send messages
            const botMember = message.guild.members.cache.get(botUser.id);
            if (!botMember || !message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)) {
                console.log(`No permission to send messages in this channel`);
                return;
            }

            // Send only the converted rxddit links (not full message content)
            const botMessage = await message.channel.send(
                convertedLinks.join('\n')
            );

            // Store message info in database
            db.storeMessage({
                messageId: message.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                authorId: message.author.id,
                authorTag: message.author.tag,
                originalContent: message.content,
                convertedContent: convertedContent,
                originalLinks: JSON.stringify(redditLinks),
                convertedLinks: JSON.stringify(convertedLinks),
                botMessageId: botMessage.id,
                createdAt: Date.now()
            });

            // Suppress embeds on the original message if bot has permission
            if (message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.ManageMessages)) {
                await message.suppressEmbeds(true);
                console.log(`Suppressed embeds and posted converted links from ${message.author.tag}`);
            } else {
                console.log(`No permission to manage messages - cannot suppress embeds`);
            }

            // React on the bot's message to enable revert functionality.
            // User can react with robot emoji to delete the bot's message and unsuppress original embeds.
            if (message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.AddReactions)) {
                await botMessage.react(ROBOT_EMOJI);
            }

            // Wait for embeds to load, then check if content is video/gallery
            // If not, auto-revert to show original Reddit embeds
            await new Promise(resolve => setTimeout(resolve, EMBED_WAIT_MS));

            try {
                // Fetch the bot message to get updated embeds
                const updatedBotMessage = await message.channel.messages.fetch(botMessage.id);
                const embeds = updatedBotMessage.embeds;

                console.log(`Checking embeds for message ${botMessage.id}: found ${embeds.length} embed(s)`);

                // If no video or gallery content, auto-revert
                if (!hasVideoOrGallery(embeds)) {
                    console.log(`No video/gallery content detected, auto-reverting for ${message.author.tag}`);

                    // Mark as reverted in database (atomic operation)
                    const didRevert = db.markAsReverted(message.id);
                    if (didRevert) {
                        // Delete the bot's message
                        try {
                            await updatedBotMessage.delete();
                            console.log(`Deleted bot message (auto-revert)`);
                        } catch (deleteError) {
                            console.log(`Could not delete bot message during auto-revert`);
                        }

                        // Unsuppress embeds on original message
                        if (message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.ManageMessages)) {
                            try {
                                await message.suppressEmbeds(false);
                                console.log(`Unsuppressed original embeds (auto-revert)`);
                            } catch (unsuppressError) {
                                console.log(`Could not unsuppress original embeds during auto-revert`);
                            }
                        }

                        console.log(`Auto-revert completed for message ${message.id}`);
                    }
                } else {
                    console.log(`Video/gallery content detected, keeping rxddit embed for ${message.author.tag}`);
                }
            } catch (embedCheckError) {
                // If we can't check embeds, keep the rxddit version (safer for video content)
                console.log(`Could not check embeds for message ${botMessage.id}, keeping rxddit version`);
            }

        } catch (error) {
            console.error(`Error processing message ${message.id} from ${message.author.tag} in channel ${message.channel.id}:`, error);
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
            console.error(`Error fetching reaction on message ${reaction.message.id} from user ${user.id}:`, error);
            return;
        }
    }

    // Check if the reaction is the robot emoji
    if (reaction.emoji.name !== ROBOT_EMOJI) return;

    // Reaction is on the bot's message, look up by bot message ID
    const botMessageId = reaction.message.id;
    const storedMessage = db.getMessageByBotMessageId(botMessageId);

    // Check if we have stored info for this bot message
    if (!storedMessage) return;

    // Store the reaction in database (before checking if it's a revert)
    const isAuthorReaction = user.id === storedMessage.authorId;
    db.storeReaction({
        messageId: storedMessage.messageId,
        userId: user.id,
        userTag: user.tag || 'Unknown',
        emoji: ROBOT_EMOJI,
        reactedAt: Date.now(),
        isRevertReaction: isAuthorReaction
    });

    // Check if the user who reacted is the original message author
    if (!isAuthorReaction) {
        console.log(`User ${user.tag} is not the original author, ignoring reaction`);
        return;
    }

    // Atomically try to mark as reverted - prevents race conditions
    // Only the first caller will succeed; subsequent calls return false
    const didRevert = db.markAsReverted(storedMessage.messageId);
    if (!didRevert) {
        console.log(`Message ${storedMessage.messageId} is already reverted`);
        return;
    }

    console.log(`Original author ${user.tag} reacted to revert the message`);

    try {
        // Delete the bot's message (the one being reacted to)
        try {
            await reaction.message.delete();
            console.log(`Deleted bot message`);
        } catch (deleteError) {
            console.log(`Bot message already deleted or not found`);
        }

        // Unsuppress embeds on the original message
        const channel = await client.channels.fetch(storedMessage.channelId);
        if (channel?.isTextBased()) {
            try {
                const originalMessage = await channel.messages.fetch(storedMessage.messageId);
                if (originalMessage) {
                    await originalMessage.suppressEmbeds(false);
                    console.log(`Unsuppressed embeds on original message`);
                }
            } catch (fetchError) {
                console.log(`Could not unsuppress embeds on original message - may have been deleted or bot lacks permissions`);
            }
        }

        console.log(`Message revert completed`);

    } catch (error) {
        console.error(`Error reverting message ${storedMessage.messageId} (bot message ${storedMessage.botMessageId}) for user ${user.tag}:`, error);
    }
});

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error(`DISCORD_TOKEN not found in environment variables!`);
    console.error(`Please create a .env file with your bot token`);
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch((error: Error) => {
    console.error(`Failed to login:`, error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`\nShutting down bot...`);
    closeDatabase();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(`\nShutting down bot...`);
    closeDatabase();
    client.destroy();
    process.exit(0);
});

// Export for testing
export { client };
