import { createTestDatabase, MessageDatabase, StoredMessage } from '../src/database';
import { getTestDbPath } from './setup';
import fs from 'fs';
import path from 'path';

describe('MessageDatabase', () => {
    let db: MessageDatabase;
    let testDbPath: string;

    beforeEach(() => {
        testDbPath = getTestDbPath('database');
        db = createTestDatabase(testDbPath);
    });

    afterEach(() => {
        db.close();
        // Clean up test database file
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('initialization', () => {
        it('should create database file', () => {
            expect(fs.existsSync(testDbPath)).toBe(true);
        });

        it('should create messages table', () => {
            const tables = db.getDatabase().prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
            ).get();
            expect(tables).toBeDefined();
        });

        it('should create reactions table', () => {
            const tables = db.getDatabase().prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='reactions'"
            ).get();
            expect(tables).toBeDefined();
        });

        it('should create indexes', () => {
            const indexes = db.getDatabase().prepare(
                "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
            ).all();
            expect(indexes.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('storeMessage', () => {
        const sampleMessage: Omit<StoredMessage, 'isReverted'> = {
            messageId: 'msg123',
            channelId: 'channel456',
            guildId: 'guild789',
            authorId: 'user001',
            authorTag: 'TestUser#1234',
            originalContent: 'Check out https://reddit.com/r/test',
            convertedContent: 'Check out https://rxddit.com/r/test',
            originalLinks: JSON.stringify(['https://reddit.com/r/test']),
            convertedLinks: JSON.stringify(['https://rxddit.com/r/test']),
            botMessageId: 'botmsg999',
            createdAt: Date.now()
        };

        it('should store a message successfully', () => {
            db.storeMessage(sampleMessage);
            const retrieved = db.getMessage('msg123');
            expect(retrieved).not.toBeNull();
            expect(retrieved?.messageId).toBe('msg123');
        });

        it('should store all message fields correctly', () => {
            db.storeMessage(sampleMessage);
            const retrieved = db.getMessage('msg123');

            expect(retrieved?.channelId).toBe(sampleMessage.channelId);
            expect(retrieved?.guildId).toBe(sampleMessage.guildId);
            expect(retrieved?.authorId).toBe(sampleMessage.authorId);
            expect(retrieved?.authorTag).toBe(sampleMessage.authorTag);
            expect(retrieved?.originalContent).toBe(sampleMessage.originalContent);
            expect(retrieved?.convertedContent).toBe(sampleMessage.convertedContent);
            expect(retrieved?.originalLinks).toBe(sampleMessage.originalLinks);
            expect(retrieved?.convertedLinks).toBe(sampleMessage.convertedLinks);
            expect(retrieved?.botMessageId).toBe(sampleMessage.botMessageId);
            expect(retrieved?.isReverted).toBe(false);
        });

        it('should replace existing message with same ID', () => {
            db.storeMessage(sampleMessage);

            const updatedMessage = {
                ...sampleMessage,
                authorTag: 'UpdatedUser#5678'
            };
            db.storeMessage(updatedMessage);

            const retrieved = db.getMessage('msg123');
            expect(retrieved?.authorTag).toBe('UpdatedUser#5678');
        });

        it('should handle multiple messages', () => {
            db.storeMessage(sampleMessage);
            db.storeMessage({ ...sampleMessage, messageId: 'msg124' });
            db.storeMessage({ ...sampleMessage, messageId: 'msg125' });

            expect(db.hasMessage('msg123')).toBe(true);
            expect(db.hasMessage('msg124')).toBe(true);
            expect(db.hasMessage('msg125')).toBe(true);
        });

        it('should handle special characters in content', () => {
            const specialMessage = {
                ...sampleMessage,
                messageId: 'special123',
                originalContent: "Test with 'quotes' and \"double quotes\" and emojis 🤖💀",
                convertedContent: "Test with 'quotes' and \"double quotes\" and emojis 🤖💀"
            };
            db.storeMessage(specialMessage);

            const retrieved = db.getMessage('special123');
            expect(retrieved?.originalContent).toBe(specialMessage.originalContent);
        });
    });

    describe('getMessage', () => {
        it('should return null for non-existent message', () => {
            const result = db.getMessage('nonexistent');
            expect(result).toBeNull();
        });

        it('should return stored message with correct types', () => {
            db.storeMessage({
                messageId: 'typetest',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: 1234567890
            });

            const retrieved = db.getMessage('typetest');
            expect(typeof retrieved?.isReverted).toBe('boolean');
            expect(typeof retrieved?.createdAt).toBe('number');
        });
    });

    describe('hasMessage', () => {
        it('should return false for non-existent message', () => {
            expect(db.hasMessage('nonexistent')).toBe(false);
        });

        it('should return true for existing message', () => {
            db.storeMessage({
                messageId: 'exists',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            expect(db.hasMessage('exists')).toBe(true);
        });
    });

    describe('markAsReverted', () => {
        beforeEach(() => {
            db.storeMessage({
                messageId: 'reverttest',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });
        });

        it('should mark message as reverted', () => {
            const result = db.markAsReverted('reverttest');
            expect(result).toBe(true);

            const message = db.getMessage('reverttest');
            expect(message?.isReverted).toBe(true);
        });

        it('should return false for non-existent message', () => {
            const result = db.markAsReverted('nonexistent');
            expect(result).toBe(false);
        });

        it('should not affect other messages', () => {
            db.storeMessage({
                messageId: 'other',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            db.markAsReverted('reverttest');

            const other = db.getMessage('other');
            expect(other?.isReverted).toBe(false);
        });
    });

    describe('deleteMessage', () => {
        beforeEach(() => {
            db.storeMessage({
                messageId: 'deletetest',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });
        });

        it('should delete existing message', () => {
            const result = db.deleteMessage('deletetest');
            expect(result).toBe(true);
            expect(db.hasMessage('deletetest')).toBe(false);
        });

        it('should return false for non-existent message', () => {
            const result = db.deleteMessage('nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('storeReaction', () => {
        beforeEach(() => {
            db.storeMessage({
                messageId: 'reactmsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });
        });

        it('should store a reaction', () => {
            const id = db.storeReaction({
                messageId: 'reactmsg',
                userId: 'user1',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: false
            });

            expect(id).toBeGreaterThan(0);
        });

        it('should store multiple reactions', () => {
            db.storeReaction({
                messageId: 'reactmsg',
                userId: 'user1',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: false
            });

            db.storeReaction({
                messageId: 'reactmsg',
                userId: 'user2',
                userTag: 'User#0002',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: true
            });

            const reactions = db.getReactions('reactmsg');
            expect(reactions.length).toBe(2);
        });

        it('should mark revert reactions correctly', () => {
            db.storeReaction({
                messageId: 'reactmsg',
                userId: 'author',
                userTag: 'Author#0001',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: true
            });

            const reactions = db.getReactions('reactmsg');
            expect(reactions[0].isRevertReaction).toBe(true);
        });
    });

    describe('getReactions', () => {
        it('should return empty array for message without reactions', () => {
            db.storeMessage({
                messageId: 'noreacts',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            const reactions = db.getReactions('noreacts');
            expect(reactions).toEqual([]);
        });

        it('should return reactions in chronological order', () => {
            db.storeMessage({
                messageId: 'ordermsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            const time1 = Date.now();
            const time2 = time1 + 1000;
            const time3 = time2 + 1000;

            db.storeReaction({
                messageId: 'ordermsg',
                userId: 'user3',
                userTag: 'User#0003',
                emoji: '🤖',
                reactedAt: time3,
                isRevertReaction: false
            });

            db.storeReaction({
                messageId: 'ordermsg',
                userId: 'user1',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: time1,
                isRevertReaction: false
            });

            db.storeReaction({
                messageId: 'ordermsg',
                userId: 'user2',
                userTag: 'User#0002',
                emoji: '🤖',
                reactedAt: time2,
                isRevertReaction: false
            });

            const reactions = db.getReactions('ordermsg');
            expect(reactions[0].userId).toBe('user1');
            expect(reactions[1].userId).toBe('user2');
            expect(reactions[2].userId).toBe('user3');
        });
    });

    describe('getMessagesByAuthor', () => {
        beforeEach(() => {
            for (let i = 1; i <= 5; i++) {
                db.storeMessage({
                    messageId: `authormsg${i}`,
                    channelId: 'channel',
                    guildId: 'guild',
                    authorId: 'targetauthor',
                    authorTag: 'TargetAuthor#0001',
                    originalContent: `content ${i}`,
                    convertedContent: `converted ${i}`,
                    originalLinks: '[]',
                    convertedLinks: '[]',
                    botMessageId: `bot${i}`,
                    createdAt: Date.now() + i * 1000
                });
            }

            // Add message from different author
            db.storeMessage({
                messageId: 'otherauthormsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'otherauthor',
                authorTag: 'OtherAuthor#0002',
                originalContent: 'other content',
                convertedContent: 'other converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'botother',
                createdAt: Date.now()
            });
        });

        it('should return messages by specific author', () => {
            const messages = db.getMessagesByAuthor('targetauthor');
            expect(messages.length).toBe(5);
            messages.forEach(msg => {
                expect(msg.authorId).toBe('targetauthor');
            });
        });

        it('should respect limit parameter', () => {
            const messages = db.getMessagesByAuthor('targetauthor', 3);
            expect(messages.length).toBe(3);
        });

        it('should return messages in descending order by creation time', () => {
            const messages = db.getMessagesByAuthor('targetauthor');
            for (let i = 0; i < messages.length - 1; i++) {
                expect(messages[i].createdAt).toBeGreaterThanOrEqual(messages[i + 1].createdAt);
            }
        });

        it('should return empty array for non-existent author', () => {
            const messages = db.getMessagesByAuthor('nonexistent');
            expect(messages).toEqual([]);
        });
    });

    describe('getMessagesByChannel', () => {
        beforeEach(() => {
            for (let i = 1; i <= 5; i++) {
                db.storeMessage({
                    messageId: `channelmsg${i}`,
                    channelId: 'targetchannel',
                    guildId: 'guild',
                    authorId: `author${i}`,
                    authorTag: `Author${i}#0001`,
                    originalContent: `content ${i}`,
                    convertedContent: `converted ${i}`,
                    originalLinks: '[]',
                    convertedLinks: '[]',
                    botMessageId: `bot${i}`,
                    createdAt: Date.now() + i * 1000
                });
            }

            db.storeMessage({
                messageId: 'otherchanmsg',
                channelId: 'otherchannel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'other content',
                convertedContent: 'other converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'botother',
                createdAt: Date.now()
            });
        });

        it('should return messages from specific channel', () => {
            const messages = db.getMessagesByChannel('targetchannel');
            expect(messages.length).toBe(5);
            messages.forEach(msg => {
                expect(msg.channelId).toBe('targetchannel');
            });
        });

        it('should respect limit parameter', () => {
            const messages = db.getMessagesByChannel('targetchannel', 2);
            expect(messages.length).toBe(2);
        });
    });

    describe('cleanupOldMessages', () => {
        it('should delete messages older than specified days', () => {
            const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
            const newTime = Date.now();

            db.storeMessage({
                messageId: 'oldmsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'old content',
                convertedContent: 'old converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: oldTime
            });

            db.storeMessage({
                messageId: 'newmsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'new content',
                convertedContent: 'new converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot2',
                createdAt: newTime
            });

            const deleted = db.cleanupOldMessages(30);
            expect(deleted).toBe(1);
            expect(db.hasMessage('oldmsg')).toBe(false);
            expect(db.hasMessage('newmsg')).toBe(true);
        });

        it('should delete related reactions when cleaning up messages', () => {
            const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000);

            db.storeMessage({
                messageId: 'oldwithreact',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'old content',
                convertedContent: 'old converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: oldTime
            });

            db.storeReaction({
                messageId: 'oldwithreact',
                userId: 'user',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: oldTime,
                isRevertReaction: false
            });

            db.cleanupOldMessages(30);

            // Reactions should also be deleted
            const reactions = db.getReactions('oldwithreact');
            expect(reactions).toEqual([]);
        });

        it('should return 0 when no messages to delete', () => {
            db.storeMessage({
                messageId: 'recentmsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            const deleted = db.cleanupOldMessages(30);
            expect(deleted).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return correct stats for empty database', () => {
            const stats = db.getStats();
            expect(stats.totalMessages).toBe(0);
            expect(stats.totalReactions).toBe(0);
            expect(stats.revertedCount).toBe(0);
        });

        it('should return correct stats after operations', () => {
            // Add messages
            db.storeMessage({
                messageId: 'statsmsg1',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot1',
                createdAt: Date.now()
            });

            db.storeMessage({
                messageId: 'statsmsg2',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'content',
                convertedContent: 'converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot2',
                createdAt: Date.now()
            });

            // Add reactions
            db.storeReaction({
                messageId: 'statsmsg1',
                userId: 'user1',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: false
            });

            db.storeReaction({
                messageId: 'statsmsg1',
                userId: 'user2',
                userTag: 'User#0002',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: false
            });

            // Mark one as reverted
            db.markAsReverted('statsmsg1');

            const stats = db.getStats();
            expect(stats.totalMessages).toBe(2);
            expect(stats.totalReactions).toBe(2);
            expect(stats.revertedCount).toBe(1);
        });
    });

    describe('database directory creation', () => {
        it('should create nested directories if they do not exist', () => {
            const nestedPath = path.join(process.cwd(), 'test-data', 'nested', 'deep', 'test.db');
            const nestedDb = createTestDatabase(nestedPath);

            expect(fs.existsSync(nestedPath)).toBe(true);

            nestedDb.close();

            // Cleanup
            fs.unlinkSync(nestedPath);
            fs.rmdirSync(path.dirname(nestedPath));
            fs.rmdirSync(path.join(process.cwd(), 'test-data', 'nested'));
        });
    });
});
