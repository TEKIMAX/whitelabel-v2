/**
 * Tekimax Cryptographic Service (Ed25519)
 * Handles client-side key pair generation, signing, and verification.
 * Aligns with the "Sovereignty & Portability Layer" for verifiable human-AI cooperation.
 */

const KEY_ALGO = {
    name: "Ed25519"
};

const STORAGE_KEY_PRIVATE = "tekimax_private_key_v1";
const STORAGE_KEY_PUBLIC = "tekimax_public_key_v1";

export interface TekimaxKeyPair {
    publicKey: string; // Base64 encoded public key
    privateKey?: CryptoKey;
}

/**
 * Generates a new Ed25519 key pair and stores it in LocalStorage.
 * If a key already exists, it returns the existing public key.
 */
export async function ensureIdentity(): Promise<TekimaxKeyPair> {
    const existingPublic = localStorage.getItem(STORAGE_KEY_PUBLIC);
    const existingPrivateJWK = localStorage.getItem(STORAGE_KEY_PRIVATE);

    if (existingPublic && existingPrivateJWK) {
        try {
            const privateKey = await window.crypto.subtle.importKey(
                "jwk",
                JSON.parse(existingPrivateJWK),
                KEY_ALGO,
                true,
                ["sign"]
            );
            return { publicKey: existingPublic, privateKey };
        } catch (e) {
        }
    }

    // Generate new key
    const result = await window.crypto.subtle.generateKey(
        KEY_ALGO,
        true,
        ["sign", "verify"]
    );
    const keyPair = result as CryptoKeyPair;

    // Export public key as Base64
    const publicBuffer = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicBase64 = btoa(String.fromCharCode(...new Uint8Array(publicBuffer)));

    // Export private key as JWK for storage
    const privateJWK = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    localStorage.setItem(STORAGE_KEY_PUBLIC, publicBase64);
    localStorage.setItem(STORAGE_KEY_PRIVATE, JSON.stringify(privateJWK));

    return { publicKey: publicBase64, privateKey: keyPair.privateKey };
}

/**
 * Signs a string payload using the user's private key.
 */
export async function signPayload(payload: string, privateKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    const signature = await window.crypto.subtle.sign(
        KEY_ALGO,
        privateKey,
        data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Signs a context-aware suggestion approval.
 * Creates a canonical JSON string for stable signing.
 */
export async function signApproval(
    entityType: string,
    entityId: string,
    content: string,
    privateKey: CryptoKey
): Promise<{ signature: string, payload: string }> {
    const canonicalPayload = JSON.stringify({
        type: "AI_APPROVAL",
        entityType,
        entityId,
        contentHash: await hashContent(content),
        timestamp: Date.now()
    });

    const signature = await signPayload(canonicalPayload, privateKey);
    return { signature, payload: canonicalPayload };
}

/**
 * Simple SHA-256 hash for content validation in signatures.
 */
async function hashContent(content: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
