import { useState, useCallback, useEffect } from 'react';

// Go Provisioning API — set during deployment via VITE_API_URL env var
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
// SA-002: Use server-only key name (no VITE_ prefix) to prevent client bundle exposure.
const API_KEY = (import.meta as any).env?.ADMIN_API_KEY || '';
const DEPLOY_ID = (import.meta as any).env?.DEPLOYMENT_ID || '';

export interface SizingConfig {
    samPercentage: number;
    somPercentage: number;
    naicsCode?: string;
    naicsTitle?: string;
    geography?: string;
    selectedSegments: string[];
    yearRange?: { start: number; end: number };
}

export interface NaicsCode {
    code: string;
    title: string;
    description?: string | null;
}

export interface StateInfo {
    name: string;
    abbreviation: string;
    fips: string;
}

export interface TrendDataPoint {
    year: string;
    metric: string;
    value: number;
}

export interface IndustryTrends {
    naics_code: string;
    industry_title: string;
    source_url: string;
    download_url: string;
    summary: string;
    reference_url: string;
    trends: TrendDataPoint[];
    growth_rate_5yr?: number | null;
}

export interface IntelUpdate {
    source: string;
    summary: string;
    title: string;
    url: string | null;
}

export interface DailyIntel {
    date: string;
    sentiment: string;
    updates: IntelUpdate[];
}

export interface InterviewQuestion {
    question: string;
    rationale: string;
    category: string;
}

export interface DiscoveredCompetitor {
    name: string;
    description: string;
    differentiator: string;
    stage: string;
    url: string | null;
    relevance: string;
}

export const useSizingConfigLogic = (
    initialConfig: SizingConfig,
    onConfigChange: (config: SizingConfig) => void,
    onClose: () => void,
    arpu: number,
    convexClient?: { action: (ref: any, args: any) => Promise<any> },
    canvasData?: { problem?: string; segments?: string; businessName?: string; businessDescription?: string }
) => {
    const [activeTab, setActiveTab] = useState<'naics' | 'geography' | 'trends' | 'config' | 'segments' | 'compare' | 'interview' | 'discover'>('naics');
    const [localConfig, setLocalConfig] = useState<SizingConfig>(initialConfig);

    // Sync local config when prop changes
    useEffect(() => {
        setLocalConfig(initialConfig);
    }, [initialConfig]);

    const handleApply = () => {
        onConfigChange(localConfig);
        onClose();
    };

    // NAICS Search State (deprecated API - kept for UI structure)
    const [naicsSearch, setNaicsSearch] = useState('');
    const [naicsResults, setNaicsResults] = useState<NaicsCode[]>([]);
    const [naicsLoading, setNaicsLoading] = useState(false);

    // States List State
    const [states, setStates] = useState<StateInfo[]>([]);
    const [statesLoading, setStatesLoading] = useState(false);

    // Industry Trends State
    const [trends, setTrends] = useState<IndustryTrends | null>(null);
    const [trendsLoading, setTrendsLoading] = useState(false);
    const [trendsError, setTrendsError] = useState<string | null>(null);
    const [availableYearRange, setAvailableYearRange] = useState<{ start: number; end: number } | null>(null);

    // Daily Market Intelligence State
    const [dailyIntel, setDailyIntel] = useState<DailyIntel | null>(null);
    const [intelLoading, setIntelLoading] = useState(false);
    const [intelError, setIntelError] = useState<string | null>(null);

    // Confidence Score State
    const [localConfidence, setLocalConfidence] = useState<{
        score: number;
        level: string;
        factors: string[];
    } | null>(null);
    const [confidenceLoading, setConfidenceLoading] = useState(false);

    // Help Accordion States
    const [showAssumptionsHelp, setShowAssumptionsHelp] = useState(false);
    const [showTrendsHelp, setShowTrendsHelp] = useState(false);
    const [showSegmentHelp, setShowSegmentHelp] = useState(false);
    const [showDailyIntel, setShowDailyIntel] = useState(false);

    // --- Interview Script Generator State ---
    const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
    const [interviewLoading, setInterviewLoading] = useState(false);
    const [interviewError, setInterviewError] = useState<string | null>(null);

    // --- AI Competitor Discovery State ---
    const [discoveredCompetitors, setDiscoveredCompetitors] = useState<DiscoveredCompetitor[]>([]);
    const [competitorLoading, setCompetitorLoading] = useState(false);
    const [competitorError, setCompetitorError] = useState<string | null>(null);

    // Fetch NAICS codes on search via Go Provisioning API
    const searchNaics = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setNaicsResults([]);
            return;
        }

        if (!API_BASE) {
            setNaicsResults([]);
            return;
        }

        setNaicsLoading(true);
        try {
            const headers: Record<string, string> = { 'Accept': 'application/json' };
            if (API_KEY) headers['X-API-Key'] = API_KEY;
            if (DEPLOY_ID) headers['X-Deployment-ID'] = DEPLOY_ID;

            const res = await fetch(`${API_BASE}/api/naics/search?q=${encodeURIComponent(query)}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setNaicsResults(data.codes || data.items || data || []);
            } else {
                setNaicsResults([]);
            }
        } catch (err) {
            setNaicsResults([]);
        } finally {
            setNaicsLoading(false);
        }
    }, []);

    // Debounced NAICS search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (naicsSearch) searchNaics(naicsSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [naicsSearch, searchNaics]);

    // States, Trends, Intel, Confidence fetches are disabled (API deprecated)
    // Keeping state structure for backward compatibility

    // --- Interview Script Generator ---
    const generateInterviewQuestions = useCallback(async () => {
        if (!convexClient) {
            setInterviewError('AI service not available.');
            return;
        }
        if (!canvasData?.problem && !canvasData?.segments) {
            setInterviewError('Add a Problem Statement and Customer Segments to your Canvas first.');
            return;
        }

        setInterviewLoading(true);
        setInterviewError(null);
        try {
            // Dynamic import to avoid circular deps
            const { api } = await import('../convex/_generated/api');
            const result = await convexClient.action(api.ai.generateInterviewScript, {
                problem: canvasData?.problem || 'Not specified',
                segments: canvasData?.segments || 'Not specified',
                businessName: canvasData?.businessName || undefined
            });
            setInterviewQuestions(result.questions || []);
        } catch (err: any) {
            setInterviewError(err.message || 'Failed to generate interview questions.');
        } finally {
            setInterviewLoading(false);
        }
    }, [convexClient, canvasData]);

    // --- AI Competitor Discovery ---
    const discoverCompetitors = useCallback(async () => {
        if (!convexClient) {
            setCompetitorError('AI service not available.');
            return;
        }
        const description = canvasData?.businessDescription || canvasData?.problem || '';
        if (!description) {
            setCompetitorError('Add a business description or Problem Statement to your Canvas first.');
            return;
        }

        setCompetitorLoading(true);
        setCompetitorError(null);
        try {
            const { api } = await import('../convex/_generated/api');
            const result = await convexClient.action(api.ai.discoverCompetitors, {
                businessDescription: description,
                industry: localConfig.naicsTitle || undefined,
                segments: canvasData?.segments || undefined
            });
            if (result.error) {
                setCompetitorError(result.error);
            } else {
                setDiscoveredCompetitors(result.competitors || []);
            }
        } catch (err: any) {
            setCompetitorError(err.message || 'Failed to discover competitors.');
        } finally {
            setCompetitorLoading(false);
        }
    }, [convexClient, canvasData, localConfig.naicsTitle]);

    return {
        activeTab, setActiveTab,
        localConfig, setLocalConfig,
        handleApply,
        naicsSearch, setNaicsSearch,
        naicsResults, naicsLoading,
        states, statesLoading,
        trends, trendsLoading, trendsError, availableYearRange,
        dailyIntel, intelLoading, intelError,
        localConfidence, confidenceLoading,
        showAssumptionsHelp, setShowAssumptionsHelp,
        showTrendsHelp, setShowTrendsHelp,
        showSegmentHelp, setShowSegmentHelp,
        showDailyIntel, setShowDailyIntel,
        // New: Interview Script Generator
        interviewQuestions, interviewLoading, interviewError, generateInterviewQuestions,
        // New: AI Competitor Discovery
        discoveredCompetitors, competitorLoading, competitorError, discoverCompetitors
    };
};
