# Convex — Files & Storage

## Overview

File storage uses **Cloudflare R2** (S3-compatible object storage) integrated with Convex for metadata management.

## Files

| File | Purpose |
|---|---|
| `convex/files.ts` | File metadata CRUD |
| `convex/filesControl.ts` | Access control for files |
| `convex/fileSigning.ts` | Signed URL generation |
| `convex/r2.ts` | R2 client, upload/download |
| `convex/storageQuota.ts` | Per-org storage limits |
| `convex/storageReporter.ts` | Usage reporting |

## Upload Flow

```
User selects a file
  └─► React requests a signed upload URL
        └─► ctx.runAction(api.files.getUploadUrl, { filename, contentType })
              └─► R2: generates presigned PUT URL (expires in 15 min)
  └─► React uploads directly to R2 via PUT (no server proxy)
  └─► React notifies Convex of completed upload
        └─► ctx.runMutation(api.files.confirmUpload, { fileId, r2Key })
              └─► Updates file record status to "uploaded"
```

## Download / Access

Files are served via signed read URLs:

```typescript
const { url } = await ctx.runAction(api.files.getDownloadUrl, { fileId })
// URL valid for 1 hour
```

Access control is enforced in `filesControl.ts` — only members of the venture can access its files.

## Storage Quotas

Per-org storage limits are enforced in `storageQuota.ts`:

```typescript
const quota = await ctx.db
  .query("storage_quotas")
  .withIndex("by_org", q => q.eq("orgId", orgId))
  .first()

if (quota.usedBytes + fileSize > quota.limitBytes) {
  throw new Error("Storage quota exceeded")
}
```

Quotas are defined by the subscription plan (via entitlements).

## Environment Variables Required

| Convex Env Var | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for the bucket |
