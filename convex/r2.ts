/**
 * Cloudflare R2 integration using fetch + AWS S3v4 Signature.
 *
 * Convex actions run in V8 isolates (not full Node.js), so we cannot rely on
 * @aws-sdk/client-s3 which uses Node.js http/https modules internally.
 * Instead, we use the native `fetch` API with manual S3v4 signing.
 *
 * Required env vars on Convex deployment:
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET
 */
import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";

// ── S3v4 Signature Helpers ──
// These implement the AWS Signature Version 4 signing process.

function getHmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    return crypto.subtle.importKey(
        "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    ).then(k => crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}

async function sha256(data: string | ArrayBuffer): Promise<string> {
    const buffer = typeof data === "string"
        ? new TextEncoder().encode(data).buffer as ArrayBuffer
        : data;
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return bufferToHex(hashBuffer);
}

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function getSigningKey(
    secretKey: string, date: string, region: string, service: string
): Promise<ArrayBuffer> {
    const kDate = await getHmacSha256(
        new TextEncoder().encode("AWS4" + secretKey).buffer as ArrayBuffer, date
    );
    const kRegion = await getHmacSha256(kDate, region);
    const kService = await getHmacSha256(kRegion, service);
    return getHmacSha256(kService, "aws4_request");
}

interface S3SignedRequest {
    url: string;
    headers: Record<string, string>;
}

async function signS3Request(opts: {
    method: string;
    endpoint: string;
    bucket: string;
    key: string;
    accessKeyId: string;
    secretAccessKey: string;
    body?: ArrayBuffer | null;
    contentType?: string;
    contentDisposition?: string;
    query?: Record<string, string>;
}): Promise<S3SignedRequest> {
    const region = "auto";
    const service = "s3";
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

    // Manually encode each path segment to match S3v4 requirements
    // encodeURIComponent encodes (), spaces, etc. which new URL() does not
    const encodedKey = opts.key.split("/").map(s => encodeURIComponent(s)).join("/");
    const canonicalPath = `/${opts.bucket}/${encodedKey}`;
    const fullUrl = `${opts.endpoint}${canonicalPath}`;
    const url = new URL(fullUrl);

    // Add query parameters if any
    if (opts.query) {
        for (const [k, val] of Object.entries(opts.query)) {
            url.searchParams.set(k, val);
        }
    }

    // Canonical headers
    const host = url.host;
    const payloadHash = opts.body
        ? await sha256(opts.body)
        : await sha256("");

    const headers: Record<string, string> = {
        host,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
    };
    if (opts.contentType) headers["content-type"] = opts.contentType;
    if (opts.contentDisposition) headers["content-disposition"] = opts.contentDisposition;

    // Sorted header keys
    const signedHeaderKeys = Object.keys(headers).sort();
    const signedHeaders = signedHeaderKeys.join(";");

    const canonicalHeaders = signedHeaderKeys
        .map(k => `${k}:${headers[k]}\n`)
        .join("");

    const canonicalQueryString = [...url.searchParams.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`)
        .join("&");

    const canonicalRequest = [
        opts.method,
        canonicalPath,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        await sha256(canonicalRequest),
    ].join("\n");

    const signingKey = await getSigningKey(opts.secretAccessKey, dateStamp, region, service);
    const signatureBuffer = await getHmacSha256(signingKey, stringToSign);
    const signature = bufferToHex(signatureBuffer);

    const authHeader = `AWS4-HMAC-SHA256 Credential=${opts.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
        url: url.toString(),
        headers: {
            ...headers,
            Authorization: authHeader,
        },
    };
}

// ── R2 Config Helper ──

function getR2Config() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const bucket = process.env.R2_BUCKET;

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
        throw new Error("R2 environment variables not configured");
    }

    return { accessKeyId, secretAccessKey, endpoint, bucket };
}

// ── Actions ──

/**
 * Clone a file from Convex storage to R2.
 * Called after a user uploads a file marked as "external".
 */
export const cloneToR2 = internalAction({
    args: {
        storageId: v.string(),
        r2Key: v.string(),
        contentType: v.optional(v.string()),
        fileName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const config = getR2Config();

        // 1. Read file blob from Convex storage
        const blob = await ctx.storage.get(args.storageId as any);
        if (!blob) throw new Error("File not found in Convex storage");

        // 2. Convert blob to ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();

        // 3. Sign and upload to R2
        const contentType = args.contentType || "application/octet-stream";
        const signed = await signS3Request({
            method: "PUT",
            endpoint: config.endpoint,
            bucket: config.bucket,
            key: args.r2Key,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            body: arrayBuffer,
            contentType,
            contentDisposition: args.fileName
                ? `attachment; filename="${args.fileName}"`
                : undefined,
        });

        const response = await fetch(signed.url, {
            method: "PUT",
            headers: signed.headers,
            body: arrayBuffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`R2 upload failed (${response.status}): ${errorText}`);
        }

        return args.r2Key;
    },
});

/**
 * Get a presigned download URL for an R2 object.
 * Uses query-string presigning (no request body).
 */
export const getR2DownloadUrl = internalAction({
    args: {
        r2Key: v.string(),
        expiresIn: v.optional(v.number()),
    },
    handler: async (_ctx, args) => {
        const config = getR2Config();
        const expiresIn = args.expiresIn || 900;

        const region = "auto";
        const service = "s3";
        const now = new Date();
        const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
        const amzDate = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

        const encodedKey = args.r2Key.split("/").map(s => encodeURIComponent(s)).join("/");
        const canonicalPath = `/${config.bucket}/${encodedKey}`;
        const url = new URL(`${config.endpoint}${canonicalPath}`);

        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const credential = `${config.accessKeyId}/${credentialScope}`;

        // Set presigning query params
        url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
        url.searchParams.set("X-Amz-Credential", credential);
        url.searchParams.set("X-Amz-Date", amzDate);
        url.searchParams.set("X-Amz-Expires", String(expiresIn));
        url.searchParams.set("X-Amz-SignedHeaders", "host");

        const host = url.host;

        const canonicalQueryString = [...url.searchParams.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, val]) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`)
            .join("&");

        const canonicalRequest = [
            "GET",
            canonicalPath,
            canonicalQueryString,
            `host:${host}\n`,
            "host",
            "UNSIGNED-PAYLOAD",
        ].join("\n");

        const stringToSign = [
            "AWS4-HMAC-SHA256",
            amzDate,
            credentialScope,
            await sha256(canonicalRequest),
        ].join("\n");

        const signingKey = await getSigningKey(config.secretAccessKey, dateStamp, region, service);
        const signatureBuffer = await getHmacSha256(signingKey, stringToSign);
        const signature = bufferToHex(signatureBuffer);

        url.searchParams.set("X-Amz-Signature", signature);

        return url.toString();
    },
});

/**
 * Delete an R2 object.
 */
export const deleteR2Object = internalAction({
    args: {
        r2Key: v.string(),
    },
    handler: async (_ctx, args) => {
        const config = getR2Config();

        const signed = await signS3Request({
            method: "DELETE",
            endpoint: config.endpoint,
            bucket: config.bucket,
            key: args.r2Key,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        });

        const response = await fetch(signed.url, {
            method: "DELETE",
            headers: signed.headers,
        });

        if (!response.ok && response.status !== 204) {
            const errorText = await response.text();
            throw new Error(`R2 delete failed (${response.status}): ${errorText}`);
        }
    },
});

/**
 * Check if R2 is configured.
 */
export const isR2Configured = action({
    args: {},
    handler: async () => {
        return !!(
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY &&
            process.env.R2_ENDPOINT &&
            process.env.R2_BUCKET
        );
    },
});
