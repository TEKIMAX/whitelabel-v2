
import React from 'react';
import { Check, X, Loader2, Sparkles } from 'lucide-react';

interface ApprovalGuardProps {
    onApprove: () => Promise<void>;
    onDeny: () => void;
    isSaved: boolean;
    isSaving: boolean;
    isDenied?: boolean;
    approveLabel?: string;
    denyLabel?: string;
    helperText?: string;
}

const ApprovalGuard: React.FC<ApprovalGuardProps> = ({
    onApprove,
    onDeny,
    isSaved,
    isSaving,
    isDenied = false,
    approveLabel = "Approve & Save",
    denyLabel = "Deny Suggestion",
    helperText = "Approving will sign this action cryptographically."
}) => {
    if (isSaved) {
        return (
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <Check size={14} /> Approved & Signed
            </div>
        );
    }

    if (isDenied) {
        return (
            <div className="flex items-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-widest bg-stone-50 px-4 py-2 rounded-full border border-stone-100 italic animate-in fade-in zoom-in duration-300">
                <X size={14} /> Suggestion Denied
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-3">
            {helperText && (
                <p className="text-[10px] text-stone-400 font-medium italic flex items-center gap-1">
                    <Sparkles size={10} className="text-nobel-gold" /> {helperText}
                </p>
            )}
            <div className="flex items-center gap-3">
                <button
                    onClick={onDeny}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                    <X size={14} /> {denyLabel}
                </button>
                <button
                    onClick={onApprove}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-nobel-dark text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <><Loader2 size={14} className="animate-spin" /> Signing...</>
                    ) : (
                        <><Check size={14} /> {approveLabel}</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ApprovalGuard;
