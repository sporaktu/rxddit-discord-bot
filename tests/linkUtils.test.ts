import { detectRedditLinks, convertToRxddit, convertMessageLinks, REDDIT_PATTERNS } from '../src/linkUtils';

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
            it('should convert reddit.com to rxddit.com', () => {
                const url = 'https://reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });

            it('should convert www.reddit.com to rxddit.com', () => {
                const url = 'https://www.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });

            it('should convert old.reddit.com to rxddit.com', () => {
                const url = 'https://old.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });

            it('should convert new.reddit.com to rxddit.com', () => {
                const url = 'https://new.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });
        });

        describe('protocol handling', () => {
            it('should convert http to https', () => {
                const url = 'http://reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });

            it('should convert http://www. to https', () => {
                const url = 'http://www.reddit.com/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });
        });

        describe('path preservation', () => {
            it('should preserve full post path', () => {
                const url = 'https://reddit.com/r/programming/comments/abc123/some_title';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/programming/comments/abc123/some_title');
            });

            it('should preserve query parameters', () => {
                const url = 'https://reddit.com/r/test?sort=new';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test?sort=new');
            });

            it('should preserve comment permalinks', () => {
                const url = 'https://www.reddit.com/r/sub/comments/id/title/comment_id/';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/sub/comments/id/title/comment_id/');
            });
        });

        describe('case handling', () => {
            it('should handle uppercase domain', () => {
                const url = 'https://REDDIT.COM/r/test';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/test');
            });

            it('should preserve case in subreddit name', () => {
                const url = 'https://reddit.com/r/AskReddit';
                const converted = convertToRxddit(url);
                expect(converted).toBe('https://rxddit.com/r/AskReddit');
            });
        });
    });

    describe('convertMessageLinks', () => {
        describe('single link conversion', () => {
            it('should convert a single Reddit link in message', () => {
                const content = 'Check out https://reddit.com/r/test';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Check out https://rxddit.com/r/test');
            });

            it('should preserve text around the link', () => {
                const content = 'Before https://reddit.com/r/test after';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Before https://rxddit.com/r/test after');
            });
        });

        describe('multiple link conversion', () => {
            it('should convert multiple Reddit links', () => {
                const content = 'Links: https://reddit.com/r/one and https://reddit.com/r/two';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Links: https://rxddit.com/r/one and https://rxddit.com/r/two');
            });

            it('should convert mix of different Reddit domains', () => {
                const content = 'Old: https://old.reddit.com/r/test New: https://new.reddit.com/r/test2';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Old: https://rxddit.com/r/test New: https://rxddit.com/r/test2');
            });

            it('should convert www and non-www URLs', () => {
                const content = 'Links: https://reddit.com/r/a https://www.reddit.com/r/b';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Links: https://rxddit.com/r/a https://rxddit.com/r/b');
            });
        });

        describe('message preservation', () => {
            it('should not modify non-Reddit URLs', () => {
                const content = 'Check out https://google.com and https://reddit.com/r/test';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Check out https://google.com and https://rxddit.com/r/test');
            });

            it('should preserve emoji in message', () => {
                const content = '🎉 Check out https://reddit.com/r/test 🎊';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('🎉 Check out https://rxddit.com/r/test 🎊');
            });

            it('should preserve newlines in message', () => {
                const content = 'First line\nhttps://reddit.com/r/test\nLast line';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('First line\nhttps://rxddit.com/r/test\nLast line');
            });

            it('should preserve markdown formatting', () => {
                const content = '**Bold** text with [link](https://reddit.com/r/test)';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('**Bold** text with [link](https://rxddit.com/r/test)');
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
                expect(converted).toContain('https://rxddit.com/r/test');
                expect(converted.length).toBe(content.length);
            });

            it('should handle multiple URLs on same line', () => {
                const content = 'https://reddit.com/r/a https://reddit.com/r/b https://reddit.com/r/c';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('https://rxddit.com/r/a https://rxddit.com/r/b https://rxddit.com/r/c');
            });

            it('should handle duplicate URLs', () => {
                const content = 'Same: https://reddit.com/r/test and https://reddit.com/r/test';
                const converted = convertMessageLinks(content);
                expect(converted).toBe('Same: https://rxddit.com/r/test and https://rxddit.com/r/test');
            });
        });
    });

    describe('REDDIT_PATTERNS', () => {
        it('should have correct number of patterns', () => {
            expect(REDDIT_PATTERNS.length).toBe(2);
        });

        it('should all be global regex patterns', () => {
            REDDIT_PATTERNS.forEach(pattern => {
                expect(pattern.flags).toContain('g');
                expect(pattern.flags).toContain('i');
            });
        });
    });
});
