import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import BlogPost from "./Blog/BlogPost";
import CopyPageDropdown from "./Blog/CopyPageDropdown";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Link as LinkIcon, Twitter, Rss, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeProvider } from "./ThemeContext";
import "./Blog/blog.css";

// Site configuration
const SITE_URL = "https://founderstack.io";
const SITE_NAME = "FounderStack Blog";
const DEFAULT_OG_IMAGE = "/images/og-default.svg";

interface BlogDetailPageProps {
    onLogin?: () => void;
    onNavigateHome: () => void;
    onNavigateToBlog: () => void;
    postId: string; // This is actually the SLUG from URL regex capture
    projectSlug?: string;
}

export function BlogDetailPage({ onNavigateHome, onNavigateToBlog, postId, projectSlug }: BlogDetailPageProps) {
    // Use slug directly
    const slug = postId;
    const { isAuthenticated } = useConvexAuth();

    // Check for page first, then post
    // Try to load as a static page first
    const page = useQuery(api.blog_pages.getPageBySlug, slug ? { slug } : "skip");

    // Post fetching logic:
    // If authenticated, we try to fetch via authorized query (allows internal/drafts depending on logic, but currently logic allows internal)
    // If unauthenticated, public query only.
    const publicPost = useQuery(api.blog.getPublicPost, !isAuthenticated && slug ? { slug } : "skip");
    const authPost = useQuery(api.blog.getAuthorizedPost, isAuthenticated && slug ? { slug } : "skip");

    // Determine which post result to use
    // Note: useQuery returns undefined while loading, null if not found (from our handler logic).
    const post = isAuthenticated ? authPost : publicPost;

    const [copied, setCopied] = useState(false);

    // Update page title for static pages or posts
    useEffect(() => {
        if (page) {
            document.title = `${page.title} | ${SITE_NAME}`;
        } else if (post) {
            document.title = `${post.title} | ${SITE_NAME}`;
        }
        return () => {
            // document.title = SITE_NAME; // Optional reset
        };
    }, [page, post]);

    // Return null during initial load to avoid flash
    if (page === undefined && post === undefined) {
        return null; // Loading
    }

    // Handle not found (neither page nor post loaded)
    if (page === null && post === null) {
        return (
            <div className="blog-container">
                <div className="layout">
                    <main className="main-content">
                        <div className="post-page">
                            <div className="post-not-found">
                                <h1>Page not found</h1>
                                <p>The page you're looking for doesn't exist or has been removed.</p>
                                <button onClick={onNavigateToBlog} className="back-button">
                                    <ArrowLeft size={16} />
                                    Back to blog
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const handleCopyLink = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareTwitter = () => {
        if (!post) return;
        const text = encodeURIComponent(post.title);
        const url = encodeURIComponent(window.location.href);
        window.open(
            `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
            "_blank",
        );
    };

    const content = page || post;
    if (!content) return null;

    return (
        <ThemeProvider>
            <div className="blog-container">
                <div className="layout">
                    <main className="main-content">
                        <div className="post-page">
                            <nav className="post-nav">
                                <div className="flex items-center gap-4">
                                    {projectSlug ? (
                                        <a href={`/p/${projectSlug}/blog`} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-sm hover:shadow-md text-sm font-medium" title="Back to Blog">
                                            <ArrowLeft size={16} />
                                            <span>Back</span>
                                        </a>
                                    ) : (
                                        <button onClick={onNavigateToBlog} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-sm hover:shadow-md text-sm font-medium" title="Back to Blog">
                                            <ArrowLeft size={16} />
                                            <span>Back</span>
                                        </button>
                                    )}
                                </div>
                                {/* Copy page dropdown for sharing */}
                                <CopyPageDropdown
                                    title={content.title}
                                    content={content.content}
                                    url={window.location.href}
                                />
                            </nav>

                            <article className="post-article">
                                {/* New Header Design with Cover Image Overlay */}
                                <header className="relative w-full h-[400px] rounded-2xl overflow-hidden mb-12 shadow-lg group">
                                    {/* Cover Image */}
                                    <img
                                        src={(post as any)?.coverImage || '/images/placeholder-blog.jpg'}
                                        alt={content.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 text-white">
                                        <h1 className="text-3xl md:text-5xl font-black font-serif mb-4 leading-tight tracking-tight drop-shadow-md">
                                            {content.title}
                                        </h1>

                                        {post && post.description && (
                                            <p className="text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed mb-6 drop-shadow-sm font-medium">
                                                {post.description}
                                            </p>
                                        )}

                                        {/* Author & Meta */}
                                        {post && (
                                            <div className="flex items-center gap-4 text-white/80 text-sm font-medium">
                                                {(post as any).author && (
                                                    <div className="flex items-center gap-2">
                                                        {(post as any).author.pictureUrl ? (
                                                            <img
                                                                src={(post as any).author.pictureUrl}
                                                                alt={(post as any).author.name}
                                                                className="w-8 h-8 rounded-full border border-white/30 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                                                {(post as any).author.name?.[0] || 'A'}
                                                            </div>
                                                        )}
                                                        <span>{(post as any).author.name}</span>
                                                    </div>
                                                )}

                                                <span>·</span>

                                                <time>
                                                    {format(parseISO(post.date), "MMMM yyyy")}
                                                </time>

                                                {post.readTime && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{post.readTime}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </header>

                                <BlogPost content={content.content} />

                                {post && (
                                    <footer className="post-footer">
                                        <div className="post-share">
                                            <button
                                                onClick={handleCopyLink}
                                                className="share-button"
                                                aria-label="Copy link"
                                            >
                                                <LinkIcon size={16} />
                                                <span>{copied ? "Copied!" : "Copy link"}</span>
                                            </button>
                                            <button
                                                onClick={handleShareTwitter}
                                                className="share-button"
                                                aria-label="Share on Twitter"
                                            >
                                                <Twitter size={16} />
                                                <span>Tweet</span>
                                            </button>
                                            <a
                                                href={SITE_URL} // Redirect to website
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="share-button"
                                                aria-label="Website" // Renamed from RSS
                                            >
                                                <Rss size={16} />
                                                <span>Website</span>
                                            </a>
                                        </div>

                                        {post.tags && post.tags.length > 0 && (
                                            <div className="post-tags">
                                                {post.tags.map((tag) => (
                                                    <span key={tag} className="post-tag">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </footer>
                                )}
                            </article>
                        </div>
                    </main>
                </div>
            </div>
        </ThemeProvider>
    );
}
