/**
 * Reddit URL regex patterns
 * Matches reddit.com, www.reddit.com, old.reddit.com, and new.reddit.com
 * Frozen to prevent accidental modification
 */
export const REDDIT_PATTERNS: readonly RegExp[] = Object.freeze([
    /https?:\/\/(www\.)?reddit\.com\/r\/[^\s]+/gi,
    /https?:\/\/(old|new)\.reddit\.com\/r\/[^\s]+/gi,
]);

/**
 * Robot emoji used for reactions
 */
export const ROBOT_EMOJI = '🤖';

/**
 * Detects Reddit links in a message
 * @param content - Message content
 * @returns Array of Reddit URLs found (deduplicated)
 */
export function detectRedditLinks(content: string): string[] {
    const links: string[] = [];
    REDDIT_PATTERNS.forEach(pattern => {
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;
        const matches = content.match(pattern);
        if (matches) {
            links.push(...matches);
        }
    });
    // Remove duplicates
    return [...new Set(links)];
}

/**
 * Converts a Reddit URL to rxddit URL
 * @param url - Original Reddit URL
 * @returns Converted rxddit URL
 */
export function convertToRxddit(url: string): string {
    return url
        .replace(/https?:\/\/(www\.)?reddit\.com/gi, 'https://rxddit.com')
        .replace(/https?:\/\/(old|new)\.reddit\.com/gi, 'https://rxddit.com');
}

/**
 * Converts all Reddit links in a message to rxddit links
 * @param content - Original message content
 * @returns Content with converted links
 */
export function convertMessageLinks(content: string): string {
    let convertedContent = content;
    REDDIT_PATTERNS.forEach(pattern => {
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;
        convertedContent = convertedContent.replace(pattern, (match) => convertToRxddit(match));
    });
    return convertedContent;
}
