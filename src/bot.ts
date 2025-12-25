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
import { getDatabase, closeDatabase, MessageDatabase } from './database';
import { detectRedditLinks, convertToRxddit, convertMessageLinks, ROBOT_EMOJI } from './linkUtils';

// Load environment variables
config();

// Initialize Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// Initialize database
let db: MessageDatabase;

// Event: Bot is ready
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`rxddit Discord Bot is now running!`);
    console.log(`Monitoring for Reddit links...`);

    // Initialize database
    db = getDatabase();
    console.log(`Database initialized`);

    // Schedule cleanup of old messages (run daily)
    setInterval(() => {
        const deleted = db.cleanupOldMessages(30);
        if (deleted > 0) {
            console.log(`Cleaned up ${deleted} old message(s) from database`);
        }
    }, 24 * 60 * 60 * 1000);
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

            // Check if bot has permission to send messages
            const botMember = message.guild.members.cache.get(client.user!.id);
            if (!botMember || !message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)) {
                console.log(`No permission to send messages in this channel`);
                return;
            }

            // Send the converted message
            const botMessage = await message.channel.send(
                `*${message.author} posted:*\n${convertedContent}`
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

            // React to the original message with robot emoji
            if (message.channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.AddReactions)) {
                await message.react(ROBOT_EMOJI);
                console.log(`Converted and reacted to message from ${message.author.tag}`);
            } else {
                console.log(`No permission to add reactions`);
            }

        } catch (error) {
            console.error(`Error processing message:`, error);
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
            console.error(`Error fetching reaction:`, error);
            return;
        }
    }

    // Check if the reaction is the robot emoji
    if (reaction.emoji.name !== ROBOT_EMOJI) return;

    const messageId = reaction.message.id;
    const storedMessage = db.getMessage(messageId);

    // Check if we have stored info for this message
    if (!storedMessage) return;

    // Check if message is already reverted
    if (storedMessage.isReverted) {
        console.log(`Message ${messageId} is already reverted`);
        return;
    }

    // Store the reaction in database
    db.storeReaction({
        messageId: messageId,
        odId: user.id,
        userTag: user.tag || 'Unknown',
        emoji: ROBOT_EMOJI,
        reactedAt: Date.now(),
        isRevertReaction: user.id === storedMessage.authorId
    });

    // Check if the user who reacted is the original message author
    if (user.id !== storedMessage.authorId) {
        console.log(`User ${user.tag} is not the original author, ignoring reaction`);
        return;
    }

    console.log(`Original author ${user.tag} reacted to revert the message`);

    try {
        // Get the bot's message and delete it
        const channel = await client.channels.fetch(storedMessage.channelId);
        if (channel?.isTextBased()) {
            try {
                const botMessage = await channel.messages.fetch(storedMessage.botMessageId);
                if (botMessage) {
                    await botMessage.delete();
                    console.log(`Deleted converted message`);
                }
            } catch (fetchError) {
                console.log(`Bot message already deleted or not found`);
            }
        }

        // Remove the bot's reaction from the original message
        await reaction.users.remove(client.user!);
        console.log(`Removed bot reaction from original message`);

        // Mark message as reverted in database
        db.markAsReverted(messageId);
        console.log(`Marked message as reverted in database`);

    } catch (error) {
        console.error(`Error reverting message:`, error);
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
