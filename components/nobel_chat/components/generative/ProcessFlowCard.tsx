
import React, { useState } from 'react';
import { Network } from 'lucide-react';
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface Step {
    stepNumber: number;
    title: string;
    description: string;
}

interface ProcessFlowCardProps {
    title: string;
    steps: Step[];
    projectId?: string | null;
    onSendMessage?: (text: string) => void;
}

const ProcessFlowCard: React.FC<ProcessFlowCardProps> = ({ title = "Process", steps = [], projectId, onSendMessage }) => {
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDenied, setIsDenied] = useState(false);

    const handleApprove = async () => {
        setIsSaving(true);
        // Placeholder for real saving logic if it existed
        setTimeout(() => {
            setIsSaved(true);
            setIsSaving(false);
            toast.success("Workflow acknowledged and logged.");
        }, 800);
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied this suggested workflow: "${title}". Step ${steps[0]?.stepNumber || 1} doesn't quite fit our operational model. Could you suggest an alternative process or ask me about our current tools?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="my-6 w-full md:max-w-xl text-left animate-fade-in bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                    <Network size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-stone-900 leading-tight">Workflow</h3>
                    <p className="text-xs text-stone-500 font-medium">{title}</p>
                </div>
            </div>

            <div className="space-y-0 mb-6">
                {steps.sort((a, b) => a.stepNumber - b.stepNumber).map((step, idx) => (
                    <div key={idx} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-sm shadow-sm z-10 group-hover:border-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                {step.stepNumber}
                            </div>
                            {idx !== steps.length - 1 && (
                                <div className="w-0.5 h-full bg-stone-100 -my-2 py-4 group-hover:bg-indigo-100 transition-colors"></div>
                            )}
                        </div>
                        <div className="pb-6 pt-1 flex-1">
                            <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm group-hover:shadow-md transition-all">
                                <h4 className="font-bold text-stone-800 text-sm mb-1">{step.title}</h4>
                                <p className="text-xs text-stone-500 leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Approval Guard */}
            <div className="flex justify-end pt-2 border-t border-stone-50">
                <ApprovalGuard
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    isDenied={isDenied}
                    approveLabel="Acknowledge Workflow"
                />
            </div>
        </div>
    );
};

export default ProcessFlowCard;
