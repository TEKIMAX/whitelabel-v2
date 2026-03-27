import React from 'react';
import { ArrowRight, MessageSquare, Zap, Layers, Sparkles } from 'lucide-react';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { ViewState, StartupData } from '../../types';

interface ChatHomeProps {
    onStartChat: () => void;
    allProjects?: StartupData[];
    currentProjectId?: string | null;
    onSwitchProject?: (id: string) => void;
    onNewProject?: () => void;
    currentView?: ViewState;
    onNavigate?: (view: ViewState) => void;
    allowedPages?: any[];
}

const ChatHome: React.FC<ChatHomeProps> = ({
    onStartChat,
    allProjects,
    currentProjectId,
    onSwitchProject,
    onNewProject,
    currentView,
    onNavigate,
    allowedPages
}) => {
    return (
        <div className="h-[100vh] bg-nobel-cream canvas-pattern flex flex-col relative overflow-hidden" style={{ backgroundSize: '24px 24px' }}>
            {/* Nav */}
            <nav className="px-6 py-3 flex justify-between items-center z-50 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-stone-200 shrink-0">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView || 'AI_ASSISTANT' as ViewState}
                        onNavigate={onNavigate || (() => { })}
                        allowedPages={allowedPages}
                    />
                </div>
            </nav>

            {/* Main Content - Split Layout */}
            <main className="flex-1 flex w-full relative">
                {/* Left Column: Image (Tilted Card Style) */}
                <div className="w-1/2 relative h-full hidden lg:flex items-center justify-center p-12">
                    <div className="relative w-full max-w-lg aspect-[3/4] group">

                        <img
                            src="/images/chat.png"
                            alt="AI Assistant Preview"
                            className="relative w-full h-full object-cover rounded-[2rem] border-[8px] border-white shadow-2xl transform -rotate-2 group-hover:rotate-0 transition-transform duration-700 ease-out"
                        />
                    </div>
                </div>

                {/* Right Column: Text (Centered) */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-12 lg:p-16 bg-transparent overflow-y-auto">
                    <div className="max-w-xl w-full animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold border border-nobel-gold text-nobel-gold rounded-full bg-nobel-gold/5">
                                AI Assistant
                            </span>
                        </div>

                        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.1] mb-6 text-nobel-dark">
                            Real-time <br />
                            <span className="italic text-nobel-gold">Venture</span> <br />
                            Audit.
                        </h1>

                        <p className="font-sans text-lg md:text-xl text-nobel-dim leading-relaxed mb-10 border-l-2 border-nobel-gold/30 pl-6">
                            Beyond conversation, it performs a Continuous Audit. It monitors for strategic drift, identifies logical gaps, and flags deviations from your core business objectives in real-time.
                        </p>

                        <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
                            <button
                                onClick={onStartChat}
                                className="group relative w-full sm:w-auto px-8 py-4 bg-nobel-dark text-white font-medium tracking-wide shadow-xl hover:bg-nobel-gold transition-all duration-300 overflow-hidden flex items-center justify-center gap-3 rounded-full"
                            >
                                <span className="relative z-10 whitespace-nowrap">Start Chatting</span>
                                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 md:gap-8 border-t border-nobel-dark/10 pt-8">
                            <div className="flex flex-col gap-1">
                                <Layers size={20} className="text-nobel-gold mb-1" strokeWidth={1.5} />
                                <span className="font-serif text-lg font-bold text-nobel-dark">Context</span>
                                <span className="text-[10px] text-nobel-dim uppercase tracking-wider">Aware</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Sparkles size={20} className="text-nobel-gold mb-1" strokeWidth={1.5} />
                                <span className="font-serif text-lg font-bold text-nobel-dark">Generative</span>
                                <span className="text-[10px] text-nobel-dim uppercase tracking-wider">Multimedia</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Zap size={20} className="text-nobel-gold mb-1" strokeWidth={1.5} />
                                <span className="font-serif text-lg font-bold text-nobel-dark">Strategy</span>
                                <span className="text-[10px] text-nobel-dim uppercase tracking-wider">Engine</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatHome;
