import { exposeUploadApi } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

// These are INTERNAL functions - only callable via `npx convex run` from the Go Provisioner
export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } =
  exposeUploadApi((components as any).selfHosting);
