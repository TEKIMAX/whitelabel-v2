import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Lightbulb, AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react';

interface RecommendationCardProps {
    title: string;
    content: string; // Markdown supported
    type?: 'insight' | 'warning' | 'audit' | 'success';
    priority?: 'high' | 'medium' | 'low';
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
    title,
    content,
    type = 'insight',
    priority = 'medium'
}) => {

    const getIcon = () => {
        switch (type) {
            case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
            case 'audit': return <AlertTriangle className="text-red-500" size={20} />;
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            default: return <Lightbulb className="text-nobel-gold" size={20} />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'warning': return 'bg-amber-50 border-amber-100';
            case 'audit': return 'bg-red-50 border-red-100';
            case 'success': return 'bg-green-50 border-green-100';
            default: return 'bg-indigo-50/50 border-indigo-100';
        }
    };

    const isGenerating = !title && !content;

    if (isGenerating) {
        return (
            <div className={`my-6 w-full rounded-2xl border ${getBgColor()} overflow-hidden shadow-sm animate-fade-in-up`}>
                <div className="p-5 flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-white/50 shrink-0">
                        {getIcon()}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-3 text-sm text-stone-500 font-serif italic">
                        <Loader2 size={16} className="animate-spin text-nobel-gold" />
                        Generating your recommendation...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`my-6 w-full rounded-2xl border ${getBgColor()} overflow-hidden shadow-sm animate-fade-in-up`}>
            <div className="p-5 flex items-start gap-4">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-white/50 shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-lg text-stone-800 mb-2 flex items-center gap-2">
                        {title}
                        {priority === 'high' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] uppercase tracking-wider font-bold rounded-full">
                                High Priority
                            </span>
                        )}
                    </h3>
                    <div className="prose prose-sm prose-stone max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-stone-800">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationCard;
