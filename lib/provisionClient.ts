/**
 * Feature modules for the Tekimax provisioned API.
 *
 * Uses the ProvisionPlugin's generic api() namespace to register
 * and call Tekimax-specific endpoints (NAICS, OCR, Pages, Deployments).
 *
 * These modules are PRIVATE — they live in the whitelabel repo, not the
 * open-source tekimax-ts SDK.
 *
 * @example
 * ```ts
 * import { createProvisionClient } from './lib/provisionClient';
 *
 * const client = createProvisionClient();
 * const result = await client.naics.call('search', { q: 'software' });
 * const code = await client.naics.call('getByCode', { code: '541511' });
 * ```
 */

// ── Types ────────────────────────────────────────────────

export interface NaicsCode {
    code: string;
    title: string;
    description?: string | null;
    sector?: string;
    subsector?: string;
    sizeStandard?: string;
}

export interface OcrResult {
    text: string;
    pages?: number;
    confidence?: number;
}

export interface PageConfig {
    id: string;
    slug: string;
    label: string;
    visible: boolean;
    order: number;
    category?: string;
}

// ── Client Factory ───────────────────────────────────────

/**
 * Creates a fully-configured provision API client with
 * typed namespaces for NAICS, OCR, Pages, and Deployments.
 *
 * Reads config from Vite env vars (VITE_API_URL, DEPLOYMENT_ID).
 * For Convex server actions, pass config explicitly.
 */
export function createProvisionClient(config?: {
    apiUrl?: string;
    apiKey?: string;
    deploymentId?: string;
}) {
    const apiUrl = config?.apiUrl
        || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : '')
        || (typeof process !== 'undefined' ? process.env?.VITE_API_URL : '')
        || '';

    // SA-002: API key should only be passed explicitly via config (server-side only).
    // Never auto-read from VITE_ env vars — those are embedded in browser bundles.
    const apiKey = config?.apiKey || '';

    const deploymentId = config?.deploymentId
        || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.DEPLOYMENT_ID : '')
        || (typeof process !== 'undefined' ? process.env?.DEPLOYMENT_ID : '')
        || '';

    // Lazy import to avoid bundling the full SDK when not needed
    // The ProvisionPlugin is from the open-source tekimax-ts package
    // import { ProvisionPlugin } from 'tekimax-ts';
    //
    // For now, use the standalone HTTP helper pattern since the whitelabel
    // template may not have tekimax-ts installed yet.

    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (deploymentId) headers['X-Deployment-ID'] = deploymentId;

    async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
        const url = `${apiUrl}${path}`;
        const opts: RequestInit = { method, headers: { ...headers } };
        if (body) {
            (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        try {
            const res = await fetch(url, opts);
            const data = await res.json() as T;
            return { ok: res.ok, status: res.status, data };
        } catch (err: any) {
            return { ok: false, status: 0, data: { error: err.message } as unknown as T };
        }
    }

    return {
        /** NAICS code lookup and search */
        naics: {
            search: (query: string) =>
                request<{ codes: NaicsCode[] }>('GET', `/api/naics/search?q=${encodeURIComponent(query)}`),
            getByCode: (code: string) =>
                request<NaicsCode>('GET', `/api/naics/codes/${encodeURIComponent(code)}`),
            list: (limit = 50, offset = 0) =>
                request<{ codes: NaicsCode[] }>('GET', `/api/naics/codes?limit=${limit}&offset=${offset}`),
            sectors: () =>
                request<{ sectors: any[] }>('GET', '/api/naics/sectors'),
        },

        /** OCR text extraction */
        ocr: {
            extractFromUrl: (url: string) =>
                request<OcrResult>('POST', '/api/ocr/url', { url }),
            stats: () =>
                request<any>('GET', '/api/ocr/stats'),
        },

        /** Page configuration management */
        pages: {
            list: (id?: string) =>
                request<{ pages: PageConfig[] }>('GET', `/api/deployments/${id || deploymentId}/pages`),
            visible: (id?: string) =>
                request<{ pages: PageConfig[] }>('GET', `/api/public/pages/${id || deploymentId}`),
            update: (pages: Array<{ slug: string; visible?: boolean; order?: number }>, id?: string) =>
                request<{ pages: PageConfig[] }>('PUT', `/api/deployments/${id || deploymentId}/pages`, { pages }),
            reset: (id?: string) =>
                request<{ pages: PageConfig[] }>('POST', `/api/deployments/${id || deploymentId}/pages/reset`),
        },

        /** Deployments */
        deployments: {
            list: () => request<any>('GET', '/api/deployments'),
            get: (id: string) => request<any>('GET', `/api/deployments/${id}`),
            redeploy: (id: string) => request<any>('POST', `/api/deployments/${id}/redeploy`),
            del: (id: string) => request<any>('DELETE', `/api/deployments/${id}`),
        },

        /** Raw request for custom endpoints */
        request,
    };
}
