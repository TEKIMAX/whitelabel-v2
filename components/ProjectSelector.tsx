import React, { useState, useRef, useEffect } from 'react';
import { StartupData } from '../types';
import { Plus, ChevronDown, Check, Mail, X } from 'lucide-react';
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface ProjectSelectorProps {
    projects: StartupData[];
    currentProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    onCreateNew: () => void;
    className?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects = [], currentProjectId, onSelectProject, onCreateNew, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const sendInvite = useAction(api.invites.sendInvite);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);



    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || !currentProject) return;
        setIsInviting(true);
        try {
            await sendInvite({
                email: inviteEmail,
                orgId: currentProject.orgId || "personal",
                projectId: currentProject.id as any
            });
            toast.success("Invitation sent successfully", { icon: <Mail className="w-4 h-4 text-black" /> });
            setShowInviteModal(false);
            setInviteEmail('');
        } catch (error) {
            toast.error("Failed to send invitation");
        } finally {
            setIsInviting(false);
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentProject = projects.find(p => p.id === currentProjectId);

    const subscription = useQuery(api.usage.getSubscriptionStatus);
    const isAccessAllowed = subscription?.isPro ?? true; // Default to true while loading to avoid flash

    const stats = useQuery(api.analytics.getCooperationStats, currentProjectId ? { projectId: currentProjectId as any } : "skip");
    const humanRatio = stats?.humanRatio || 0;

    return (
        <div className={`flex items-center gap-2 relative ${className}`} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-white border border-stone-200 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-all focus:outline-none group min-w-[200px] justify-between"
            >
                <span className="font-bold text-xs uppercase tracking-widest text-stone-900 truncate max-w-[160px] group-hover:text-nobel-gold transition-colors">
                    {currentProject?.name || "Select Venture"}
                </span>
                <div className={`rounded-full bg-stone-900 p-1 transition-all duration-200 group-hover:bg-stone-800 shadow-sm ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3 h-3 text-white" />
                </div>
            </button>

            {currentProjectId && stats !== undefined && (
                <div 
                    title="Truthfulness Index (Human vs AI insight ratio)"
                    className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-full px-3 py-1.5 shadow-sm group cursor-help transition-all hover:bg-black hidden sm:flex"
                >
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${humanRatio >= 49 ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    <span className="font-bold text-[10px] uppercase tracking-widest text-white">
                        {humanRatio >= 49 ? 'Pilot' : 'Passenger'}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-stone-400">
                        {humanRatio.toFixed(0)}%
                    </span>
                </div>
            )}

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 min-w-[240px] w-max bg-white border border-stone-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 mb-1 bg-stone-50/50">
                        Select Venture
                    </div>
                    {projects.map(p => (
                        <button
                            key={p.id}
                            disabled={!isAccessAllowed}
                            onClick={() => {
                                onSelectProject(p.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors flex items-center justify-between gap-4 ${p.id === currentProjectId ? 'bg-stone-50' : ''} ${!isAccessAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className={`truncate ${p.id === currentProjectId ? 'font-bold text-nobel-gold' : 'text-stone-600'}`}>{p.name}</span>
                            {p.id === currentProjectId && <Check className="w-3.5 h-3.5 flex-shrink-0 text-nobel-gold" />}
                            {!isAccessAllowed && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">Locked</span>}
                        </button>
                    ))}
                    <div className="border-t border-stone-100 mt-1 pt-2 px-2 pb-1">
                        <button
                            onClick={() => {
                                onCreateNew();
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <div className="p-1 bg-stone-200 rounded-full">
                                <Plus className="w-3 h-3" />
                            </div>
                            Create New Venture
                        </button>
                        <button
                            onClick={() => {
                                setShowInviteModal(true);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg flex items-center gap-2 transition-colors mt-1"
                        >
                            <div className="p-1 bg-stone-200 rounded-full">
                                <Mail className="w-3 h-3" />
                            </div>
                            Invite Team
                        </button>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif font-bold text-stone-900">Invite Team Member</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSendInvite} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full p-2 border border-stone-200 rounded focus:border-nobel-gold outline-none"
                                    placeholder="colleague@example.com"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-900 text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isInviting}
                                    className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isInviting ? 'Sending...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSelector;