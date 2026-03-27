import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ActionCardProps {
    title?: string;
    description?: string;
    buttonLabel?: string;
    navigationTarget?: string;
    onNavigate?: (page: string) => void;
    _error?: string;
    _rawArgs?: any;
}

const PAGE_EMOJI: Record<string, string> = {
    'IDEATION': '💡',
    'MARKET_RESEARCH': '📊',
    'CUSTOMERS': '👥',
    'REVENUE': '💰',
    'FORECASTING': '📈',
    'EXPENSES': '💸',
    'TEAM': '👨‍💼',
    'LEGAL': '⚖️',
    'GOALS': '🎯',
    'JOURNEY': '🗺️',
    'DECK': '📽️',
    'BUSINESS_PLAN': '📋',
    'CANVAS': '🎨',
    'FILES': '📁',
    'WIKI': '📚',
    'SETTINGS': '⚙️',
    'STARTUP_OVERVIEW': '🏠',
};

const ActionCard: React.FC<ActionCardProps> = ({
    title = "Action Required",
    description = "Please review this action item.",
    navigationTarget,
    onNavigate,
}) => {
    const handleNavigate = () => {
        if (onNavigate && navigationTarget) {
            const normalizedTarget = navigationTarget.toUpperCase().replace(/\s+/g, '_');

            const pageMappings: Record<string, string> = {
                'SOLUTION_DEFINITION': 'IDEATION',
                'SOLUTION': 'IDEATION',
                'IDEATION': 'IDEATION',
                'DEFINE_SOLUTION': 'IDEATION',
                'MARKET_RESEARCH': 'MARKET_RESEARCH',
                'MARKET': 'MARKET_RESEARCH',
                'NAICS': 'MARKET_RESEARCH',
                'INDUSTRY': 'MARKET_RESEARCH',
                'SMALL_BUSINESS': 'MARKET_RESEARCH',
                'CUSTOMER_DISCOVERY': 'CUSTOMERS',
                'CUSTOMERS': 'CUSTOMERS',
                'CUSTOMER_SEGMENTS': 'CUSTOMERS',
                'TARGET_CUSTOMERS': 'CUSTOMERS',
                'REVENUE_MODEL': 'REVENUE',
                'REVENUE': 'REVENUE',
                'FINANCIALS': 'FORECASTING',
                'FORECAST': 'FORECASTING',
                'FORECASTING': 'FORECASTING',
                'EXPENSES': 'EXPENSES',
                'TEAM': 'TEAM',
                'LEGAL': 'LEGAL',
                'GOALS': 'GOALS',
                'OKR': 'GOALS',
                'MILESTONES': 'JOURNEY',
                'JOURNEY': 'JOURNEY',
                'ROADMAP': 'JOURNEY',
                'PITCH_DECK': 'DECK',
                'DECK': 'DECK',
                'BUSINESS_PLAN': 'BUSINESS_PLAN',
                'CANVAS': 'CANVAS',
                'LEAN_CANVAS': 'CANVAS',
                'FILES': 'FILES',
                'DOCUMENTS': 'WIKI',
                'WIKI': 'WIKI',
                'SETTINGS': 'SETTINGS',
            };

            const mappedTarget = pageMappings[normalizedTarget] || normalizedTarget;

            const validViewStates = [
                'ONBOARDING', 'CANVAS', 'CANVAS_LANDING', 'STARTUP_OVERVIEW', 'CALENDAR',
                'NOTIFICATIONS', 'JOURNEY', 'MARKET', 'MARKET_RESEARCH', 'BOTTOM_UP_SIZING',
                'COMPETITORS', 'COMPETITIVE_MATRIX', 'CUSTOMERS', 'REVENUE', 'STRIPE_DASHBOARD',
                'REPORT', 'BUSINESS_PLAN', 'BUSINESS_PLAN_BUILDER', 'GOALS', 'ENGINEERING',
                'LEGAL', 'GRANT', 'SAFE', 'VESTING', 'TEAM', 'FILES', 'SETTINGS', 'EISENHOWER',
                'LANDING_PAGE', 'IDEATION', 'WORKSPACE', 'WIKI', 'DECK', 'AI_ASSISTANT',
                'INITIATIVES', 'ADAPTIVE_LEARNING', 'HUMAN_AI_COOPERATION', 'LEARN_BMC',
                'AI_DIAGNOSTIC', 'FORECASTING', 'REVENUE_OPS', 'TOKEN_PRICING', 'EXPENSES',
                'SUBSCRIPTION', 'CALCULATOR_AI', 'AGENTS'
            ];

            if (validViewStates.includes(mappedTarget)) {
                onNavigate(mappedTarget);
            } else if (validViewStates.includes(normalizedTarget)) {
                onNavigate(normalizedTarget);
            } else {
                onNavigate('STARTUP_OVERVIEW');
            }
        }
    };

    const emoji = navigationTarget ? PAGE_EMOJI[navigationTarget.toUpperCase().replace(/\s+/g, '_')] || '➡️' : '➡️';

    const hasLongDescription = description.length > 200;

    return (
        <div className={`my-4 w-full bg-gradient-to-br from-purple-50 to-stone-50 border border-purple-100 rounded-2xl overflow-hidden shadow-sm animate-fade-in-up ${hasLongDescription ? 'max-w-2xl' : 'max-w-lg'}`}>
            <div className={`p-4 ${hasLongDescription ? 'p-6' : 'p-4'}`}>
                <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-stone-900 flex items-center gap-2 leading-tight">
                        <span className="text-xl shrink-0">{emoji}</span>
                        <span className="leading-tight">{title}</span>
                    </h3>
                    
                    <div className={`prose prose-sm prose-stone max-w-none ${hasLongDescription ? 'prose-base' : ''}`}>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({node, ...props}) => <p className={`m-0 ${hasLongDescription ? 'text-base' : 'text-sm'} text-stone-600 leading-relaxed`} {...props} />,
                                ul: ({node, ...props}) => <ul className="my-2 pl-4 space-y-1 text-stone-600" {...props} />,
                                ol: ({node, ...props}) => <ol className="my-2 pl-4 space-y-1 text-stone-600" {...props} />,
                                li: ({node, ...props}) => <li className="text-stone-600" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-purple-700 font-semibold" {...props} />,
                                em: ({node, ...props}) => <em className="text-purple-600" {...props} />,
                                code: ({node, ...props}) => <code className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs" {...props} />,
                            }}
                        >
                            {description}
                        </ReactMarkdown>
                    </div>

                    {navigationTarget && onNavigate && (
                        <button
                            onClick={handleNavigate}
                            className="self-start mt-2 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                            Go to {navigationTarget}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionCard;
