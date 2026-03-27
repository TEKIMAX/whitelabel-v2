import React from 'react';
import { Logo } from '../Logo';
import { Zap, Layout, Users, Share2, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

interface IdeationFeaturesPageProps {
    onLogin: () => void;
}

export const IdeationFeaturesPage: React.FC<IdeationFeaturesPageProps> = ({ onLogin }) => {
    return (
        <div className="min-h-screen bg-[#F9F8F4] font-sans text-stone-900 selection:bg-nobel-gold selection:text-white overflow-x-hidden">
            {/* --- NAVIGATION BAR --- */}
            <nav className="flex justify-between items-center px-6 md:px-12 py-6 bg-white border-b border-stone-200">
                <a href="/" className="flex items-center gap-3">

                </a>
                <div className="flex items-center gap-4">
                    <a href="/" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors hidden md:block">Back to Home</a>
                    <button onClick={onLogin} className="px-5 py-2.5 bg-stone-900 text-white rounded-full text-sm font-bold hover:bg-nobel-gold transition-colors">
                        Sign In
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="relative w-full py-24 px-6 md:px-12 bg-stone-900 text-white overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nobel-gold/20 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-nobel-gold text-xs font-bold uppercase tracking-widest mb-8">
                        <Zap className="w-3 h-3 fill-current" />
                        Interactive Canvas
                    </div>
                    <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-8">
                        Where great teams <br />
                        <span className="text-nobel-gold italic">spark ideas.</span>
                    </h1>
                    <p className="text-stone-400 text-xl leading-relaxed max-w-2xl mx-auto mb-12">
                        Don't let your best insights get lost in the noise. Collaborate in real-time, map out complex flows, and turn brainstorming into actionable strategy.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <button
                            onClick={onLogin}
                            className="px-8 py-4 bg-white text-stone-900 rounded-full font-bold uppercase tracking-widest hover:bg-nobel-gold hover:text-white transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3"
                        >
                            Start Ideating
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 text-stone-500 text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live Collaboration
                        </div>
                    </div>
                </div>

                {/* Hero Image/Preview */}
                <div className="mt-16 max-w-6xl mx-auto relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
                    <img src="/images/hero-carousel-2.png" alt="Ideation Workspace" className="w-full h-auto object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent"></div>
                </div>
            </header>

            {/* --- FEATURES GRID --- */}
            <section className="py-24 px-6 md:px-12 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <FeatureCardLarge
                            icon={<Layout className="w-8 h-8 text-nobel-gold" />}
                            title="Infinite Whiteboard"
                            desc="A boundless canvas for your boundless ideas. Drag, drop, connect, and organize sticky notes, diagrams, and media without limits. Whether you're mapping a user journey or brainstorming features, space is never an issue."
                        />
                        <FeatureCardLarge
                            icon={<Users className="w-8 h-8 text-nobel-gold" />}
                            title="Real-time Multiplayer"
                            desc="Work together as if you're in the same room. See cursors, edits, and updates instantly. Built for remote teams who move fast and need to stay aligned without constant meetings."
                        />
                        <FeatureCardLarge
                            icon={<Share2 className="w-8 h-8 text-nobel-gold" />}
                            title="Brainstorm & Critique"
                            desc="Use reactions, comments, and voting to filter the best ideas from the noise. Democratize decision making and ensure the best ideas win, regardless of who came up with them."
                        />
                        <FeatureCardLarge
                            icon={<MessageSquare className="w-8 h-8 text-nobel-gold" />}
                            title="Contextual Threads"
                            desc="Keep discussions right where the work happens. Resolve threads and turn comments into tasks instantly. No more context switching between your canvas and Slack."
                        />
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-24 px-6 md:px-12 bg-[#F5F4F0] border-t border-stone-200">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="font-serif text-4xl md:text-5xl text-stone-900 mb-6">Ready to innovate?</h2>
                    <p className="text-lg text-stone-500 mb-10">Join thousands of founders who use Adaptive Startup to turn their ideas into reality.</p>
                    <button
                        onClick={onLogin}
                        className="px-10 py-5 bg-stone-900 text-white rounded-full font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-xl"
                    >
                        Get Started for Free
                    </button>
                    <div className="mt-8 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 text-nobel-gold" />
                            No credit card required
                        </div>
                        <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 text-nobel-gold" />
                            Unlimited collaborators
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-white py-12 border-t border-stone-100 flex flex-col items-start px-6 md:px-12 gap-4">
                <p className="text-stone-400 text-sm">© {new Date().getFullYear()} Adaptive Startup. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FeatureCardLarge = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex flex-col items-start">
        <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center mb-6 shadow-sm">
            {icon}
        </div>
        <h3 className="font-serif text-3xl font-bold text-stone-900 mb-4">{title}</h3>
        <p className="text-stone-500 text-lg leading-relaxed">{desc}</p>
    </div>
);
