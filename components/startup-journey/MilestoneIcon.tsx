import React from 'react';
import { MilestoneType } from '../../types';
import { Flag, Rocket, DollarSign, Users, Zap, TrendingUp, PenTool } from 'lucide-react';

interface MilestoneIconProps {
    type: MilestoneType;
    isFeatured: boolean;
    count?: number;
    size?: 'small' | 'normal';
}

export const MilestoneIcon: React.FC<MilestoneIconProps> = ({ type, isFeatured, count, size = 'normal' }) => {
    let Icon = Flag;
    if (type === 'Launch') Icon = Rocket;
    if (type === 'Funding') Icon = DollarSign;
    if (type === 'Hiring') Icon = Users;
    if (type === 'Pivot') Icon = Zap;
    if (type === 'Metric') Icon = TrendingUp;
    if (type === 'Product') Icon = PenTool;

    // Small (Bottom)
    if (size === 'small') {
        return (
            <div className={`w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-400 flex items-center justify-center shadow-sm transition-all z-10 relative`}>
                {count && count > 1 ? (
                    <span className="font-bold text-xs">{count}</span>
                ) : (
                    <Icon className="w-3.5 h-3.5" />
                )}
            </div>
        );
    }

    // Featured (Top)
    return (
        <div className={`
            flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 border-4 border-white
            ${isFeatured
                ? 'w-16 h-16 bg-nobel-gold text-white ring-1 ring-stone-200'
                : 'w-10 h-10 bg-white text-stone-600 border-stone-200'
            }
        `}>
            {count && count > 1 ? (
                <span className="font-serif font-bold text-2xl">{count}</span>
            ) : (
                <Icon className={isFeatured ? 'w-7 h-7' : 'w-5 h-5'} />
            )}
        </div>
    );
};
