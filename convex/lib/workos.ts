
/**
 * WorkOS Vault Integration Helper
 * Used for securely storing and retrieving webhook signing secrets.
 */

const WORKOS_URL = "https://api.workos.com/vault/v1";

/**
 * Stores a secret in WorkOS Vault.
 * @param name - A descriptive name for the secret (e.g., "Webhook Secret for org_123")
 * @param value - The actual secret value to store
 * @param orgId - The organization ID this secret belongs to (for context)
 * @returns The Vault Secret ID
 */
export async function storeSecretInVault(name: string, value: string, orgId: string): Promise<string> {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error("WORKOS_API_KEY is not defined");

    const response = await fetch(`${WORKOS_URL}/kv`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            value,
            key_context: {
                organization_id: orgId
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vault Store Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id; // The ID of the secret in Vault
}

/**
 * Retrieves a decrypted secret from WorkOS Vault.
 * @param secretId - The Vault Secret ID
 * @returns The decrypted secret value
 */
export async function getSecretFromVault(secretId: string): Promise<string> {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error("WORKOS_API_KEY is not defined");

    const response = await fetch(`${WORKOS_URL}/kv/${secretId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vault Retrieve Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value;
}

/**
 * Deletes a secret from WorkOS Vault.
 * @param secretId - The Vault Secret ID
 * @returns None
 */
export async function deleteSecretFromVault(secretId: string): Promise<void> {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error("WORKOS_API_KEY is not defined");

    const response = await fetch(`${WORKOS_URL}/kv/${secretId}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        const error = await response.text();
        // If 404, consider it already deleted?
        if (response.status === 404) return;
        throw new Error(`Vault Delete Failed: ${response.statusText}`);
    }
}
