
import React, { useState } from 'react';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface KeyResult {
    label: string;
    target: string;
    current: string;
    status: 'completed' | 'in-progress' | 'pending';
}

interface OKRCardProps {
    objective: string;
    timeline: string;
    status: string;
    progress: number;
    keyResults: KeyResult[];
    projectId?: string | null;
    onSendMessage?: (text: string) => void;
}

const OKRCard: React.FC<OKRCardProps> = ({ objective, timeline, status, progress, keyResults = [], projectId, onSendMessage }) => {
    const saveOKR = useMutation(api.goals.saveGoalWithKRs);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDenied, setIsDenied] = useState(false);

    const handleApprove = async () => {
        if (!projectId) {
            toast.error("No project selected to save to.");
            return;
        }

        setIsSaving(true);
        try {
            // Cryptographic Signing Flow
            let signature = undefined;
            let publicKey = undefined;

            try {
                const { ensureIdentity, signApproval } = await import('../../../../services/crypto');
                const identity = await ensureIdentity();
                if (identity.privateKey) {
                    const contentToSign = JSON.stringify({ objective, timeline, keyResults });
                    const signedProof = await signApproval(
                        "goal",
                        objective,
                        contentToSign,
                        identity.privateKey
                    );
                    signature = signedProof.signature;
                    publicKey = identity.publicKey;
                }
            } catch (cryptoErr) {
            }

            await saveOKR({
                projectId,
                title: objective,
                type: 'Objective',
                timeframe: timeline,
                status: status === 'On Track' ? 'Active' : 'Draft',
                keyResults,
                signature,
                publicKey
            });

            setIsSaved(true);
            toast.success("Goal and Key Results saved (Signed)");
        } catch (e) {
            toast.error("Failed to save OKRs");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied the suggested OKRs ("${objective}"). This objective alignment doesn't quite match our current focus. Could you suggest an alternative or help me refine this objective based on [Specific Feedback]?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="my-6 w-full bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden animate-fade-in text-left">
            {/* Header */}
            <div className="bg-stone-50/50 px-5 py-4 border-b border-stone-100 flex justify-between items-start gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg h-fit shrink-0">
                        <Target size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 whitespace-nowrap">{timeline}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${status === 'On Track' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                status === 'At Risk' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
                                }`}>
                                {status}
                            </span>
                        </div>
                        <h3 className="font-bold text-stone-900 leading-snug break-words">{objective}</h3>
                    </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                    <span className="text-2xl font-bold text-stone-800">{progress}%</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-stone-100">
                <div className="h-full bg-purple-600 rounded-r-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Key Results */}
            <div className="p-5 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Key Results</h4>
                {keyResults.map((kr, idx) => (
                    <div key={idx} className="flex items-center gap-3 group">
                        {kr.status === 'completed' ? (
                            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        ) : kr.status === 'in-progress' ? (
                            <div className="w-4.5 h-4.5 rounded-full border-2 border-purple-500 border-t-transparent shrink-0 animate-spin-slow" />
                        ) : (
                            <Circle size={18} className="text-stone-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium break-words ${kr.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                                {kr.label}
                            </p>
                        </div>
                        <div className="text-xs font-bold text-stone-500 bg-stone-50 px-2 py-1 rounded shrink-0">
                            {kr.current} <span className="text-stone-300">/</span> {kr.target}
                        </div>
                    </div>
                ))}
            </div>

            {/* Approval Guard */}
            <div className="px-5 py-4 border-t border-stone-50 bg-stone-50/20 flex justify-end">
                <ApprovalGuard
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    isDenied={isDenied}
                    approveLabel="Approve OKRs"
                />
            </div>
        </div>
    );
};

export default OKRCard;
