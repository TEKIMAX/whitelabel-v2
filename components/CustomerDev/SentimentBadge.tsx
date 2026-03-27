import { getSentimentColor } from './types';

interface SentimentBadgeProps {
    sentiment?: string;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({ sentiment }) => {
    if (!sentiment) return null;
    
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSentimentColor(sentiment)}`}>
            {sentiment}
        </span>
    );
};
