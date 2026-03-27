import React from 'react';
import { User, Video, Upload } from 'lucide-react';

interface EmptyStateProps {
    type: 'interviews' | 'video';
    onAction?: () => void;
    canEdit?: boolean;
    actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
    type, 
    onAction, 
    canEdit = true,
    actionLabel 
}) => {
    if (type === 'interviews') {
        return (
            <div className="flex-grow flex flex-col lg:flex-row items-center justify-center gap-0 p-8 min-h-[600px] w-full max-w-6xl mx-auto">
                <img
                    src="/images/hero-carousel-4.png"
                    alt="Customer Feedback Analytics"
                    className="w-full lg:w-[480px] h-[500px] rounded-l-2xl border-8 border-white shadow-xl object-cover shrink-0"
                />
                <div className="bg-white rounded-r-2xl p-10 lg:p-12 shadow-sm border border-stone-100 flex-1 min-w-[320px] max-w-md flex flex-col items-center text-center h-[500px] justify-center">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-6">
                        <User className="w-8 h-8 text-stone-900" />
                    </div>
                    <h3 className="font-serif text-3xl text-stone-900 mb-4">Start Your Customer Discovery</h3>
                    <p className="text-stone-500 leading-relaxed mb-8 text-lg">
                        <span className="font-bold text-stone-900 block mb-2">Why this matters:</span>
                        Building in a vacuum is risky. Talk to potential customers to validate your problem, understand their pain points, and de-risk your venture.
                    </p>
                    {canEdit && onAction && (
                        <button
                            onClick={onAction}
                            className="bg-stone-900 text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-lg"
                        >
                            {actionLabel || 'Log First Interview'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (type === 'video') {
        return (
            <div className="flex-grow flex flex-col lg:flex-row items-center justify-center gap-0 p-8 min-h-[600px] w-full max-w-6xl mx-auto">
                <img
                    src="/images/hero-carousel-1.png"
                    alt="Video Interview Session"
                    className="w-full lg:w-[480px] h-[500px] rounded-l-2xl border-8 border-white shadow-xl object-cover shrink-0"
                />
                <div className="bg-white rounded-r-2xl p-10 lg:p-12 shadow-sm border border-stone-100 flex-1 min-w-[320px] max-w-md flex flex-col items-center text-center h-[500px] justify-center">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-6">
                        <Video className="w-8 h-8 text-stone-900" />
                    </div>
                    <h3 className="font-serif text-3xl text-stone-900 mb-4">Capture Deep Insights</h3>
                    <p className="text-stone-500 leading-relaxed mb-8 text-lg">
                        <span className="font-bold text-stone-900 block mb-2">Why Video?</span>
                        Communication is 90% non-verbal. Recording customer interviews captures tone, hesitation, and excitement that text notes miss.
                    </p>
                    {canEdit && onAction && (
                        <button
                            onClick={onAction}
                            className="bg-stone-900 text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-lg flex items-center gap-3"
                        >
                            <Upload className="w-4 h-4" />
                            {actionLabel || 'Upload Video Interview'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
