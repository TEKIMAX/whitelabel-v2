import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData, AISettings, Feature, EisenhowerQuadrant } from '../types';
import { useCreateFeature } from '../hooks/useCreate';
import { useUpdateFeature } from '../hooks/useUpdate';
import { useDeleteFeature } from '../hooks/useDelete';
import { useActiveModel } from './useActiveModel';

export const useEisenhowerMatrixLogic = (
    data: StartupData,
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void,
    settings: AISettings
) => {
    const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'matrix' | 'list' | 'completed'>('matrix');
    const { activeModel } = useActiveModel();

    // Add Task Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formStep, setFormStep] = useState(1);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [targetQuadrant, setTargetQuadrant] = useState<EisenhowerQuadrant | 'Uncategorized'>('Uncategorized');
    // Local optimistic features state
    const [localFeatures, setLocalFeatures] = useState<Feature[]>(data.features);

    // Connected OKR State
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [selectedKeyResultId, setSelectedKeyResultId] = useState<string>('');
    const [filterGoalId, setFilterGoalId] = useState<string | 'all'>('all');

    const activeGoals = data.goals?.filter(g => g.status !== 'Completed' && !g.archived) || [];
    const keyResultsForSelectedGoal = selectedGoalId ? activeGoals.find(g => g.id === selectedGoalId)?.keyResults || [] : [];

    useEffect(() => {
        setLocalFeatures(data.features);
    }, [data.features]);

    const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
    const [taskTags, setTaskTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [filterTag, setFilterTag] = useState<string | 'all'>('all');

    // Strategy Context State
    const [showContext, setShowContext] = useState(false);
    const [showPhilosophy, setShowPhilosophy] = useState(false);
    const [humanSkills, setHumanSkills] = useState('');
    const [resources, setResources] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // AI Config Dialog State
    const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState({
        teamSkills: '',
        budget: '',
        manpower: '',
        timeline: '',
        techStack: '',
        customInstructions: '',
    });

    // Load saved AI config from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('eisenhower_ai_config');
            if (saved) setAiConfig(JSON.parse(saved));
        } catch { }
    }, []);

    const updateAiConfig = (field: string, value: string) => {
        setAiConfig(prev => {
            const next = { ...prev, [field]: value };
            localStorage.setItem('eisenhower_ai_config', JSON.stringify(next));
            return next;
        });
    };

    // Mutations
    const addFeature = useCreateFeature();
    const updateFeature = useUpdateFeature();
    const deleteFeature = useDeleteFeature();
    const callOllama = useAction(api.ollamaService.callOllama);

    // Fetch users
    const users = useQuery(api.users.listByOrg, { orgId: data.orgId || "personal" });

    // Filter Logic
    const allTags = Array.from(new Set(localFeatures.flatMap(f => f.tags || []))).sort();

    const filteredFeatures = localFeatures.filter(f => {
        if (filterGoalId !== 'all' && f.connectedGoalId !== filterGoalId) return false;
        if (filterTag === 'all') return true;
        return f.tags?.includes(filterTag);
    });

    const uncategorized = filteredFeatures.filter(f => (!f.eisenhowerQuadrant || f.eisenhowerQuadrant === 'Uncategorized') && f.status !== 'Done');
    const completed = filteredFeatures.filter(f => f.status === 'Done');

    // -- AI Logic --
    const runAIPrioritization = async (config?: typeof aiConfig) => {
        if (uncategorized.length === 0) {
            toast.warning("No tasks in backlog to prioritize.");
            return;
        }
        setIsAIConfigOpen(false);
        setIsAnalyzing(true);

        const cfg = config || aiConfig;

        try {
            const tasksJson = JSON.stringify(uncategorized.map(f => ({ id: f.id, title: f.title, description: f.description })));

            const contextParts = [
                cfg.teamSkills ? `Team Skills: ${cfg.teamSkills}` : `Team Skills: ${humanSkills || "General full-stack development"}`,
                cfg.budget ? `Budget Constraints: ${cfg.budget}` : null,
                cfg.manpower ? `Manpower/Team Size: ${cfg.manpower}` : null,
                cfg.timeline ? `Timeline: ${cfg.timeline}` : null,
                cfg.techStack ? `Tech Stack: ${cfg.techStack}` : null,
                cfg.customInstructions ? `Additional Instructions: ${cfg.customInstructions}` : null,
                resources ? `Other Constraints: ${resources}` : null,
            ].filter(Boolean).join('\n');

            const systemPrompt = `You are a Strategic Project Manager using the Eisenhower Matrix.
Categorize each task into one of these quadrants: 'Do', 'Schedule', 'Delegate', 'Eliminate'.
- 'Do': High value, urgent, matches team skills and available resources.
- 'Schedule': High value, not urgent, worth investing in when capacity allows.
- 'Delegate': Low strategic value, urgent, or mismatch with core team skills.
- 'Eliminate': Low value, low urgency, doesn't justify the resource investment.
Factor in budget, manpower, timeline, and tech stack constraints.
Return ONLY a JSON array: [{ "id": "task_id", "quadrant": "Do" }, ...]`;

            const userPrompt = `CONTEXT:\n${contextParts}\n\nTASKS TO SORT:\n${tasksJson}`;

            const responseText = await callOllama({
                model: activeModel || settings.modelName || 'gemini-2.0-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                jsonMode: true,
            });

            const result = JSON.parse(responseText || "[]");

            if (Array.isArray(result)) {
                result.forEach((r: any) => {
                    const originalFeature = uncategorized.find(f => f.id === r.id);
                    const currentTags = originalFeature?.tags || [];
                    const newTags = currentTags.includes('AI Assisted') ? currentTags : [...currentTags, 'AI Assisted'];

                    updateFeature({
                        id: r.id as any,
                        updates: {
                            eisenhowerQuadrant: r.quadrant,
                            priority: r.quadrant === 'Do' ? 'High' : r.quadrant === 'Schedule' ? 'Medium' : 'Low',
                            source: 'AI',
                            tags: newTags
                        }
                    });
                });

                onUpdateProject(p => ({
                    ...p,
                    features: p.features.map(f => {
                        const suggestion = result.find((r: any) => r.id === f.id);
                        if (suggestion) {
                            return {
                                ...f,
                                eisenhowerQuadrant: suggestion.quadrant,
                                priority: suggestion.quadrant === 'Do' ? 'High' : suggestion.quadrant === 'Schedule' ? 'Medium' : 'Low',
                                source: 'AI',
                                tags: [...(f.tags || []), 'AI Assisted']
                            };
                        }
                        return f;
                    })
                }));
            }

        } catch (e) {
            console.error('[AI Prioritization]', e);
            toast.error("AI Prioritization failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // -- DnD Logic --
    const [dragOverQuadrant, setDragOverQuadrant] = useState<EisenhowerQuadrant | 'Uncategorized' | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setTimeout(() => setDraggedFeatureId(id), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragEnd = () => {
        setDraggedFeatureId(null);
    };

    const handleDragOver = (e: React.DragEvent, quadrantId: EisenhowerQuadrant | 'Uncategorized') => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverQuadrant !== quadrantId) {
            setDragOverQuadrant(quadrantId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverQuadrant(null);
    };

    const handleDrop = (e: React.DragEvent, quadrant: EisenhowerQuadrant | 'Uncategorized') => {
        e.preventDefault();
        setDragOverQuadrant(null);
        if (draggedFeatureId) {
            updateFeatureQuadrant(draggedFeatureId, quadrant);
            setDraggedFeatureId(null);
        }
    };

    const updateFeatureQuadrant = (id: string, quadrant: EisenhowerQuadrant | 'Uncategorized') => {
        let newPriority: 'High' | 'Medium' | 'Low' = 'Medium';
        if (quadrant === 'Do') newPriority = 'High';
        else if (quadrant === 'Schedule') newPriority = 'Medium';
        else if (quadrant === 'Delegate') newPriority = 'Low';
        else if (quadrant === 'Eliminate') newPriority = 'Low';

        onUpdateProject(p => ({
            ...p,
            features: p.features.map(f => {
                if (f.id !== id) return f;
                // Manual move override
                const newTags = (f.tags || []).filter(t => t !== 'AI Assisted' && t !== 'Human Edited');
                newTags.push('Human Edited');
                return { ...f, eisenhowerQuadrant: quadrant, priority: newPriority, source: 'Human', tags: newTags };
            })
        }));

        // Retrieve current tags to update properly for backend sync
        const feature = localFeatures.find(f => f.id === id);
        const currentTags = feature?.tags || [];
        const newTags = currentTags.filter(t => t !== 'AI Assisted' && t !== 'Human Edited');
        newTags.push('Human Edited');

        updateFeature({
            id: id as any,
            updates: {
                eisenhowerQuadrant: quadrant,
                priority: newPriority,
                source: 'Human',
                tags: newTags
            }
        });
    };

    // -- CRUD Actions --
    const openAddModal = (quadrant: EisenhowerQuadrant | 'Uncategorized') => {
        setTargetQuadrant(quadrant);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setAssignedUserIds([]);
        setTaskTags([]);
        setTagInput('');
        setSelectedGoalId('');
        setSelectedKeyResultId('');
        setEditingFeatureId(null);
        setFormStep(1);
        setIsAddModalOpen(true);
    };

    const openEditModal = (f: Feature) => {
        setTargetQuadrant(f.eisenhowerQuadrant || 'Uncategorized');
        setNewTaskTitle(f.title);
        setNewTaskDesc(f.description || '');
        setAssignedUserIds(f.assignedTo || []);
        setTaskTags(f.tags || []);
        setTagInput('');
        setSelectedGoalId(f.connectedGoalId || '');
        setSelectedKeyResultId(f.connectedKeyResultId || '');
        setEditingFeatureId(f.id);
        setFormStep(1);
        setIsAddModalOpen(true);
    };

    const handleSaveTask = () => {
        if (!newTaskTitle.trim()) return;

        if (editingFeatureId) {
            // Update existing
            const updates = {
                title: newTaskTitle,
                description: newTaskDesc,
                eisenhowerQuadrant: targetQuadrant,
                assignedTo: assignedUserIds,
                tags: taskTags,
                priority: (targetQuadrant === 'Do' ? 'High' : targetQuadrant === 'Schedule' ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
                connectedGoalId: selectedGoalId || undefined,
                connectedKeyResultId: selectedKeyResultId || undefined
            };

            onUpdateProject(p => ({
                ...p,
                features: p.features.map(f => f.id === editingFeatureId ? { ...f, ...updates, priority: updates.priority as any } : f)
            }));

            setLocalFeatures(prev => prev.map(f => f.id === editingFeatureId ? { ...f, ...updates, priority: updates.priority as any } : f));

            updateFeature({
                id: editingFeatureId as any,
                updates: { ...updates, priority: updates.priority as any }
            });
        } else {
            // Create new
            // Optimistic
            const tempId = Date.now().toString();
            const newFeature: Feature = {
                id: tempId,
                title: newTaskTitle,
                description: newTaskDesc,
                status: 'Backlog',
                priority: targetQuadrant === 'Do' ? 'High' : targetQuadrant === 'Schedule' ? 'Medium' : 'Low',
                eisenhowerQuadrant: targetQuadrant,
                assignedTo: assignedUserIds,
                tags: taskTags,
                connectedGoalId: selectedGoalId || undefined,
                connectedKeyResultId: selectedKeyResultId || undefined
            };

            onUpdateProject(p => ({
                ...p,
                features: [...p.features, newFeature]
            }));

            setLocalFeatures(prev => [...prev, newFeature]);

            // Persist
            addFeature({
                projectId: data.id,
                title: newTaskTitle,
                description: newTaskDesc,
                status: 'Backlog',
                priority: newFeature.priority,
                eisenhowerQuadrant: targetQuadrant,
                assignedTo: assignedUserIds,
                tags: taskTags,
                connectedGoalId: selectedGoalId || undefined,
                connectedKeyResultId: selectedKeyResultId || undefined
            });
        }

        setIsAddModalOpen(false);
        setEditingFeatureId(null);
    };

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = () => {
        if (deleteConfirmId) {
            onUpdateProject(p => ({
                ...p,
                features: p.features.filter(f => f.id !== deleteConfirmId)
            }));

            setLocalFeatures(prev => prev.filter(f => f.id !== deleteConfirmId));

            deleteFeature({ id: deleteConfirmId as any });
            setDeleteConfirmId(null);
        }
    };

    const toggleComplete = (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Done' ? 'Backlog' : 'Done';
        onUpdateProject(p => ({
            ...p,
            features: p.features.map(f => f.id === id ? { ...f, status: newStatus } : f)
        }));
        updateFeature({
            id: id as any,
            updates: { status: newStatus }
        });
    };

    // -- Render Helpers --
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const getRandomColor = (id: string) => {
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
        return colors[id.charCodeAt(0) % colors.length];
    };

    return {
        draggedFeatureId, setDraggedFeatureId,
        viewMode, setViewMode,
        isAddModalOpen, setIsAddModalOpen,
        formStep, setFormStep,
        newTaskTitle, setNewTaskTitle,
        newTaskDesc, setNewTaskDesc,
        targetQuadrant, setTargetQuadrant,
        localFeatures, setLocalFeatures,
        selectedGoalId, setSelectedGoalId,
        selectedKeyResultId, setSelectedKeyResultId,
        filterGoalId, setFilterGoalId,
        editingFeatureId, setEditingFeatureId,
        deleteConfirmId, setDeleteConfirmId,
        assignedUserIds, setAssignedUserIds,
        taskTags, setTaskTags,
        tagInput, setTagInput,
        filterTag, setFilterTag,
        showContext, setShowContext,
        showPhilosophy, setShowPhilosophy,
        humanSkills, setHumanSkills,
        resources, setResources,
        isAnalyzing, setIsAnalyzing,
        isAIConfigOpen, setIsAIConfigOpen,
        aiConfig, updateAiConfig,
        dragOverQuadrant, setDragOverQuadrant,
        activeGoals, keyResultsForSelectedGoal,
        users, allTags, filteredFeatures, uncategorized, completed,
        runAIPrioritization,
        handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
        updateFeatureQuadrant,
        openAddModal, openEditModal,
        handleSaveTask, handleDelete, confirmDelete, toggleComplete,
        getInitials, getRandomColor
    };
};
