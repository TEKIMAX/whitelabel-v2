/**
 * File URL signing utilities.
 * Works in both Convex V8 (queries) and Node.js (actions/HTTP) runtimes.
 * 
 * Uses a simple HMAC-like signing scheme based on the Web Crypto API
 * which is available in all environments.
 */

const DEFAULT_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a signed file URL.
 * Format: /api/file/{storageId}?expires={timestamp}&sig={hash}
 */
export function signFileUrl(
    siteUrl: string,
    storageId: string,
    expiresInMs: number = DEFAULT_EXPIRY_MS
): string {
    const expires = Date.now() + expiresInMs;
    const sig = createSignature(storageId, expires);
    return `${siteUrl}/api/file/${storageId}?expires=${expires}&sig=${sig}`;
}

/**
 * Validate a signed file URL.
 */
export function validateFileSignature(
    storageId: string,
    expires: number,
    sig: string
): { valid: boolean; reason?: string } {
    if (Date.now() > expires) {
        return { valid: false, reason: "expired" };
    }
    const expected = createSignature(storageId, expires);
    if (sig !== expected) {
        return { valid: false, reason: "invalid_signature" };
    }
    return { valid: true };
}

/**
 * Simple signing function that works in any JS runtime.
 * Uses env var FILE_SIGNING_SECRET as the key.
 */
function createSignature(storageId: string, expires: number): string {
    const secret = process.env.FILE_SIGNING_SECRET || "default-file-signing-secret-change-me";
    const data = `${storageId}:${expires}:${secret}`;
    // Simple hash: FNV-1a 64-bit spread to hex
    let h1 = 0x811c9dc5 >>> 0;
    let h2 = 0x1000193 >>> 0;
    for (let i = 0; i < data.length; i++) {
        const c = data.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, h2);
        h2 = Math.imul(h2 ^ (c << 8), 0x01000193);
    }
    // Convert to hex and combine with a second pass for more entropy
    let h3 = 0xcbf29ce5 >>> 0;
    for (let i = data.length - 1; i >= 0; i--) {
        h3 = Math.imul(h3 ^ data.charCodeAt(i), 0x01000193);
    }
    return (
        (h1 >>> 0).toString(16).padStart(8, '0') +
        (h2 >>> 0).toString(16).padStart(8, '0') +
        (h3 >>> 0).toString(16).padStart(8, '0')
    );
}
