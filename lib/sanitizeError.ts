/**
 * Sanitize error messages for UI display.
 * Strips Convex internals, stack traces, and technical details
 * so end-users never see backend implementation details.
 */
export function sanitizeError(error: unknown): string {
    let raw = '';

    if (error instanceof Error) {
        raw = error.message;
    } else if (typeof error === 'string') {
        raw = error;
    } else {
        return 'Something went wrong. Please try again.';
    }

    // Strip "[CONVEX ..." prefix and everything after "Called by client"
    raw = raw.replace(/\[CONVEX\s[^\]]*\]\s*/gi, '');
    raw = raw.replace(/Called by client.*/gi, '');

    // Strip stack-trace-like lines (at handler, at cascade, etc.)
    raw = raw.replace(/\s*at\s+\w+\s*\(.*?\)/g, '');

    // Strip file paths
    raw = raw.replace(/\.\.\/.*?\.ts:\d+:\d+/g, '');

    // Strip "Uncaught Error:" prefix
    raw = raw.replace(/Uncaught\s+Error:\s*/gi, '');

    // Strip "Server error:" prefix
    raw = raw.replace(/Server\s+error:\s*/gi, '');

    // Strip request IDs
    raw = raw.replace(/Request\s+ID:\s*\S+/gi, '');

    // Clean up whitespace
    raw = raw.replace(/\s+/g, ' ').trim();

    // If nothing useful remains, return a generic message
    if (!raw || raw.length < 3) {
        return 'Something went wrong. Please try again.';
    }

    // Capitalize first letter
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}
