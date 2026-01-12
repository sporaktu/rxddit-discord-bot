import { detectRedditLinks, convertToRxddit, convertMessageLinks, isDirectVideoLink, resolveVRedditUrl, REDDIT_PATTERNS } from '../src/linkUtils';

describe('Reddit Link Detection', () => {
    describe('detectRedditLinks', () => {
        describe('basic reddit.com URLs', () => {
            it('should detect simple reddit.com URLs', () => {
                const content = 'Check out https://reddit.com/r/programming';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://reddit.com/r/programming');
            });

            it('should detect www.reddit.com URLs', () => {
                const content = 'See https://www.reddit.com/r/javascript';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://www.reddit.com/r/javascript');
            });

            it('should detect old.reddit.com URLs', () => {
                const content = 'Look at https://old.reddit.com/r/typescript';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://old.reddit.com/r/typescript');
            });

            it('should detect new.reddit.com URLs', () => {
                const content = 'Check https://new.reddit.com/r/nodejs';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://new.reddit.com/r/nodejs');
            });
        });

        describe('HTTP protocol', () => {
            it('should detect http:// URLs', () => {
                const content = 'Link: http://reddit.com/r/test';
                const links = detectRedditLinks(content);
                expect(links).toContain('http://reddit.com/r/test');
            });

            it('should detect http:// with www', () => {
                const content = 'Link: http://www.reddit.com/r/test';
                const links = detectRedditLinks(content);
                expect(links).toContain('http://www.reddit.com/r/test');
            });
        });

        describe('complex URLs with paths', () => {
            it('should detect URLs with post paths', () => {
                const content = 'Post: https://reddit.com/r/programming/comments/abc123/some_post_title';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://reddit.com/r/programming/comments/abc123/some_post_title');
            });

            it('should detect URLs with query parameters', () => {
                const content = 'Link: https://reddit.com/r/test?sort=new&limit=10';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(1);
                expect(links[0]).toContain('reddit.com/r/test');
            });

            it('should detect URLs with comment permalinks', () => {
                const content = 'Comment: https://www.reddit.com/r/programming/comments/abc123/title/def456/';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://www.reddit.com/r/programming/comments/abc123/title/def456/');
            });
        });

        describe('multiple URLs', () => {
            it('should detect multiple Reddit URLs in one message', () => {
                const content = 'Check out https://reddit.com/r/one and also https://www.reddit.com/r/two';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(2);
                expect(links).toContain('https://reddit.com/r/one');
                expect(links).toContain('https://www.reddit.com/r/two');
            });

            it('should detect mix of old and new reddit URLs', () => {
                const content = 'Old: https://old.reddit.com/r/test New: https://new.reddit.com/r/test2';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(2);
            });

            it('should remove duplicate URLs', () => {
                const content = 'Same link twice: https://reddit.com/r/test and https://reddit.com/r/test';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(1);
            });
        });

        describe('Reddit media domains', () => {
            it('should detect v.redd.it video URLs', () => {
                const content = 'Watch this https://v.redd.it/o56al2p8gr9g1';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://v.redd.it/o56al2p8gr9g1');
            });

            it('should NOT detect image URLs (already work in Discord)', () => {
                const content = 'Image: https://i.redd.it/abc123xyz456.jpg';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });

            it('should NOT detect preview.redd.it image URLs', () => {
                const content = 'Preview: https://preview.redd.it/hv1bjncotl9g1.jpeg';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });

            it('should filter out various image extensions', () => {
                const content = 'https://i.redd.it/test.png https://preview.redd.it/test.gif https://i.redd.it/test.webp';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });

            it('should detect video but filter image from same message', () => {
                const content = 'Video: https://v.redd.it/abc123 Image: https://i.redd.it/image.jpg';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(1);
                expect(links).toContain('https://v.redd.it/abc123');
            });

            it('should detect mix of reddit.com and video URLs (no images)', () => {
                const content = 'Post: https://reddit.com/r/memes and video https://v.redd.it/abc123';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(2);
                expect(links).toContain('https://reddit.com/r/memes');
                expect(links).toContain('https://v.redd.it/abc123');
            });

            it('should handle image URLs with query parameters', () => {
                const content = 'https://preview.redd.it/image.jpg?width=640&format=pjpg';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });
        });

        describe('edge cases', () => {
            it('should return empty array for messages without Reddit links', () => {
                const content = 'Just a normal message without any links';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });

            it('should return empty array for empty string', () => {
                const links = detectRedditLinks('');
                expect(links).toEqual([]);
            });

            it('should not match non-Reddit URLs', () => {
                const content = 'https://google.com https://twitter.com/reddit';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });

            it('should not match reddit.com without /r/ path', () => {
                const content = 'https://reddit.com/user/someone';
                const links = detectRedditLinks(content);
                expect(links).toEqual([]);
            });

            it('should handle URLs in markdown format', () => {
                const content = '[Click here](https://reddit.com/r/test)';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(1);
            });

            it('should handle URLs surrounded by text', () => {
                const content = 'before https://reddit.com/r/test after';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://reddit.com/r/test');
            });

            it('should handle multiple URLs on same line', () => {
                const content = 'https://reddit.com/r/a https://reddit.com/r/b https://reddit.com/r/c';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(3);
            });

            it('should handle URLs with trailing punctuation', () => {
                const content = 'Check this out: https://reddit.com/r/test!';
                const links = detectRedditLinks(content);
                expect(links.length).toBe(1);
            });
        });

        describe('case sensitivity', () => {
            it('should detect URLs with uppercase letters in path', () => {
                const content = 'https://reddit.com/r/AskReddit';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://reddit.com/r/AskReddit');
            });

            it('should detect URLs with mixed case domain', () => {
                const content = 'https://REDDIT.COM/r/test';
                const links = detectRedditLinks(content);
                expect(links).toContain('https://REDDIT.COM/r/test');
            });
        });
    });

    describe('convertToRxddit', () => {
        describe('basic conversions', () => {
            it('should convert reddit.com to redditez.com', () => {
                const url = 'https://reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });

            it('should convert www.reddit.com to redditez.com', () => {
                const url = 'https://www.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });

            it('should convert old.reddit.com to redditez.com', () => {
                const url = 'https://old.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });

            it('should convert new.reddit.com to redditez.com', () => {
                const url = 'https://new.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });
        });

        describe('protocol handling', () => {
            it('should convert http to https', () => {
                const url = 'http://reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });

            it('should convert http://www. to https', () => {
                const url = 'http://www.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });
        });

        describe('path preservation', () => {
            it('should preserve full post path', () => {
                const url = 'https://reddit.com/r/programming/comments/abc123/some_title';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/programming/comments/abc123/some_title');
            });

            it('should preserve query parameters', () => {
                const url = 'https://reddit.com/r/test?sort=new';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test?sort=new');
            });

            it('should preserve comment permalinks', () => {
                const url = 'https://www.reddit.com/r/sub/comments/id/title/comment_id/';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/sub/comments/id/title/comment_id/');
            });
        });

        describe('case handling', () => {
            it('should handle uppercase domain', () => {
                const url = 'https://REDDIT.COM/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/test');
            });

            it('should preserve case in subreddit name', () => {
                const url = 'https://reddit.com/r/AskReddit';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/r/AskReddit');
            });
        });

        describe('Reddit media domains', () => {
            it('should convert v.redd.it to redditez.com', () => {
                const url = 'https://v.redd.it/o56al2p8gr9g1';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/o56al2p8gr9g1');
            });

            it('should convert i.redd.it to redditez.com', () => {
                const url = 'https://i.redd.it/abc123xyz456.jpg';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/abc123xyz456.jpg');
            });

            it('should convert preview.redd.it to redditez.com', () => {
                const url = 'https://preview.redd.it/something.png';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/something.png');
            });

            it('should handle http protocol for redd.it domains', () => {
                const url = 'http://v.redd.it/abc123';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://redditez.com/abc123');
            });
        });
    });

    describe('convertMessageLinks', () => {
        describe('single link conversion', () => {
            it('should convert a single Reddit link in message', () => {
                const content = 'Check out https://reddit.com/r/test';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Check out https://redditez.com/r/test');
            });

            it('should preserve text around the link', () => {
                const content = 'Before https://reddit.com/r/test after';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Before https://redditez.com/r/test after');
            });
        });

        describe('multiple link conversion', () => {
            it('should convert multiple Reddit links', () => {
                const content = 'Links: https://reddit.com/r/one and https://reddit.com/r/two';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Links: https://redditez.com/r/one and https://redditez.com/r/two');
            });

            it('should convert mix of different Reddit domains', () => {
                const content = 'Old: https://old.reddit.com/r/test New: https://new.reddit.com/r/test2';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Old: https://redditez.com/r/test New: https://redditez.com/r/test2');
            });

            it('should convert www and non-www URLs', () => {
                const content = 'Links: https://reddit.com/r/a https://www.reddit.com/r/b';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Links: https://redditez.com/r/a https://redditez.com/r/b');
            });
        });

        describe('message preservation', () => {
            it('should not modify non-Reddit URLs', () => {
                const content = 'Check out https://google.com and https://reddit.com/r/test';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Check out https://google.com and https://redditez.com/r/test');
            });

            it('should preserve emoji in message', () => {
                const content = '🎉 Check out https://reddit.com/r/test 🎊';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('🎉 Check out https://redditez.com/r/test 🎊');
            });

            it('should preserve newlines in message', () => {
                const content = 'First line\nhttps://reddit.com/r/test\nLast line';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('First line\nhttps://redditez.com/r/test\nLast line');
            });

            it('should preserve markdown formatting', () => {
                const content = '**Bold** text with [link](https://reddit.com/r/test)';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('**Bold** text with [link](https://redditez.com/r/test)');
            });

            it('should handle message with no Reddit links', () => {
                const content = 'This is a normal message';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('This is a normal message');
            });
        });

        describe('edge cases', () => {
            it('should handle empty string', () => {
                const converted = convertMessageLinks('');
                expect(converted).toBe('');
            });

            it('should handle very long messages', () => {
                const longText = 'a'.repeat(1000);
                const content = `${longText} https://reddit.com/r/test ${longText}`;
                const converted = convertMessageLinks(content);
                expect(converted).toContain('https://redditez.com/r/test');
                // redditez.com is 2 chars longer than reddit.com, so length increases by 2
                expect(converted.length).toBe(content.length + 2);
            });

            it('should handle multiple URLs on same line', () => {
                const content = 'https://reddit.com/r/a https://reddit.com/r/b https://reddit.com/r/c';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('https://redditez.com/r/a https://redditez.com/r/b https://redditez.com/r/c');
            });

            it('should handle duplicate URLs', () => {
                const content = 'Same: https://reddit.com/r/test and https://reddit.com/r/test';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Same: https://redditez.com/r/test and https://redditez.com/r/test');
            });
        });
    });

    describe('REDDIT_PATTERNS', () => {
        it('should have correct number of patterns', () => {
            expect(REDDIT_PATTERNS.length).toBe(3);
        });

        it('should all be global regex patterns', () => {
            REDDIT_PATTERNS.forEach(pattern => {
                expect(pattern.flags).toContain('g');
                expect(pattern.flags).toContain('i');
            });
        });
    });

    describe('isDirectVideoLink', () => {
        describe('v.redd.it URLs', () => {
            it('should return true for v.redd.it with https', () => {
                expect(isDirectVideoLink('https://v.redd.it/8iudhwqogrcg1')).toBe(true);
            });

            it('should return true for v.redd.it with http', () => {
                expect(isDirectVideoLink('http://v.redd.it/abc123')).toBe(true);
            });

            it('should return true for v.redd.it with long video IDs', () => {
                expect(isDirectVideoLink('https://v.redd.it/o56al2p8gr9g1')).toBe(true);
            });

            it('should be case insensitive', () => {
                expect(isDirectVideoLink('https://V.REDD.IT/abc123')).toBe(true);
                expect(isDirectVideoLink('https://V.Redd.It/abc123')).toBe(true);
            });
        });

        describe('non-v.redd.it URLs', () => {
            it('should return false for reddit.com URLs', () => {
                expect(isDirectVideoLink('https://reddit.com/r/videos/comments/abc123')).toBe(false);
            });

            it('should return false for www.reddit.com URLs', () => {
                expect(isDirectVideoLink('https://www.reddit.com/r/test')).toBe(false);
            });

            it('should return false for old.reddit.com URLs', () => {
                expect(isDirectVideoLink('https://old.reddit.com/r/test')).toBe(false);
            });

            it('should return false for i.redd.it image URLs', () => {
                expect(isDirectVideoLink('https://i.redd.it/image.jpg')).toBe(false);
            });

            it('should return false for preview.redd.it URLs', () => {
                expect(isDirectVideoLink('https://preview.redd.it/image.png')).toBe(false);
            });

            it('should return false for non-Reddit URLs', () => {
                expect(isDirectVideoLink('https://youtube.com/watch?v=abc123')).toBe(false);
                expect(isDirectVideoLink('https://google.com')).toBe(false);
            });

            it('should return false for empty string', () => {
                expect(isDirectVideoLink('')).toBe(false);
            });
        });

        describe('edge cases', () => {
            it('should not match v.redd.it in middle of URL', () => {
                expect(isDirectVideoLink('https://example.com/v.redd.it/abc')).toBe(false);
            });

            it('should not match partial v.redd.it domains', () => {
                expect(isDirectVideoLink('https://notv.redd.it/abc')).toBe(false);
            });
        });
    });

    describe('resolveVRedditUrl', () => {
        // Save original fetch
        const originalFetch = global.fetch;

        afterEach(() => {
            // Restore original fetch after each test
            global.fetch = originalFetch;
        });

        describe('non-v.redd.it URLs', () => {
            it('should return original URL for reddit.com URLs', async () => {
                const url = 'https://reddit.com/r/test/comments/abc123';
                const result = await resolveVRedditUrl(url);
                expect(result).toBe(url);
            });

            it('should return original URL for other URLs', async () => {
                const url = 'https://youtube.com/watch?v=abc123';
                const result = await resolveVRedditUrl(url);
                expect(result).toBe(url);
            });
        });

        describe('v.redd.it URLs with successful fetch', () => {
            it('should resolve v.redd.it to reddit.com/video URL', async () => {
                global.fetch = jest.fn().mockResolvedValue({
                    url: 'https://www.reddit.com/video/8iudhwqogrcg1'
                });

                const result = await resolveVRedditUrl('https://v.redd.it/8iudhwqogrcg1');
                expect(result).toBe('https://www.reddit.com/video/8iudhwqogrcg1');
            });

            it('should handle redirects to full post URLs', async () => {
                global.fetch = jest.fn().mockResolvedValue({
                    url: 'https://www.reddit.com/r/funny/comments/abc123/title'
                });

                const result = await resolveVRedditUrl('https://v.redd.it/abc123');
                expect(result).toBe('https://www.reddit.com/r/funny/comments/abc123/title');
            });
        });

        describe('v.redd.it URLs with fetch failure', () => {
            it('should fallback to constructed URL when fetch fails', async () => {
                global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

                const result = await resolveVRedditUrl('https://v.redd.it/8iudhwqogrcg1');
                expect(result).toBe('https://www.reddit.com/video/8iudhwqogrcg1');
            });

            it('should strip query params when constructing fallback URL', async () => {
                global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

                const result = await resolveVRedditUrl('https://v.redd.it/abc123?source=share');
                expect(result).toBe('https://www.reddit.com/video/abc123');
            });

            it('should strip hash when constructing fallback URL', async () => {
                global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

                const result = await resolveVRedditUrl('https://v.redd.it/abc123#section');
                expect(result).toBe('https://www.reddit.com/video/abc123');
            });
        });

        describe('v.redd.it URLs with non-reddit redirect', () => {
            it('should fallback to constructed URL when redirect is not to reddit.com', async () => {
                global.fetch = jest.fn().mockResolvedValue({
                    url: 'https://example.com/some/other/url'
                });

                const result = await resolveVRedditUrl('https://v.redd.it/abc123');
                expect(result).toBe('https://www.reddit.com/video/abc123');
            });
        });

        describe('edge cases', () => {
            it('should handle http v.redd.it URLs', async () => {
                global.fetch = jest.fn().mockResolvedValue({
                    url: 'https://www.reddit.com/video/abc123'
                });

                const result = await resolveVRedditUrl('http://v.redd.it/abc123');
                expect(result).toBe('https://www.reddit.com/video/abc123');
            });

            it('should handle uppercase V.REDD.IT URLs', async () => {
                global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

                const result = await resolveVRedditUrl('https://V.REDD.IT/ABC123');
                expect(result).toBe('https://www.reddit.com/video/ABC123');
            });
        });
    });
});
