import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

export const getRssFeed = httpAction(async (ctx) => {
    const posts = await ctx.runQuery(api.blog.listPublicPosts, {});
    const siteUrl = process.env.SITE_URL || "https://founderstack.io";

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
 <title>FounderStack Blog</title>
 <description>Insights for Founders</description>
 <link>${siteUrl}</link>
 <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
 ${posts
            .map(
                (post: any) => `
   <item>
    <title>${escapeXml(post.title)}</title>
    <description>${escapeXml(post.description || "")}</description>
    <link>${siteUrl}/blog/${post.slug}</link>
    <guid>${siteUrl}/blog/${post.slug}</guid>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
   </item>
 `,
            )
            .join("")}
</channel>
</rss>`;

    return new Response(rss, {
        headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
        },
    });
});

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
            default:
                return c;
        }
    });
}
