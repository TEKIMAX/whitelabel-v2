import React, { useState } from 'react';
import { ArrowRight, FileText, Layout, Shield, Zap, PenTool, Sparkles } from 'lucide-react';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { ViewState, StartupData } from '../../types';
import { usePresence } from '../../hooks/usePresence';

interface HeroSectionProps {
    onOpenDocs: () => void;
    allProjects?: StartupData[];
    currentProjectId?: string | null;
    onSwitchProject?: (id: string) => void;
    onNewProject?: () => void;
    currentView?: ViewState;
    onNavigate?: (view: ViewState) => void;
    allowedPages?: string[];
    projectFeatures?: {
        canvasEnabled?: boolean;
        marketResearchEnabled?: boolean;
    };
    uniqueTags?: { name: string; color: string }[];
}

const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
const getRandomColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};


export const HeroSection: React.FC<HeroSectionProps> = ({
    onOpenDocs,
    allProjects,
    currentProjectId,
    onSwitchProject,
    onNewProject,
    currentView,
    onNavigate,
    allowedPages,
    projectFeatures,
    uniqueTags = []
}) => {
    const currentProject = allProjects?.find(p => p.id === currentProjectId);

    return (
        <div className="h-[110vh] bg-nobel-cream canvas-pattern flex flex-col relative overflow-hidden" style={{ backgroundSize: '24px 24px' }}>
            {/* Nav */}
            <nav className="px-6 py-3 flex justify-between items-center z-50 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-stone-200 shrink-0">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView || 'LEGAL'}
                        onNavigate={onNavigate || (() => { })}
                        allowedPages={allowedPages}
                        projectFeatures={projectFeatures}
                    />
                </div>
                <div className="flex items-center gap-4">
                    {/* Presence Stack Removed */}
                </div>
            </nav>

            {/* Main Content - Split Layout */}
            <main className="flex-1 flex w-full relative">
                {/* Left Column: Image (Full Height) */}
                <div className="w-1/2 relative h-full hidden lg:block">
                    <img
                        src="/images/hero-carousel-5.png"
                        alt="Document Management Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-nobel-dark/10 mix-blend-overlay"></div>
                </div>

                {/* Right Column: Text (Centered) */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-12 lg:p-16 bg-transparent overflow-y-auto">
                    <div className="max-w-xl w-full animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold border border-nobel-gold text-nobel-gold rounded-full bg-nobel-gold/5">
                                Documents
                            </span>
                        </div>

                        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] mb-6 text-nobel-dark">
                            Intelligent <br />
                            <span className="italic text-nobel-gold">Document</span> <br />
                            Management.
                        </h1>

                        <p className="font-sans text-lg md:text-xl text-nobel-dim leading-relaxed mb-10 border-l-2 border-nobel-gold/30 pl-6">
                            Seamlessly organize contracts and technical guides. Our embedded editor provides a secure, unified environment for your entire infrastructure's knowledge base.
                        </p>

                        <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
                            <button
                                onClick={onOpenDocs}
                                className="group relative w-full sm:w-auto px-8 py-4 bg-nobel-dark text-white font-medium tracking-wide shadow-xl hover:bg-nobel-gold transition-all duration-300 overflow-hidden flex items-center justify-center gap-3 rounded-full"
                            >
                                <span className="relative z-10 whitespace-nowrap">Open Documentation</span>
                                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="grid grid-cols-5 gap-3 border-t border-nobel-dark/10 pt-8">
                            {uniqueTags && uniqueTags.length > 0 ? (
                                uniqueTags.slice(0, 16).map((tag, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border"
                                        style={{
                                            backgroundColor: tag.color + '15',
                                            color: tag.color,
                                            borderColor: tag.color + '40'
                                        }}
                                    >
                                        {tag.name}
                                    </div>
                                ))
                            ) : (
                                <p className="col-span-5 text-center text-nobel-dim text-sm italic py-2">Start adding tags to your documents to see them here.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};