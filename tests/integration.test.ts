import { createTestDatabase, MessageDatabase } from '../src/database';
import { detectRedditLinks, convertToRxddit, convertMessageLinks } from '../src/linkUtils';
import { getTestDbPath } from './setup';
import fs from 'fs';

/**
 * Integration tests that test the full flow of link detection,
 * conversion, and database storage working together.
 */
describe('Integration Tests', () => {
    let db: MessageDatabase;
    let testDbPath: string;

    beforeEach(() => {
        testDbPath = getTestDbPath('integration');
        db = createTestDatabase(testDbPath);
    });

    afterEach(() => {
        db.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    describe('Full Message Processing Flow', () => {
        it('should detect, convert, and store a message with Reddit links', () => {
            // Simulate incoming message
            const messageContent = 'Check out this post: https://reddit.com/r/programming/comments/abc123/great_post';
            const messageId = 'msg123';
            const authorId = 'user456';
            const authorTag = 'TestUser#1234';
            const channelId = 'channel789';
            const guildId = 'guild000';
            const botMessageId = 'botmsg111';

            // Step 1: Detect Reddit links
            const detectedLinks = detectRedditLinks(messageContent);
            expect(detectedLinks.length).toBe(1);
            expect(detectedLinks[0]).toBe('https://reddit.com/r/programming/comments/abc123/great_post');

            // Step 2: Convert the message
            const convertedContent = convertMessageLinks(messageContent);
            expect(convertedContent).toBe('Check out this post: https://rxddit.com/r/programming/comments/abc123/great_post');

            // Step 3: Convert individual links for storage
            const convertedLinks = detectedLinks.map(link => convertToRxddit(link));
            expect(convertedLinks[0]).toBe('https://rxddit.com/r/programming/comments/abc123/great_post');

            // Step 4: Store in database
            db.storeMessage({
                messageId,
                channelId,
                guildId,
                authorId,
                authorTag,
                originalContent: messageContent,
                convertedContent,
                originalLinks: JSON.stringify(detectedLinks),
                convertedLinks: JSON.stringify(convertedLinks),
                botMessageId,
                createdAt: Date.now()
            });

            // Step 5: Verify storage
            const storedMessage = db.getMessage(messageId);
            expect(storedMessage).not.toBeNull();
            expect(storedMessage?.originalContent).toBe(messageContent);
            expect(storedMessage?.convertedContent).toBe(convertedContent);
            expect(JSON.parse(storedMessage!.originalLinks)).toEqual(detectedLinks);
            expect(JSON.parse(storedMessage!.convertedLinks)).toEqual(convertedLinks);
            expect(storedMessage?.isReverted).toBe(false);
        });

        it('should handle message with multiple Reddit links', () => {
            const messageContent = 'Check https://reddit.com/r/one and https://old.reddit.com/r/two and https://www.reddit.com/r/three';
            const messageId = 'multi123';

            // Detect all links
            const detectedLinks = detectRedditLinks(messageContent);
            expect(detectedLinks.length).toBe(3);

            // Convert message
            const convertedContent = convertMessageLinks(messageContent);
            expect(convertedContent).toBe('Check https://rxddit.com/r/one and https://rxddit.com/r/two and https://rxddit.com/r/three');

            // Store and verify
            const convertedLinks = detectedLinks.map(link => convertToRxddit(link));
            db.storeMessage({
                messageId,
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: messageContent,
                convertedContent,
                originalLinks: JSON.stringify(detectedLinks),
                convertedLinks: JSON.stringify(convertedLinks),
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            const stored = db.getMessage(messageId);
            expect(JSON.parse(stored!.originalLinks).length).toBe(3);
            expect(JSON.parse(stored!.convertedLinks).length).toBe(3);
        });
    });

    describe('Revert Flow', () => {
        it('should properly track revert through reaction', () => {
            const messageId = 'revertflow123';
            const authorId = 'author123';

            // Store initial message
            db.storeMessage({
                messageId,
                channelId: 'channel',
                guildId: 'guild',
                authorId,
                authorTag: 'Author#0001',
                originalContent: 'https://reddit.com/r/test',
                convertedContent: 'https://rxddit.com/r/test',
                originalLinks: JSON.stringify(['https://reddit.com/r/test']),
                convertedLinks: JSON.stringify(['https://rxddit.com/r/test']),
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            // Simulate non-author reaction (should not trigger revert)
            db.storeReaction({
                messageId,
                userId: 'otheruser',
                userTag: 'OtherUser#5678',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: false
            });

            // Message should not be reverted
            let message = db.getMessage(messageId);
            expect(message?.isReverted).toBe(false);

            // Simulate author reaction (should trigger revert)
            db.storeReaction({
                messageId,
                userId: authorId,
                userTag: 'Author#0001',
                emoji: '🤖',
                reactedAt: Date.now(),
                isRevertReaction: true
            });

            // Mark as reverted
            db.markAsReverted(messageId);

            // Verify reverted state
            message = db.getMessage(messageId);
            expect(message?.isReverted).toBe(true);

            // Verify reaction history
            const reactions = db.getReactions(messageId);
            expect(reactions.length).toBe(2);
            expect(reactions[0].isRevertReaction).toBe(false);
            expect(reactions[1].isRevertReaction).toBe(true);
        });

        it('should prevent double revert', () => {
            const messageId = 'doublerevert123';

            db.storeMessage({
                messageId,
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'https://reddit.com/r/test',
                convertedContent: 'https://rxddit.com/r/test',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            // First revert - should succeed
            const firstRevert = db.markAsReverted(messageId);
            expect(firstRevert).toBe(true);

            // Second revert attempt - should fail (already reverted, atomic operation)
            const secondRevert = db.markAsReverted(messageId);
            expect(secondRevert).toBe(false);

            // Message should still be reverted
            const message = db.getMessage(messageId);
            expect(message?.isReverted).toBe(true);
        });
    });

    describe('Message Lookup Scenarios', () => {
        it('should find messages by author across multiple channels', () => {
            const authorId = 'prolific_author';

            // Store messages in different channels
            for (let i = 1; i <= 3; i++) {
                db.storeMessage({
                    messageId: `crosschannel${i}`,
                    channelId: `channel${i}`,
                    guildId: 'guild',
                    authorId,
                    authorTag: 'Author#0001',
                    originalContent: `Content ${i}`,
                    convertedContent: `Converted ${i}`,
                    originalLinks: '[]',
                    convertedLinks: '[]',
                    botMessageId: `bot${i}`,
                    createdAt: Date.now() + i
                });
            }

            const authorMessages = db.getMessagesByAuthor(authorId);
            expect(authorMessages.length).toBe(3);

            // Should be from different channels
            const channels = new Set(authorMessages.map(m => m.channelId));
            expect(channels.size).toBe(3);
        });

        it('should find messages by channel from multiple authors', () => {
            const channelId = 'shared_channel';

            // Store messages from different authors
            for (let i = 1; i <= 3; i++) {
                db.storeMessage({
                    messageId: `multiauthor${i}`,
                    channelId,
                    guildId: 'guild',
                    authorId: `author${i}`,
                    authorTag: `Author${i}#0001`,
                    originalContent: `Content ${i}`,
                    convertedContent: `Converted ${i}`,
                    originalLinks: '[]',
                    convertedLinks: '[]',
                    botMessageId: `bot${i}`,
                    createdAt: Date.now() + i
                });
            }

            const channelMessages = db.getMessagesByChannel(channelId);
            expect(channelMessages.length).toBe(3);

            // Should be from different authors
            const authors = new Set(channelMessages.map(m => m.authorId));
            expect(authors.size).toBe(3);
        });
    });

    describe('Data Integrity', () => {
        it('should preserve special characters in content', () => {
            const specialContent = "Check this: 🔥 https://reddit.com/r/test 🎉\n'Quotes' and \"double quotes\"";
            const messageId = 'special123';

            const detectedLinks = detectRedditLinks(specialContent);
            const convertedContent = convertMessageLinks(specialContent);

            db.storeMessage({
                messageId,
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: specialContent,
                convertedContent,
                originalLinks: JSON.stringify(detectedLinks),
                convertedLinks: JSON.stringify(detectedLinks.map(convertToRxddit)),
                botMessageId: 'bot',
                createdAt: Date.now()
            });

            const stored = db.getMessage(messageId);
            expect(stored?.originalContent).toBe(specialContent);
        });

        it('should handle very long URLs', () => {
            const longPath = 'a'.repeat(200);
            const longUrl = `https://reddit.com/r/test/${longPath}`;
            const messageContent = `Long URL: ${longUrl}`;

            const detectedLinks = detectRedditLinks(messageContent);
            expect(detectedLinks.length).toBe(1);

            const converted = convertToRxddit(detectedLinks[0]);
            expect(converted).toContain('rxddit.com');
            expect(converted).toContain(longPath);
        });

        it('should handle JSON serialization of links array correctly', () => {
            const links = [
                'https://reddit.com/r/one',
                'https://reddit.com/r/two?param=value&other=test'
            ];

            const serialized = JSON.stringify(links);
            const deserialized = JSON.parse(serialized);

            expect(deserialized).toEqual(links);
            expect(deserialized[1]).toContain('param=value');
        });
    });

    describe('Cleanup Integration', () => {
        it('should clean up old messages while preserving recent ones', () => {
            const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000);
            const recentTime = Date.now();

            // Add old message with reactions
            db.storeMessage({
                messageId: 'oldmsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'Old content',
                convertedContent: 'Old converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'oldbot',
                createdAt: oldTime
            });

            db.storeReaction({
                messageId: 'oldmsg',
                userId: 'user',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: oldTime,
                isRevertReaction: false
            });

            // Add recent message with reactions
            db.storeMessage({
                messageId: 'newmsg',
                channelId: 'channel',
                guildId: 'guild',
                authorId: 'author',
                authorTag: 'Author#0001',
                originalContent: 'New content',
                convertedContent: 'New converted',
                originalLinks: '[]',
                convertedLinks: '[]',
                botMessageId: 'newbot',
                createdAt: recentTime
            });

            db.storeReaction({
                messageId: 'newmsg',
                userId: 'user',
                userTag: 'User#0001',
                emoji: '🤖',
                reactedAt: recentTime,
                isRevertReaction: false
            });

            // Run cleanup
            const deleted = db.cleanupOldMessages(30);

            // Verify old message is gone
            expect(deleted).toBe(1);
            expect(db.hasMessage('oldmsg')).toBe(false);
            expect(db.getReactions('oldmsg')).toEqual([]);

            // Verify new message is preserved
            expect(db.hasMessage('newmsg')).toBe(true);
            expect(db.getReactions('newmsg').length).toBe(1);
        });
    });

    describe('Statistics Accuracy', () => {
        it('should accurately report statistics after various operations', () => {
            // Initial state
            let stats = db.getStats();
            expect(stats.totalMessages).toBe(0);
            expect(stats.totalReactions).toBe(0);
            expect(stats.revertedCount).toBe(0);

            // Add messages
            for (let i = 1; i <= 5; i++) {
                db.storeMessage({
                    messageId: `statmsg${i}`,
                    channelId: 'channel',
                    guildId: 'guild',
                    authorId: 'author',
                    authorTag: 'Author#0001',
                    originalContent: `Content ${i}`,
                    convertedContent: `Converted ${i}`,
                    originalLinks: '[]',
                    convertedLinks: '[]',
                    botMessageId: `bot${i}`,
                    createdAt: Date.now()
                });
            }

            stats = db.getStats();
            expect(stats.totalMessages).toBe(5);

            // Add reactions
            for (let i = 1; i <= 3; i++) {
                db.storeReaction({
                    messageId: `statmsg${i}`,
                    userId: `user${i}`,
                    userTag: `User${i}#0001`,
                    emoji: '🤖',
                    reactedAt: Date.now(),
                    isRevertReaction: false
                });
            }

            stats = db.getStats();
            expect(stats.totalReactions).toBe(3);

            // Revert some messages
            db.markAsReverted('statmsg1');
            db.markAsReverted('statmsg2');

            stats = db.getStats();
            expect(stats.revertedCount).toBe(2);

            // Delete a message
            db.deleteMessage('statmsg5');

            stats = db.getStats();
            expect(stats.totalMessages).toBe(4);
        });
    });
});
