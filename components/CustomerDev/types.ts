import { StartupData, CustomerInterview, AISettings, CustomerStatus, RolePermissions } from '../../types';

export interface CustomerDevProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

export type ActiveTab = 'overview' | 'feedback' | 'video' | 'fit' | 'questions';

export const defaultHeaders = [
    'Name',
    'Role', 
    'Organization', 
    'Email', 
    'Notes', 
    'Pain Points', 
    'Survey Feedback', 
    'Willingness to Pay ($)'
];

export const sentimentColors: Record<string, string> = {
    'Positive': 'bg-green-100 text-green-700 border-green-200',
    'Neutral': 'bg-stone-100 text-stone-700 border-stone-200',
    'Negative': 'bg-red-100 text-red-700 border-red-200'
};

export const getSentimentColor = (sentiment?: string): string => {
    if (!sentiment) return sentimentColors.Neutral;
    return sentimentColors[sentiment] || sentimentColors.Neutral;
};
