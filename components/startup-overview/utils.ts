export const timeAgo = (date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    return Math.floor(seconds / 86400) + "d ago";
};

export const getHealthColor = (score: number) => score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-nobel-gold' : 'text-red-500';
export const getHealthBg = (score: number) => score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-nobel-gold' : 'bg-red-500';

