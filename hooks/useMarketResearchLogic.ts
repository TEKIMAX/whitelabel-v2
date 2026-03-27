import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCreateDocument } from "../hooks/useCreate";
import { toast } from 'sonner';
import { marked } from 'marked';
import { Id } from '../convex/_generated/dataModel';
import { StartupData, AISettings } from '../types';

const AI_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export const useMarketResearchLogic = (
    data: StartupData,
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void,
    settings: AISettings
) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<{ name: string, data: string, mimeType: string }[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [keywords, setKeywords] = useState<string[]>(data.market.keywords || []);
    const [newKeyword, setNewKeyword] = useState("");
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const updateMarket = useMutation(api.market.updateMarket);
    const startResearch = useMutation(api.marketResearch.startResearch);
    const resetStatus = useMutation(api.market.resetMarketStatus);
    const createDocument = useCreateDocument();

    // Sync local state with prop data
    useEffect(() => {
        if (data.market.keywords) {
            setKeywords(data.market.keywords);
        }
    }, [data.market.keywords]);

    // Reset isGenerating when market analysis completes (status changes from 'analyzing')
    useEffect(() => {
        if (data.market.status && data.market.status !== 'analyzing') {
            setIsGenerating(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }
    }, [data.market.status]);

    // Auto-detect stuck 'analyzing' state on mount (e.g. page refresh while generating)
    useEffect(() => {
        if (data.market.status === 'analyzing') {
            setIsGenerating(true);
            // Start a recovery timeout
            timeoutRef.current = setTimeout(() => {
                handleTimeout();
            }, AI_TIMEOUT_MS);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []); // Only on mount

    const handleTimeout = () => {
        setIsGenerating(false);
        onUpdateProject(p => ({
            ...p,
            market: { ...p.market, status: 'timeout' }
        }));
        // Persist to Convex so reactive query picks it up
        resetStatus({ projectId: data.id, status: 'timeout' }).catch(() => { });
        toast.error(
            'AI Analysis timed out after 3 minutes. The model may be slow or unavailable. Try again or check Convex logs.',
            { duration: 8000 }
        );
    };

    const handleSaveMarket = async (updates: Partial<typeof data.market>) => {
        const newMarket = { ...data.market, ...updates };

        // Optimistic update
        onUpdateProject(p => ({
            ...p,
            market: newMarket
        }));

        // Persist to Convex
        try {
            await updateMarket({
                projectId: data.id,
                tam: newMarket.tam,
                sam: newMarket.sam,
                som: newMarket.som,
                reportContent: newMarket.reportContent,
                keywords: newMarket.keywords,
                tags: newMarket.tags,
                creatorProfile: newMarket.creatorProfile,
                source: newMarket.source
            });
        } catch (error) {
        }
    };

    const handleAddKeyword = () => {
        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
            const updatedKeywords = [...keywords, newKeyword.trim()];
            setKeywords(updatedKeywords);
            setNewKeyword("");
            handleSaveMarket({ keywords: updatedKeywords });
        }
    };

    const handleRemoveKeyword = (keyword: string) => {
        const updatedKeywords = keywords.filter(k => k !== keyword);
        setKeywords(updatedKeywords);
        handleSaveMarket({ keywords: updatedKeywords });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        const base64String = reader.result.split(',')[1];
                        setAttachedFiles(prev => [...prev, {
                            name: file.name,
                            data: base64String,
                            mimeType: file.type
                        }]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleStop = () => {
        // Clear timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        // Reset state immediately
        setIsGenerating(false);
        // Reset market status in Convex DB (not just optimistic)
        onUpdateProject(p => ({
            ...p,
            market: { ...p.market, status: 'cancelled' }
        }));
        resetStatus({ projectId: data.id, status: 'cancelled' }).catch(() => { });
        toast.info("Market research cancelled.");
    };

    const handleGenerate = async () => {
        setIsGenerating(true);

        // Start client-side timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleTimeout();
        }, AI_TIMEOUT_MS);

        try {
            if (attachedFiles.length > 0) {
                toast.info(`Including ${attachedFiles.length} attached document(s) in analysis context.`);
            }

            // Trim startupData to avoid Convex 1 MiB value limit
            const trimmedData = {
                name: data.name || '',
                hypothesis: data.hypothesis || '',
                canvas: data.canvas || {},
                market: { tam: data.market?.tam || 0, sam: data.market?.sam || 0, som: data.market?.som || 0 },
                goals: (data.goals || []).slice(0, 5).map((g: any) => ({ title: g.title, status: g.status })),
                features: (data.features || []).slice(0, 10).map((f: any) => ({ title: f.title, status: f.status })),
            };

            await startResearch({
                projectId: data.id,
                startupData: trimmedData,
                keywords: keywords,
                attachedFiles: attachedFiles.slice(0, 3), // Limit files too
                modelName: settings.modelName
            });

            onUpdateProject(p => ({
                ...p,
                market: {
                    ...p.market,
                    status: 'analyzing'
                }
            }));

            toast.success('Deep Research initiated. Analyzing market data...');

        } catch (error: any) {
            toast.error('Failed to start Market Research agents.');
            setIsGenerating(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }
    };

    const handleSaveToDocs = async (folderId: string | null, filename: string) => {
        if (!data.market.reportContent) return;

        try {
            const htmlContent = await marked.parse(data.market.reportContent);

            const docTags = data.market.tags?.map(tag => ({
                name: tag,
                color: tag === 'AI Assisted' ? '#7c007c' : '#f17a35'
            })) || [];

            await createDocument({
                projectId: data.id,
                folderId: folderId ? folderId as Id<"folders"> : undefined,
                title: filename.endsWith('.md') ? filename : `${filename}.md`,
                content: htmlContent,
                type: 'doc',
                tags: docTags
            });
            toast.success("Saved to documents successfully");
            setIsSaveDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save to documents");
        }
    };

    return {
        isGenerating,
        setIsGenerating,
        attachedFiles,
        keywords,
        newKeyword,
        setNewKeyword,
        isSaveDialogOpen,
        setIsSaveDialogOpen,
        isEditing,
        setIsEditing,
        handleSaveMarket,
        handleAddKeyword,
        handleRemoveKeyword,
        handleFileUpload,
        removeFile,
        handleStop,
        handleGenerate,
        handleSaveToDocs
    };
};
