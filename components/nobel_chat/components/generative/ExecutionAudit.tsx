import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ShieldAlert, ChevronRight } from 'lucide-react';

interface ExecutionAuditProps {
    status: string;
    missingDataPoints: {
        category: string;
        details: string;
    }[];
    executiveSummary?: string;
}

const GapCard: React.FC<{ point: { category: string; details: string }; index: number }> = ({ point, index }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-stone-200 rounded-lg overflow-hidden bg-white hover:border-red-200 transition-colors">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-3 text-left cursor-pointer select-none group"
            >
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="flex-1 font-bold text-stone-800 text-sm">{point.category}</span>
                <ChevronRight
                    size={14}
                    className={`text-stone-400 group-hover:text-stone-600 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                />
            </button>
            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-3 pb-3 pl-8">
                    <p className="text-stone-500 text-xs leading-relaxed">{point.details}</p>
                </div>
            </div>
        </div>
    );
};

const ExecutionAudit: React.FC<ExecutionAuditProps> = ({ status = "Unknown", missingDataPoints = [], executiveSummary }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="w-full my-6 bg-stone-50 border border-red-200/60 rounded-xl overflow-hidden animate-fade-in-up shadow-sm">
            {/* Accordion Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gradient-to-r from-red-900 to-stone-900 p-5 flex items-center gap-4 cursor-pointer select-none group transition-colors hover:from-red-800 hover:to-stone-800"
            >
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
                    <ShieldAlert size={22} />
                </div>
                <div className="flex-1 text-left">
                    <h3 className="font-serif font-bold text-lg text-white mb-0.5">Execution Audit</h3>
                    <p className="text-stone-400 text-xs font-sans">
                        Status: <span className="text-red-400 font-bold uppercase tracking-wider">{status}</span>
                        {missingDataPoints.length > 0 && (
                            <span className="ml-2 text-stone-500">• {missingDataPoints.length} gap{missingDataPoints.length !== 1 ? 's' : ''} detected</span>
                        )}
                    </p>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-stone-400 group-hover:text-white transition-all duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Accordion Body */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-5 space-y-4">
                    {/* Executive Summary */}
                    {executiveSummary && (
                        <div className="bg-stone-200/50 p-4 rounded-lg border-l-4 border-nobel-gold">
                            <p className="text-stone-700 text-xs italic font-serif leading-relaxed">
                                <span className="font-bold not-italic text-nobel-gold uppercase tracking-wider text-[10px] mr-2">Executive Note</span>
                                "{executiveSummary}"
                            </p>
                        </div>
                    )}

                    {/* Gap Cards — each is its own mini accordion */}
                    {missingDataPoints.length > 0 && (
                        <div>
                            <p className="text-stone-600 text-xs leading-relaxed mb-3 font-bold uppercase tracking-wide flex items-center gap-2">
                                <AlertTriangle size={13} className="text-amber-500" /> Critical Gaps
                            </p>
                            <div className="space-y-2">
                                {missingDataPoints.map((point, idx) => (
                                    <GapCard key={idx} point={point} index={idx} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExecutionAudit;
