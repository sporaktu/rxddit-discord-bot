import Database from 'better-sqlite3';
import path from 'path';

// Interface for stored message data
export interface StoredMessage {
    messageId: string;
    channelId: string;
    guildId: string;
    authorId: string;
    authorTag: string;
    originalContent: string;
    convertedContent: string;
    originalLinks: string;  // JSON array of original Reddit links
    convertedLinks: string; // JSON array of converted rxddit links
    botMessageId: string;
    createdAt: number;
    isReverted: boolean;
}

// Interface for reaction tracking
export interface StoredReaction {
    id?: number;
    messageId: string;
    odId: string;
    userTag: string;
    emoji: string;
    reactedAt: number;
    isRevertReaction: boolean;
}

// Database class for SQLite operations
export class MessageDatabase {
    private db: Database.Database;

    constructor(dbPath: string = path.join(process.cwd(), 'data', 'messages.db')) {
        // Ensure data directory exists
        const dir = path.dirname(dbPath);
        const fs = require('fs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.initialize();
    }

    // Initialize database tables
    private initialize(): void {
        // Create messages table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                message_id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                author_id TEXT NOT NULL,
                author_tag TEXT NOT NULL,
                original_content TEXT NOT NULL,
                converted_content TEXT NOT NULL,
                original_links TEXT NOT NULL,
                converted_links TEXT NOT NULL,
                bot_message_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                is_reverted INTEGER DEFAULT 0
            )
        `);

        // Create reactions table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_tag TEXT NOT NULL,
                emoji TEXT NOT NULL,
                reacted_at INTEGER NOT NULL,
                is_revert_reaction INTEGER DEFAULT 0,
                FOREIGN KEY (message_id) REFERENCES messages(message_id)
            )
        `);

        // Create indexes for faster lookups
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
            CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
            CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
            CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
        `);
    }

    // Store a converted message
    storeMessage(message: Omit<StoredMessage, 'isReverted'>): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO messages (
                message_id, channel_id, guild_id, author_id, author_tag,
                original_content, converted_content, original_links, converted_links,
                bot_message_id, created_at, is_reverted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        stmt.run(
            message.messageId,
            message.channelId,
            message.guildId,
            message.authorId,
            message.authorTag,
            message.originalContent,
            message.convertedContent,
            message.originalLinks,
            message.convertedLinks,
            message.botMessageId,
            message.createdAt
        );
    }

    // Get a stored message by ID
    getMessage(messageId: string): StoredMessage | null {
        const stmt = this.db.prepare(`
            SELECT
                message_id as messageId,
                channel_id as channelId,
                guild_id as guildId,
                author_id as authorId,
                author_tag as authorTag,
                original_content as originalContent,
                converted_content as convertedContent,
                original_links as originalLinks,
                converted_links as convertedLinks,
                bot_message_id as botMessageId,
                created_at as createdAt,
                is_reverted as isReverted
            FROM messages WHERE message_id = ?
        `);

        const result = stmt.get(messageId) as StoredMessage | undefined;
        if (result) {
            result.isReverted = Boolean(result.isReverted);
        }
        return result || null;
    }

    // Mark a message as reverted
    markAsReverted(messageId: string): boolean {
        const stmt = this.db.prepare(`
            UPDATE messages SET is_reverted = 1 WHERE message_id = ?
        `);
        const result = stmt.run(messageId);
        return result.changes > 0;
    }

    // Delete a message record
    deleteMessage(messageId: string): boolean {
        const stmt = this.db.prepare(`DELETE FROM messages WHERE message_id = ?`);
        const result = stmt.run(messageId);
        return result.changes > 0;
    }

    // Store a reaction
    storeReaction(reaction: Omit<StoredReaction, 'id'>): number {
        const stmt = this.db.prepare(`
            INSERT INTO reactions (
                message_id, user_id, user_tag, emoji, reacted_at, is_revert_reaction
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            reaction.messageId,
            reaction.odId,
            reaction.userTag,
            reaction.emoji,
            reaction.reactedAt,
            reaction.isRevertReaction ? 1 : 0
        );

        return result.lastInsertRowid as number;
    }

    // Get all reactions for a message
    getReactions(messageId: string): StoredReaction[] {
        const stmt = this.db.prepare(`
            SELECT
                id,
                message_id as messageId,
                user_id as odId,
                user_tag as userTag,
                emoji,
                reacted_at as reactedAt,
                is_revert_reaction as isRevertReaction
            FROM reactions WHERE message_id = ?
            ORDER BY reacted_at ASC
        `);

        const results = stmt.all(messageId) as StoredReaction[];
        return results.map(r => ({
            ...r,
            isRevertReaction: Boolean(r.isRevertReaction)
        }));
    }

    // Get messages by author
    getMessagesByAuthor(authorId: string, limit: number = 50): StoredMessage[] {
        const stmt = this.db.prepare(`
            SELECT
                message_id as messageId,
                channel_id as channelId,
                guild_id as guildId,
                author_id as authorId,
                author_tag as authorTag,
                original_content as originalContent,
                converted_content as convertedContent,
                original_links as originalLinks,
                converted_links as convertedLinks,
                bot_message_id as botMessageId,
                created_at as createdAt,
                is_reverted as isReverted
            FROM messages
            WHERE author_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `);

        const results = stmt.all(authorId, limit) as StoredMessage[];
        return results.map(r => ({
            ...r,
            isReverted: Boolean(r.isReverted)
        }));
    }

    // Get messages by channel
    getMessagesByChannel(channelId: string, limit: number = 50): StoredMessage[] {
        const stmt = this.db.prepare(`
            SELECT
                message_id as messageId,
                channel_id as channelId,
                guild_id as guildId,
                author_id as authorId,
                author_tag as authorTag,
                original_content as originalContent,
                converted_content as convertedContent,
                original_links as originalLinks,
                converted_links as convertedLinks,
                bot_message_id as botMessageId,
                created_at as createdAt,
                is_reverted as isReverted
            FROM messages
            WHERE channel_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `);

        const results = stmt.all(channelId, limit) as StoredMessage[];
        return results.map(r => ({
            ...r,
            isReverted: Boolean(r.isReverted)
        }));
    }

    // Clean up old messages (older than specified days)
    cleanupOldMessages(daysOld: number = 30): number {
        const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

        // First delete related reactions
        const deleteReactions = this.db.prepare(`
            DELETE FROM reactions WHERE message_id IN (
                SELECT message_id FROM messages WHERE created_at < ?
            )
        `);
        deleteReactions.run(cutoffTime);

        // Then delete messages
        const deleteMessages = this.db.prepare(`
            DELETE FROM messages WHERE created_at < ?
        `);
        const result = deleteMessages.run(cutoffTime);

        return result.changes;
    }

    // Get statistics
    getStats(): { totalMessages: number; totalReactions: number; revertedCount: number } {
        const msgStmt = this.db.prepare(`SELECT COUNT(*) as count FROM messages`);
        const reactStmt = this.db.prepare(`SELECT COUNT(*) as count FROM reactions`);
        const revertedStmt = this.db.prepare(`SELECT COUNT(*) as count FROM messages WHERE is_reverted = 1`);

        return {
            totalMessages: (msgStmt.get() as { count: number }).count,
            totalReactions: (reactStmt.get() as { count: number }).count,
            revertedCount: (revertedStmt.get() as { count: number }).count
        };
    }

    // Check if message exists
    hasMessage(messageId: string): boolean {
        const stmt = this.db.prepare(`SELECT 1 FROM messages WHERE message_id = ?`);
        return stmt.get(messageId) !== undefined;
    }

    // Close database connection
    close(): void {
        this.db.close();
    }

    // Get the raw database instance (for testing)
    getDatabase(): Database.Database {
        return this.db;
    }
}

// Export a singleton instance for the bot
let dbInstance: MessageDatabase | null = null;

export function getDatabase(dbPath?: string): MessageDatabase {
    if (!dbInstance) {
        dbInstance = new MessageDatabase(dbPath);
    }
    return dbInstance;
}

export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

// For testing - create a new instance without affecting singleton
export function createTestDatabase(dbPath: string): MessageDatabase {
    return new MessageDatabase(dbPath);
}
