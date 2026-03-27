'use client';

import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ModelEntry {
    provider: string;
    modelId: string;
    isDefault: boolean;
}

const STORAGE_KEY = 'activeAIModel';

/**
 * useActiveModel — reusable hook that reads enabled models from Convex
 * and manages the active model selection via localStorage.
 *
 * Usage:
 *   const { models, activeModel, setActiveModel, displayName, isLoading } = useActiveModel();
 */
export function useActiveModel() {
    const modelConfig = useQuery(api.model_config.getModelConfig);
    const models: ModelEntry[] = modelConfig?.selectedModels ?? [];

    const [activeModel, setActiveModelState] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || '';
    });

    // Auto-select default when models load
    useEffect(() => {
        if (models.length > 0 && !activeModel) {
            const defaultModel = models.find((m) => m.isDefault);
            const fallback = defaultModel?.modelId || models[0]?.modelId || '';
            setActiveModelState(fallback);
            localStorage.setItem(STORAGE_KEY, fallback);
        }
    }, [models, activeModel]);

    const setActiveModel = useCallback((modelId: string) => {
        setActiveModelState(modelId);
        localStorage.setItem(STORAGE_KEY, modelId);
    }, []);

    const activeEntry = useMemo(
        () => models.find((m) => m.modelId === activeModel),
        [models, activeModel],
    );

    const displayName = useMemo(() => {
        if (!activeEntry) return 'Select Model';
        return activeEntry.modelId.split('/').pop() || activeEntry.modelId;
    }, [activeEntry]);

    const getCapabilities = useAction(api.ollamaService.getCapabilities);
    const [capabilities, setCapabilities] = useState<string[]>(['tools', 'vision', 'completion']);
    
    useEffect(() => {
        if (activeModel) {
            getCapabilities({ modelName: activeModel })
                .then(caps => setCapabilities(caps))
                .catch(e => console.error('Failed to load model caps:', e));
        } else {
            setCapabilities(['tools', 'vision', 'completion']);
        }
    }, [activeModel, getCapabilities]);

    return {
        /** All enabled models from Convex config */
        models,
        /** Currently active model ID (e.g. "google/gemini-2.0-flash") */
        activeModel,
        /** Set the active model */
        setActiveModel,
        /** The full entry for the active model */
        activeEntry,
        /** Short display name (last segment) */
        displayName,
        /** True while Convex query is loading */
        isLoading: modelConfig === undefined,
        /** True when there are configured models */
        hasModels: models.length > 0,
        /** Capabilities of active model */
        capabilities,
    };
}
