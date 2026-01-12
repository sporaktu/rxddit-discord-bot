/**
 * Reddit URL regex patterns
 * Matches reddit.com, www.reddit.com, old.reddit.com, new.reddit.com,
 * and Reddit media domains (v.redd.it, i.redd.it, preview.redd.it)
 * Frozen to prevent accidental modification
 */
export const REDDIT_PATTERNS: readonly RegExp[] = Object.freeze([
    /https?:\/\/(www\.)?reddit\.com\/r\/[^\s]+/gi,
    /https?:\/\/(old|new)\.reddit\.com\/r\/[^\s]+/gi,
    /https?:\/\/(v|i|preview)\.redd\.it\/[^\s]+/gi,
]);

/**
 * Robot emoji used for reactions
 */
export const ROBOT_EMOJI = '🤖';

/**
 * Common image file extensions
 * Images already display properly in Discord, so we don't need to convert them
 */
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;

/**
 * Pattern to match v.redd.it direct video URLs
 * These are always video content, so we can skip embed verification
 */
const V_REDDIT_PATTERN = /^https?:\/\/v\.redd\.it\//i;

/**
 * Checks if a URL is a v.redd.it direct video link
 * v.redd.it links are always video content and don't need embed verification
 * @param url - URL to check
 * @returns true if URL is a v.redd.it link
 */
export function isDirectVideoLink(url: string): boolean {
    return V_REDDIT_PATTERN.test(url);
}

/** Timeout for v.redd.it redirect resolution (5 seconds) */
const VREDDIT_RESOLVE_TIMEOUT_MS = 5000;

/** Valid Reddit domains for redirect validation */
const VALID_REDDIT_DOMAINS = ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com'];

/**
 * Extracts video ID from v.redd.it URL and constructs fallback reddit.com URL
 * @param url - v.redd.it URL
 * @returns Constructed reddit.com/video/{id} URL
 */
function constructFallbackVideoUrl(url: string): string {
    const videoId = url.replace(/^https?:\/\/v\.redd\.it\//i, '').split(/[?#]/)[0];
    return `https://www.reddit.com/video/${videoId}`;
}

/**
 * Validates that a URL is from an allowed Reddit domain
 * @param url - URL to validate
 * @returns true if URL is from a valid Reddit domain
 */
function isValidRedditDomain(url: string): boolean {
    try {
        const hostname = new URL(url).hostname;
        return VALID_REDDIT_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
    } catch {
        return false;
    }
}

/**
 * Resolves a v.redd.it URL to its actual reddit.com URL by following redirects
 * v.redd.it links redirect to reddit.com/video/{id} which embeds properly
 * @param url - v.redd.it URL to resolve
 * @returns Promise resolving to the actual reddit.com URL, or original URL if resolution fails
 */
export async function resolveVRedditUrl(url: string): Promise<string> {
    if (!isDirectVideoLink(url)) {
        return url;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VREDDIT_RESOLVE_TIMEOUT_MS);

    try {
        // Make a HEAD request to follow redirects without downloading content
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'rxddit-discord-bot/1.0 (Discord embed helper)',
            },
        });
        clearTimeout(timeoutId);

        // Return the final URL after redirects
        const resolvedUrl = response.url;

        // Validate redirect is to a known Reddit domain (security: prevent SSRF)
        if (isValidRedditDomain(resolvedUrl)) {
            return resolvedUrl;
        }

        // Fallback: construct the URL manually based on known pattern
        return constructFallbackVideoUrl(url);
    } catch (error) {
        clearTimeout(timeoutId);
        // Log error for debugging (timeout, network issues, etc.)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.debug(`Failed to resolve v.redd.it URL ${url}: ${errorMessage}`);
        // Fallback: construct the URL manually based on known pattern
        return constructFallbackVideoUrl(url);
    }
}

/**
 * Checks if a URL is an image based on file extension
 * @param url - URL to check
 * @returns true if URL appears to be an image
 */
function isImageUrl(url: string): boolean {
    return IMAGE_EXTENSIONS.test(url);
}

/**
 * Detects Reddit links in a message
 * @param content - Message content
 * @returns Array of Reddit URLs found (deduplicated, excluding images)
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
    // Remove duplicates and filter out image URLs
    const uniqueLinks = [...new Set(links)];
    return uniqueLinks.filter(link => !isImageUrl(link));
}

/**
 * Converts a Reddit URL to redditez URL
 * @param url - Original Reddit URL
 * @returns Converted redditez URL
 */
export function convertToRxddit(url: string): string {
    return url
        .replace(/https?:\/\/(www\.)?reddit\.com/gi, 'https://redditez.com')
        .replace(/https?:\/\/(old|new)\.reddit\.com/gi, 'https://redditez.com')
        .replace(/https?:\/\/(v|i|preview)\.redd\.it/gi, 'https://redditez.com');
}

/**
 * Converts all Reddit links in a message to redditez links
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
