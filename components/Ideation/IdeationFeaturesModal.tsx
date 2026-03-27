import React from 'react';
import { X, Users, Zap, Layout, Share2, MessageSquare } from 'lucide-react';

interface IdeationFeaturesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const IdeationFeaturesModal: React.FC<IdeationFeaturesModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-stone-100 relative animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col md:flex-row">
                    {/* Left: Hero/Image Section */}
                    <div className="w-full md:w-2/5 bg-stone-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:20px_20px] opacity-10"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-nobel-gold/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-nobel-gold text-xs font-bold uppercase tracking-widest mb-6">
                                <Zap className="w-3 h-3 fill-current" />
                                Interactive Canvas
                            </div>
                            <h2 className="font-serif text-3xl md:text-4xl font-bold leading-tight mb-4">
                                Where great teams <br />
                                <span className="text-nobel-gold italic">spark ideas.</span>
                            </h2>
                            <p className="text-stone-400 text-sm leading-relaxed">
                                Don't let your best insights get lost in the noise. Collaborate in real-time, map out complex flows, and turn brainstorming into actionable strategy.
                            </p>
                        </div>

                        <div className="relative z-10 mt-12">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-stone-900 bg-stone-800 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                        {{ 1: 'JD', 2: 'AS', 3: 'MK', 4: 'ER' }[i]}
                                    </div>
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-stone-900 bg-nobel-gold flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                    +5
                                </div>
                            </div>
                            <div className="mt-3 text-xs font-bold text-nobel-gold uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Live Collaboration
                            </div>
                        </div>
                    </div>

                    {/* Right: Features Grid */}
                    <div className="w-full md:w-3/5 p-10 bg-white">
                        <div className="grid grid-cols-1 gap-8">
                            <Feature
                                icon={<Layout className="w-5 h-5 text-nobel-gold" />}
                                title="Infinite Whiteboard"
                                desc="A boundless canvas for your boundless ideas. Drag, drop, connect, and organize sticky notes, diagrams, and media without limits."
                            />
                            <Feature
                                icon={<Users className="w-5 h-5 text-nobel-gold" />}
                                title="Real-time Multiplayer"
                                desc="Work together as if you're in the same room. See cursors, edits, and updates instantly. Built for remote teams who move fast."
                            />
                            <Feature
                                icon={<Share2 className="w-5 h-5 text-nobel-gold" />}
                                title="Brainstorm & Critic"
                                desc="Use reactions, comments, and voting to filter the best ideas from the noise. Democratize decision making."
                            />
                            <Feature
                                icon={<MessageSquare className="w-5 h-5 text-nobel-gold" />}
                                title="Contextual Threads"
                                desc="Keep discussions right where the work happens. Resolve threads and turn comments into tasks instantly."
                            />
                        </div>

                        <div className="mt-10 pt-8 border-t border-stone-100 flex justify-between items-center">
                            <p className="text-xs text-stone-500 font-medium">
                                Included in Adaptive Startup Pro
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-stone-900 text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-lg"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Feature = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-stone-900 text-lg mb-1">{title}</h4>
            <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
        </div>
    </div>
);
