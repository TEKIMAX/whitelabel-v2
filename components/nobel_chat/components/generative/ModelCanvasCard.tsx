
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface ModelCanvasCardProps {
    section: string;
    content: string;
    projectId?: string | null;
    onNavigate?: (view: string) => void;
    onSendMessage?: (text: string) => void;
}

const ModelCanvasCard: React.FC<ModelCanvasCardProps> = ({ section = "Section", content = "", projectId, onNavigate, onSendMessage }) => {
    const updateCanvas = useMutation(api.canvas.updateSection);
    const [isSaved, setIsSaved] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDenied, setIsDenied] = React.useState(false);

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
                    const signedProof = await signApproval(
                        "canvas",
                        section,
                        content,
                        identity.privateKey
                    );
                    signature = signedProof.signature;
                    publicKey = identity.publicKey;
                }
            } catch (cryptoErr) {
            }

            await updateCanvas({
                projectId,
                section,
                content,
                tags: ['AI Assisted'],
                signature,
                publicKey
            });
            setIsSaved(true);
            toast.success(`Saved to ${section} (Signed)`);
        } catch (e) {
            toast.error("Failed to save to canvas");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied the suggested update for the "${section}" section of my Business Model Canvas. Can you help me clarify why this might not fit or suggest an alternative approach based on [Specific Feedback]?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="my-6 border border-nobel-gold/20 rounded-2xl shadow-sm bg-white overflow-hidden animate-fade-in">
            <div className="bg-nobel-dark px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-serif text-lg font-medium">{section}</h3>
                <span className="text-[10px] text-nobel-gold uppercase tracking-[0.2em] font-bold bg-white/5 px-2 py-1 rounded">
                    Canvas Suggestion
                </span>
            </div>

            <div className="p-6">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-sans prose-nobel">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                        onClick={() => onNavigate?.('CANVAS')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-stone-50 hover:text-nobel-gold transition-all shadow-sm"
                    >
                        <ExternalLink size={14} /> View Canvas
                    </button>

                    <ApprovalGuard
                        onApprove={handleApprove}
                        onDeny={handleDeny}
                        isSaved={isSaved}
                        isSaving={isSaving}
                        isDenied={isDenied}
                        approveLabel="Approve Section"
                    />
                </div>
            </div>
        </div>
    );
};

export default ModelCanvasCard;
