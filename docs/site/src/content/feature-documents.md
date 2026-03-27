# Feature — Documents

## Overview

The document management system provides a rich-text editor (Tiptap/ProseMirror), file organization, versioning, sharing, and e-signature support.

## Components

- **`components/documents/DocsManager.tsx`** (46KB) — Document list, search, folder tree
- **`components/documents/TiptapEditor.tsx`** (61KB) — Full-featured rich text editor
- **`components/documents/ShareDialog.tsx`** (20KB) — Public sharing with expiry
- **`components/documents/SignatureSection.tsx`** / **`SignatureDialog.tsx`** — E-signature capture
- **`components/documents/FolderViz.tsx`** — Folder tree visualization
- **`components/editor/Toolbar.tsx`** (19KB) — Editor toolbar (bold, italic, headings, lists, tables, etc.)

## Convex Backend

- **`convex/documents.ts`** — Document metadata and content
- **`convex/tiptap.ts`** — ProseMirror real-time sync (collaborative editing)
- **`convex/shareLinks.ts`** — Public share link management

## AI Document Generation

```typescript
await ctx.runAction(api.aiModules.documentActions.generateDocument, {
  projectId,
  type: "nda",     // "nda" | "ip_assignment" | "services_agreement" | "one_pager"
})
```

The AI pulls venture data (name, description, team) and generates a formatted legal document.

## Tiptap Editor

The editor supports:
- Block content: headings, paragraphs, lists, tables, code blocks, blockquotes
- Inline: bold, italic, underline, strikethrough, highlight, link
- Embeds: images (R2), file attachments
- AI commands: `/ai` inline prompt, AI rewrite, summarize, expand
- Real-time collaboration via Convex (ProseMirror steps stored as Convex mutations)

## Sharing

Documents can be shared via a public link:

```typescript
const { shareId, url } = await ctx.runAction(api.shareLinks.create, {
  documentId,
  expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  allowDownload: true,
})
```

Share links are stored in `convex/shareLinks.ts` and validated on access.

## E-Signature

Documents can collect signatures from external parties:

1. Owner sends signature request (email via Resend)
2. Recipient opens a public link → signs in a canvas
3. Signature is stored as a PNG in R2
4. Document status updated to "signed"
