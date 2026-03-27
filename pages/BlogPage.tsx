import React, { useState, useMemo } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ArrowRight, Filter, Search, Twitter, Linkedin, Facebook } from 'lucide-react';
import { format } from 'date-fns';
import { Helmet as BaseHelmet } from 'react-helmet-async';
const Helmet = BaseHelmet as any;

interface BlogPageProps {
    onLogin?: () => void;
    onNavigateHome: () => void;
    projectSlug?: string;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onLogin, onNavigateHome, projectSlug }) => {
    // Determine if we are in "global" mode or "project" mode
    // Ideally, getPublicBySlug would return the project ID to then fetch posts, 
    // OR listPublicPosts adapts to slug. Assuming listPublicPosts adapts as implemented before.
    const project = useQuery(api.projects.getPublicBySlug, projectSlug ? { slug: projectSlug } : "skip");
    const posts = useQuery(api.blog.listPublicPosts, projectSlug ? { projectSlug } : {});

    const settings = project?.blogSettings;

    // Theme Defaults
    const sidebarBg = settings?.themeColor || '#000000';
    const sidebarText = settings?.sidebarTextColor || '#ffffff';

    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    // Extract categories
    const categories = useMemo(() => {
        if (!posts) return ["All"];
        const cats = new Set(posts.map(p => (p as any).category || "Uncategorized"));
        return ["All", ...Array.from(cats)];
    }, [posts]);

    // Filter posts
    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        if (selectedCategory === "All") return posts;
        return posts.filter(p => ((p as any).category || "Uncategorized") === selectedCategory);
    }, [posts, selectedCategory]);

    const isProjectBlog = !!projectSlug && !!project;

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans selection:bg-nobel-gold/20 selection:text-nobel-dark">
            <Helmet>
                <title>{settings?.title || "Wiki | Adaptive Startup"}</title>
                <meta name="description" content={settings?.description || "Insights, guides, and engineering updates."} />
            </Helmet>

            {/* Global Nav (Only if NOT a project blog) */}
            {!isProjectBlog && (
                <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
                    <div className="w-full px-6 h-16 flex items-center justify-between">
                        <a href="/" className="text-nobel-gold font-serif font-bold text-xl tracking-tight">
                            Adaptive Startup
                        </a>
                        <div className="flex items-center gap-6">
                            <a href="/" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
                                Home
                            </a>
                            {onLogin && (
                                <button onClick={onLogin} className="text-sm font-medium text-black hover:text-nobel-gold transition-colors">
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>
                </nav>
            )}

            <div className={`flex min-h-screen ${!isProjectBlog ? 'pt-16' : ''}`}>

                {/* Custom Sidebar */}
                <aside
                    className="hidden md:flex w-[25%] lg:w-[20%] fixed h-screen top-0 left-0 flex-col justify-between overflow-y-auto z-[60] transition-colors duration-300 pointer-events-auto"
                    style={{ backgroundColor: isProjectBlog ? sidebarBg : '#ffffff', color: isProjectBlog ? sidebarText : '#111827' }}
                >
                    <div className="p-8 md:p-10">
                        {/* Header Image / Logo */}
                        {isProjectBlog && settings?.coverImage && (
                            <div className="mb-6 w-full flex justify-start">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm ring-2 ring-white/10 bg-white/5 flex items-center justify-center">
                                    <img src={settings.coverImage} alt="Logo" className="w-full h-full object-contain p-2" />
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        <div className={`h-px w-full mb-8 ${isProjectBlog ? 'bg-white/20' : 'bg-gray-200'}`}></div>

                        {/* Categories */}
                        <div className="space-y-4">
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isProjectBlog ? 'opacity-50' : 'text-gray-400'}`}>
                                Topics
                            </h3>
                            <div className="flex flex-col gap-2">
                                {categories.map((cat: string) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`text-left text-sm font-medium py-2 px-3 -ml-3 rounded-lg transition-colors flex items-center justify-between group ${selectedCategory === cat
                                            ? (isProjectBlog ? 'bg-white/10' : 'bg-gray-100 text-black')
                                            : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        {cat}
                                        {selectedCategory === cat && <ArrowRight className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Area */}
                    <div className="p-8 md:p-10 mt-auto">
                        <div className={`h-px w-full mb-6 ${isProjectBlog ? 'bg-white/20' : 'bg-gray-100'}`}></div>
                        <div className={`text-xs ${isProjectBlog ? 'opacity-60' : 'text-gray-400'}`}>
                            &copy; {new Date().getFullYear()} {isProjectBlog ? (project?.name || "Organization") : "Adaptive Startup"}.
                        </div>
                        <div className={`mt-2 text-[10px] uppercase tracking-wider font-bold ${isProjectBlog ? 'opacity-40' : 'text-gray-300'}`}>
                            Powered by <a href="/" className="hover:underline">Adaptive Startup</a>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={`flex-1 md:ml-[25%] lg:ml-[20%] w-full transition-all duration-300 ${isProjectBlog ? 'bg-white' : 'bg-gray-50/50'}`}>
                    {/* Mobile Header */}
                    <div
                        className="md:hidden p-8 pb-12"
                        style={{ backgroundColor: isProjectBlog ? sidebarBg : '#ffffff', color: isProjectBlog ? sidebarText : '#111827' }}
                    >
                        {isProjectBlog && settings?.coverImage && (
                            <div className="w-12 h-12 rounded-xl mb-6 shadow-sm bg-black/5 flex items-center justify-center overflow-hidden">
                                <img src={settings.coverImage} alt="Logo" className="w-full h-full object-contain p-1" />
                            </div>
                        )}
                        <h1 className="text-3xl font-black font-serif mb-2">
                            {isProjectBlog ? (settings?.title || project?.name) : "Wiki"}
                        </h1>
                        <p className={`text-sm mb-6 ${isProjectBlog ? 'opacity-80' : 'text-gray-500'}`}>
                            {isProjectBlog ? (settings?.description || "Welcome to our blog.") : "Insights and updates."}
                        </p>

                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className={`w-full appearance-none py-3 px-4 rounded-lg leading-tight focus:outline-none text-sm font-bold border ${isProjectBlog
                                ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:bg-white/20'
                                : 'bg-white border-gray-200 text-gray-700'
                                }`}
                        >
                            {categories.map((cat: string) => (
                                <option key={cat} value={cat} className="text-black">
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto min-h-screen">

                        {/* Feed Header / Title & Description */}
                        <div className="mb-12 md:mb-16">
                            <h1 className="text-4xl md:text-6xl font-black font-serif mb-4 leading-tight tracking-tight text-gray-900">
                                {isProjectBlog ? (settings?.title || project?.name) : "Wiki"}
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
                                {isProjectBlog ? (settings?.description || "Welcome to our blog.") : "Insights and updates."}
                            </p>
                        </div>

                        {posts === undefined ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="aspect-[4/3] bg-gray-100 rounded-2xl mb-4"></div>
                                        <div className="h-4 bg-gray-100 w-1/3 rounded mb-2"></div>
                                        <div className="h-8 bg-gray-100 w-3/4 rounded mb-2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Search className="w-6 h-6 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">No stories found</h3>
                                <p className="text-gray-500 mt-1 max-w-xs mx-auto">
                                    We couldn't find any posts in this category. Try selecting another one.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                                {filteredPosts.map(post => {
                                    const postUrl = isProjectBlog && projectSlug ? `/p/${projectSlug}/blog/${post.slug}` : `/blog/${post.slug}`;

                                    return (
                                        <article key={post.slug} className="group flex flex-col items-start">
                                            <a href={postUrl} className="w-full aspect-[16/10] overflow-hidden rounded-2xl bg-gray-100 mb-6 relative">
                                                {post.coverImage ? (
                                                    <img
                                                        src={post.coverImage}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                        <span className="text-4xl font-serif font-black opacity-10">Use Image</span>
                                                    </div>
                                                )}
                                                {(post as any).category && (
                                                    <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">
                                                        {(post as any).category}
                                                    </span>
                                                )}
                                            </a>

                                            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                                <time>{format(new Date(post.date), 'MMMM d, yyyy')}</time>
                                                {post.readTime && (
                                                    <>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <span>{post.readTime}</span>
                                                    </>
                                                )}
                                            </div>

                                            <h2 className="text-2xl font-bold font-serif text-gray-900 mb-3 group-hover:text-gray-600 transition-colors leading-tight">
                                                <a href={postUrl}>
                                                    {post.title}
                                                </a>
                                            </h2>

                                            <p className="text-gray-500 leading-relaxed line-clamp-3 mb-4">
                                                {post.description}
                                            </p>

                                            <div className="mt-auto flex items-center gap-3">
                                                {/* Author */}
                                                {(post as any).author && (
                                                    <div className="flex items-center gap-2">
                                                        {(post as any).author.pictureUrl ? (
                                                            <img
                                                                src={(post as any).author.pictureUrl}
                                                                className="w-6 h-6 rounded-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                                {(post as any).author.name?.[0] || 'A'}
                                                            </div>
                                                        )}
                                                        <span className="text-xs font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                                                            {(post as any).author.name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}


                    </div>
                </main>
            </div>
            {/* Fixed Bottom Right Footer */}
            <div className="fixed bottom-6 right-8 z-[60] text-right">
                <div className="mt-24 pt-12 border-t border-gray-100 text-center">
                    <a
                        href={onLogin ? "https://adaptivestartup.io" : "/"} // Assuming landing link if public
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 hover:bg-black hover:text-white transition-colors"
                    >
                        <span className="font-serif font-bold text-xl">P</span>
                    </a>
                </div>
            </div>

        </div>
    );
};
