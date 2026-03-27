
import React, { useState } from 'react';
import {
    Brain,
    Activity,
    GitCommit,
    Network,
    Menu,
    X,
    ChevronRight,
    Loader2,
    Check
} from 'lucide-react';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { ViewState } from '../../types';
import { useMutation, useQuery } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { toast } from 'sonner';

interface AdaptiveLearningHomeProps {
    orgId: string;
    projectId?: string;
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    allowedPages?: string[];
    currentUserRole?: string;
    projectFeatures?: {
        canvasEnabled?: boolean;
        marketResearchEnabled?: boolean;
    };
    allProjects?: { id: string; name: string }[];
    onSwitchProject?: (projectId: string) => void;
    onNewProject?: () => void;
    userId?: string;
    userName?: string;
    userEmail?: string;
}

export const AdaptiveLearningHome: React.FC<AdaptiveLearningHomeProps> = ({
    orgId,
    projectId,
    currentView,
    onNavigate,
    allowedPages,
    currentUserRole,
    projectFeatures,
    allProjects,
    onSwitchProject,
    onNewProject,
    userId,
    userName = "Researcher",
    userEmail
}) => {
    // Determine the name to display (first name only for style)
    const firstName = userName ? userName.split(' ')[0] : "Researcher";
    const displayName = firstName === "User" ? "Researcher" : firstName;

    // const joinWaitlist = useMutation(api.adaptive_learning.public.joinWaitlist);
    // const isWaitlisted = useQuery(api.adaptive_learning.public.getWaitlistStatus, userId ? { userId } : "skip");
    const joinWaitlist = async (args: any) => { };
    const isWaitlisted = false;

    const [isJoining, setIsJoining] = useState(false);

    const handleJoinWaitlist = async () => {
        if (!userId || !userEmail) return;
        setIsJoining(true);
        try {
            await joinWaitlist({
                userId,
                name: userName,
                email: userEmail,
                interest: "Adaptive Learning Feature"
            });
            toast.success("You've joined the waitlist!");
        } catch (e) {
            toast.error("Failed to join waitlist.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] animate-in fade-in duration-700 font-sans text-stone-900">
            {/* Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    {allProjects && onSwitchProject && onNewProject && (
                        <>
                            <div className="h-6 w-px bg-stone-200" />
                        </>
                    )}
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        currentUserRole={currentUserRole}
                        projectFeatures={projectFeatures}
                    />
                </div>
            </header>

            <main className="flex-grow p-8 lg:p-12 flex flex-col">
                <div className="max-w-6xl mx-auto w-full space-y-12">

                    {/* Dashboard Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4 max-w-2xl">
                            <div className="text-xs font-bold tracking-[0.2em] text-[#C5A059] uppercase flex items-center gap-2">
                                <Activity className="w-3 h-3 animate-pulse" />
                                Adaptive Learning Module
                            </div>
                            <h1 className="text-4xl md:text-5xl font-serif text-[#1e293b] tracking-tight leading-tight">
                                Building your <span className="italic font-light text-[#C5A059]">Personal Learning Architecture.</span>
                            </h1>
                            <p className="text-stone-500 leading-relaxed font-light text-lg">
                                We are currently building the learning module. This system analyzes your adaptability to new material and progress, tailoring the experience to your unique profile.
                            </p>

                            <div className="pt-2">
                                <button
                                    onClick={handleJoinWaitlist}
                                    disabled={isWaitlisted || isJoining || !userId}
                                    className={`
                                        px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all shadow-lg flex items-center gap-3
                                        ${isWaitlisted
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                                            : 'bg-[#1e293b] text-white hover:bg-[#C5A059] hover:text-white'
                                        }
                                    `}
                                >
                                    {isJoining ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                                    ) : isWaitlisted ? (
                                        <><Check className="w-4 h-4" /> You're on the list!</>
                                    ) : (
                                        <>Join the Waitlist <ChevronRight className="w-4 h-4" /></>
                                    )}
                                </button>
                                {!userId && <p className="text-[10px] text-red-400 mt-2 font-bold uppercase tracking-wider">Please sign in to join.</p>}
                            </div>
                        </div>

                        <div className="bg-white border border-stone-200 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-sm self-start md:self-end mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                            <span className="text-xs font-bold tracking-wider text-stone-500 uppercase">Engine Status: Active & Adapting</span>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pointer-events-none opacity-90 select-none grayscale-[0.1]">

                        {/* Card 1: Overall Concept Mastery */}
                        <div className="lg:col-span-2 bg-[#1e293b] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[80px] opacity-10 -translate-y-1/2 translate-x-1/3"></div>

                            {/* Analysis Scheme Effect Overlay */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
                                <div className="absolute bottom-6 right-10 flex flex-col items-end gap-1 opacity-50 font-mono text-[10px] text-[#C5A059]">
                                    <span className="animate-pulse">ANALYZING ADAPTABILITY...</span>
                                </div>
                            </div>

                            <h3 className="text-xs font-bold tracking-[0.2em] text-[#C5A059] uppercase mb-10 opacity-90">
                                Overall Concept Mastery
                            </h3>

                            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                                {/* Circular Progress */}
                                <div className="relative w-40 h-40 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            className="stroke-[#334155]"
                                            strokeWidth="12"
                                            fill="none"
                                        />
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            className="stroke-[#C5A059]"
                                            strokeWidth="12"
                                            fill="none"
                                            strokeDasharray="440"
                                            strokeDashoffset="158" /* 64% */
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-4xl font-serif italic font-light">64%</span>
                                        <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mt-1">Complete</span>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="flex-1 w-full space-y-3">
                                    {[
                                        "Business Model Canvas",
                                        "Market Sizing (TAM/SAM/SOM)",
                                        "Customer Discovery Protocols",
                                        "Financial Agility Models"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                            <span className="text-sm font-medium text-stone-200">{item}</span>
                                            <span className="text-[10px] font-bold text-[#C5A059]">In Progress</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Modality Synergy */}
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-stone-100 flex flex-col justify-center">
                            <h3 className="text-xs font-bold tracking-[0.2em] text-stone-400 uppercase mb-8">
                                Modality Synergy
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { label: "Visual", value: 88 },
                                    { label: "Auditory", value: 42 },
                                    { label: "Kinesthetic", value: 15 },
                                    { label: "Analytical", value: 95 },
                                    { label: "Narrative", value: 70 },
                                ].map((modality, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{modality.label}</span>
                                            <span className="text-sm font-bold text-[#C5A059]">{modality.value}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#C5A059] rounded-full relative"
                                                style={{ width: `${modality.value}%` }}
                                            >
                                                {/* Shine effect */}
                                                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Model Sovereignty - HIDDEN (Local Edge not ready) */}
                    {/* <div className="bg-white rounded-[2.5rem] p-10 lg:p-12 shadow-xl border border-stone-100 flex flex-col md:flex-row items-center justify-between gap-10 opacity-70 pointer-events-none select-none grayscale-[0.2]">
                        <div className="max-w-2xl space-y-4">
                            <h3 className="text-3xl font-serif text-[#1e293b]">
                                Model Sovereignty <span className="italic text-[#C5A059]">& IP Ownership</span>
                            </h3>
                            <p className="text-stone-500 leading-relaxed font-light">
                                Opt-in to train your personal self-adaptive model on your private data stream.
                                Once trained, this model is yours to keep, export, and use across the TEKIMAX ecosystem.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                className="w-16 h-9 bg-stone-200 rounded-full p-1 transition-colors duration-300 relative cursor-not-allowed opacity-70"
                                disabled={true}
                                title="Coming Soon"
                            >
                                <div className="w-7 h-7 bg-white rounded-full shadow-md transform translate-x-0 transition-transform duration-300"></div>
                            </button>
                            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">Enable Personal Training</span>
                        </div>
                    </div> */}

                    <div className="text-center pt-8 opacity-40">
                        <p className="text-xs font-mono text-stone-500">TEKIMAX ADAPTIVE LEARNING CORE v0.9 (PREVIEW)</p>
                    </div>

                </div>
            </main>
        </div>
    );
};
