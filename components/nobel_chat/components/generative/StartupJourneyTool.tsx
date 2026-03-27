import React, { useState } from 'react';
import { MilestoneType, TractionType } from '../../../../types';
import { useMutation, useQuery } from 'convex/react';
import { api } from "../../../../convex/_generated/api";
import { useCreateMilestone } from '../../../../hooks/useCreate';
import { toast } from 'sonner';
import { Calendar, Flag, Rocket, DollarSign, Users, Zap, TrendingUp, PenTool, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StartupJourneyToolProps {
    title: string;
    date: string;
    type: MilestoneType;
    description: string;
    tractionType: TractionType;
    isFeatured: boolean;
    projectId?: string;
    onSaved?: () => void;
}

const StartupJourneyTool: React.FC<StartupJourneyToolProps> = ({
    title: initialTitle,
    date: initialDate,
    type: initialType,
    description: initialDesc,
    tractionType: initialTraction,
    isFeatured: initialFeatured,
    projectId,
    onSaved
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [date, setDate] = useState(initialDate);
    const [type, setType] = useState(initialType);
    const [description, setDescription] = useState(initialDesc);
    const [tractionType, setTractionType] = useState(initialTraction);
    const [isFeatured, setIsFeatured] = useState(initialFeatured);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const addMilestone = useCreateMilestone();
    const currentUser = useQuery(api.users.getUser);

    const handleSave = async () => {
        if (!projectId) {
            toast.error("No active project found.");
            return;
        }

        try {
            setIsSaving(true);

            const newMilestone = {
                id: Date.now().toString(),
                title,
                date: new Date(date).getTime(),
                type,
                description,
                tractionType,
                isMonumental: isFeatured,
                isFeatured,
                tags: ['AI Assisted'],
                source: 'AI' as const,
                creatorProfile: currentUser ? {
                    name: currentUser.name || 'Founder',
                    avatarUrl: currentUser.pictureUrl,
                    userId: currentUser._id
                } : undefined
            };

            await addMilestone({
                projectId,
                milestone: newMilestone
            });

            setIsSaved(true);
            toast.success("Milestone saved to Journey!");
            onSaved?.();
        } catch (e) {
            toast.error("Failed to save milestone.");
        } finally {
            setIsSaving(false);
        }
    };


    // Render Helpers
    const getTypeIcon = (t: string) => {
        switch (t) {
            case 'Launch': return Rocket;
            case 'Funding': return DollarSign;
            case 'Hiring': return Users;
            case 'Pivot': return Zap;
            case 'Metric': return TrendingUp;
            case 'Product': return PenTool;
            default: return Flag;
        }
    };
    const Icon = getTypeIcon(type);

    if (isSaved) {
        return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                        <Check size={16} />
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-800 line-through opacity-70">{title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-stone-500">Saved to Startup Journey</p>
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                                <Zap size={10} className="fill-current" /> AI Attributed
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-6 w-full bg-white border border-nobel-gold/20 rounded-xl overflow-hidden shadow-md animate-fade-in-up">
            <div className="bg-nobel-dark p-5 flex items-start gap-4 border-b border-stone-800">
                <div className="p-3 bg-white/10 border border-white/20 rounded-xl shadow-inner text-nobel-gold shrink-0 backdrop-blur-sm">
                    <Rocket size={24} />
                </div>
                <div>
                    <h3 className="font-serif font-bold text-lg text-white mb-1">Draft Milestone</h3>
                    <p className="text-sm text-stone-300 leading-relaxed font-sans break-words">AI has drafted a new milestone for your journey. Review and save it.</p>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Title</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full text-sm font-bold text-stone-800 border-b border-stone-200 focus:border-nobel-gold outline-none py-1 bg-transparent"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Date</label>
                        <div className="flex items-center gap-2 text-stone-600 border-b border-stone-200 py-1">
                            <Calendar size={12} />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="text-xs bg-transparent outline-none w-full font-medium"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Type</label>
                        <div className="flex items-center gap-2 text-stone-600 border-b border-stone-200 py-1">
                            <Icon size={12} />
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as any)}
                                className="text-xs bg-transparent outline-none w-full font-medium appearance-none"
                            >
                                {['Launch', 'Funding', 'Pivot', 'Metric', 'Hiring', 'Product', 'Other'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 focus:border-nobel-gold outline-none resize-none leading-relaxed h-16"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <div onClick={() => setTractionType(tractionType === 'Traction' ? 'No Traction' : 'Traction')} className={`cursor-pointer px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${tractionType === 'Traction' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                        {tractionType === 'Traction' ? <TrendingUp size={12} /> : <div className="w-3 h-3 rounded-full border border-stone-300"></div>}
                        Traction
                    </div>
                    <div onClick={() => setIsFeatured(!isFeatured)} className={`cursor-pointer px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${isFeatured ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                        {isFeatured ? <Zap size={12} strokeWidth={3} /> : <div className="w-3 h-3 rounded-full border border-stone-300"></div>}
                        Feature
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-nobel-gold text-white rounded-full text-xs font-bold uppercase tracking-widest hover:brightness-90 transition-colors shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                    {isSaving ? 'Saving...' : <><Check size={14} /> Save to Timeline</>}
                </button>
            </div>
        </div>
    );
};

export default StartupJourneyTool;
