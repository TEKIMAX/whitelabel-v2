import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { StartupData, Goal, KeyResult } from "../types";
import { generateOKRProposal } from "../services/geminiService";
import { useCreateGoal, useCreateKeyResult } from "../hooks/useCreate";
import { useUpdateGoal, useUpdateKeyResult, useSyncKeyResult } from "../hooks/useUpdate";
import { useDeleteGoal, useDeleteKeyResult } from "../hooks/useDelete";
import { useActiveModel } from "./useActiveModel";

export const useGoalSettingLogic = (data: StartupData) => {
    // Mutations
    const createGoal = useCreateGoal();
    const updateGoalMutation = useUpdateGoal();
    const deleteGoalMutation = useDeleteGoal();
    const createKR = useCreateKeyResult();
    const updateKR = useUpdateKeyResult();
    const deleteKR = useDeleteKeyResult();
    const syncKR = useSyncKeyResult();
    const { activeModel } = useActiveModel();

    // State
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'overview' | 'kanban' | 'history' | 'roadmap'>('roadmap');
    const [detailViewMode, setDetailViewMode] = useState<'list' | 'board'>('list');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showAiProposal, setShowAiProposal] = useState(false);
    const [aiProposal, setAiProposal] = useState<{ rationale: string, goals: Goal[] } | null>(null);
    const [showContextReview, setShowContextReview] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

    // Local state for smooth input performance
    const [localGoalTitle, setLocalGoalTitle] = useState("");
    const [localGoalDescription, setLocalGoalDescription] = useState("");
    const [localKRData, setLocalKRData] = useState<Record<string, { description?: string, target?: any, current?: any, unit?: string }>>({});

    const lastEditingId = useRef<string | null>(null);

    // Sync local state when editingGoalId changes
    useEffect(() => {
        if (!editingGoalId) {
            setLocalGoalTitle("");
            setLocalGoalDescription("");
            setLocalKRData({});
            lastEditingId.current = null;
            return;
        }

        const goal = data.goals?.find(g => g.id === editingGoalId);
        if (!goal) return;

        if (editingGoalId !== lastEditingId.current) {
            // Hard reset when switching goals
            setLocalGoalTitle(goal.title || "");
            setLocalGoalDescription(goal.description || "");
            const krData: Record<string, any> = {};
            (goal.keyResults || []).forEach(kr => {
                krData[kr.id] = {
                    description: kr.description,
                    target: kr.target,
                    current: kr.current,
                    unit: kr.unit
                };
            });
            setLocalKRData(krData);
            lastEditingId.current = editingGoalId;
        } else {
            // Only add missing KRs to avoid overwriting typed content
            setLocalKRData(prev => {
                const newData = { ...prev };
                let changed = false;
                (goal.keyResults || []).forEach(kr => {
                    if (!newData[kr.id]) {
                        newData[kr.id] = {
                            description: kr.description,
                            target: kr.target,
                            current: kr.current,
                            unit: kr.unit
                        };
                        changed = true;
                    }
                });
                return changed ? newData : prev;
            });
        }
    }, [editingGoalId, data.goals]);

    // Auto‑sync effect for automatic KRs when editing a goal
    useEffect(() => {
        if (!editingGoalId) return;
        const activeGoal = data.goals?.find(g => g.id === editingGoalId);
        if (!activeGoal) return;
        (activeGoal.keyResults || []).forEach(kr => {
            if (kr.updateType === 'automatic') {
                syncKR({ id: kr.id }).catch(() => { });
            }
        });
    }, [editingGoalId, data.goals, syncKR]);

    // Actions
    const addGoal = async (status: any = 'Upcoming') => {
        setIsCreating(true);
        try {
            const goalId = await createGoal({
                projectId: data.id,
                title: "New Objective",
                description: "",
                type: "Strategic",
                timeframe: "Quarterly",
                status,
            });
            setEditingGoalId(goalId as any);
            toast.success("New objective created!");
        } catch (e: any) {
            toast.error('Failed to create goal. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const updateGoal = async (id: string, updates: Partial<Goal>) => {
        await updateGoalMutation({ id: id as any, updates });
    };

    const deleteGoal = async (id: string) => {
        setGoalToDelete(id);
    };

    const confirmDeleteGoal = async () => {
        if (goalToDelete) {
            await deleteGoalMutation({ id: goalToDelete as any });
            setGoalToDelete(null);
            setEditingGoalId(null);
            toast.success("Goal deleted successfully.");
        }
    };

    const addKeyResult = async (goalId: string) => {
        await createKR({
            goalId: goalId as any,
            description: "New Key Result",
            target: 100,
            unit: "%",
            updateType: 'manual',
        });
    };

    const updateKRHandler = async (goalId: string, krId: string, updates: Partial<KeyResult>) => {
        await updateKR({ id: krId as any, updates });
    };

    const deleteKeyResult = async (goalId: string, krId: string) => {
        await deleteKR({ id: krId as any });
    };

    const calculateProgress = (goal: Goal) => {
        if (!goal.keyResults || goal.keyResults.length === 0) return 0;
        const total = goal.keyResults.reduce((acc, kr) => {
            const p = Math.min(100, Math.max(0, (kr.current / kr.target) * 100));
            return acc + p;
        }, 0);
        return Math.round(total / goal.keyResults.length);
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        try {
            const dataStr = e.dataTransfer.getData("text/plain");
            if (!dataStr) return;
            const dataObj = JSON.parse(dataStr);
            if (dataObj.type !== 'goal') return;
            
            const goalId = dataObj.id;
            const goal = data.goals.find(g => g.id === goalId);
            if (!goal) return;
            if (goal.archived) return;

            await updateGoalMutation({
                id: goalId as any,
                updates: { status }
            });

            if (status === 'Completed') {
                await Promise.all((goal.keyResults || []).map(kr =>
                    updateKR({ id: kr.id as any, updates: { current: kr.target, status: 'Done' } })
                ));
            } else if (status === 'Upcoming') {
                await Promise.all((goal.keyResults || []).map(kr =>
                    updateKR({ id: kr.id as any, updates: { current: 0, status: 'Not Started' } })
                ));
            }
        } catch (err) {
            console.error("Drop error", err);
        }
    };

    const checkGoalCompletion = async (goalId: string, krUpdates: { id: string, status: string }[]) => {
        const goal = data.goals.find(g => g.id === goalId);
        if (!goal) return;

        const allKRsDone = (goal.keyResults || []).every(kr => {
            const update = krUpdates.find(u => u.id === kr.id);
            return (update ? update.status : kr.status) === 'Done';
        });

        if (allKRsDone && goal.status !== 'Completed') {
            await updateGoalMutation({
                id: goalId as any,
                updates: { status: 'Completed' }
            });
            toast.success("Goal completed! All metrics achieved.");
        }
    };

    const handleKRDrop = async (e: React.DragEvent, newStatus: string, goalId: string) => {
        try {
            const dataStr = e.dataTransfer.getData("text/plain");
            if (!dataStr) return;
            const dataObj = JSON.parse(dataStr);
            if (dataObj.type !== 'kr') return;
            
            const krId = dataObj.id;
            if (!krId) return;

        const goal = data.goals.find(g => g.id === goalId);
        const kr = goal?.keyResults?.find(k => k.id === krId);

        if (kr) {
            const updates: Partial<KeyResult> = { status: newStatus as any };
            if (newStatus === 'Done') {
                updates.current = kr.target;
            } else if (newStatus === 'Not Started') {
                updates.current = 0;
            }
            await updateKR({ id: krId as any, updates });

            if (goal) {
                if ((newStatus === 'In Progress' || newStatus === 'Done') && goal.status === 'Upcoming') {
                    await updateGoalMutation({
                        id: goalId as any,
                        updates: { status: 'In Progress' }
                    });
                    toast.info("Goal started automatically.");
                }

                if (newStatus === 'In Progress' && goal.status === 'Completed') {
                    await updateGoalMutation({
                        id: goalId as any,
                        updates: { status: 'In Progress' }
                    });
                    toast.info("Goal re-opened.");
                }
            }

            if (newStatus === 'Done') {
                await checkGoalCompletion(goalId, [{ id: krId, status: 'Done' }]);
            }
        }
        } catch (err) {
            console.error("KR Drop error", err);
        }
    };

    const handleArchive = async (goalId: string) => {
        await updateGoalMutation({
            id: goalId as any,
            updates: { archived: true }
        });
        toast.success("Goal archived to history.");
    };

    const handleOpenContextReview = () => {
        setShowContextReview(true);
    };

    const confirmContextAndGenerate = async () => {
        setIsGenerating(true);
        setShowContextReview(false);
        try {
            const proposal = await generateOKRProposal(data as any, {
                provider: 'google',
                modelName: activeModel || 'gemini-1.5-flash',
                // SA-001: Do not read API keys from client-side env.
                // Key must be provided server-side or via Convex action.
                apiKey: ''
            });

            if (proposal.goals.length > 0) {
                setAiProposal(proposal);
                setShowAiProposal(true);
            } else {
                toast.error("Could not generate suggestions. Please check if data is sufficient.");
            }
        } catch (error) {
            toast.error("Failed to generate goals.");
        } finally {
            setIsGenerating(false);
        }
    };

    const confirmAiProposal = async () => {
        if (!aiProposal) return;

        try {
            const goals = aiProposal.goals;
            
            // Determine current quarter and year as fallback
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;

            for (const goal of goals) {
                const newGoalId = await createGoal({
                    projectId: data.id as any,
                    title: goal.title || "New Objective",
                    description: goal.description || "",
                    type: goal.type || "Strategic",
                    timeframe: goal.timeframe || "Quarterly",
                    status: goal.status || "Upcoming",
                    quarter: (goal as any).quarter || currentQuarter,
                    year: (goal as any).year || currentYear,
                });

                for (const kr of (goal.keyResults || [])) {
                    await createKR({
                        goalId: newGoalId,
                        description: kr.description || "Key Result",
                        target: typeof (kr as any).target === 'string' ? parseFloat((kr as any).target.replace(/[^0-9.-]+/g, "")) || 0 : Number((kr as any).target) || 0,
                        unit: kr.unit || "units",
                        updateType: kr.updateType || 'manual',
                        metricSource: kr.metricSource || undefined,
                        current: kr.current || 0,
                        status: kr.status || 'Not Started'
                    });
                }
            }
            toast.success(`Created ${goals.length} strategic objectives.`);
            setShowAiProposal(false);
            setAiProposal(null);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to apply goals: " + error.message);
        }
    };

    return {
        // State
        editingGoalId, setEditingGoalId,
        activeView, setActiveView,
        detailViewMode, setDetailViewMode,
        isGenerating, setIsGenerating,
        isCreating, setIsCreating,
        showAiProposal, setShowAiProposal,
        aiProposal, setAiProposal,
        showContextReview, setShowContextReview,
        goalToDelete, setGoalToDelete,
        localGoalTitle, setLocalGoalTitle,
        localGoalDescription, setLocalGoalDescription,
        localKRData, setLocalKRData,

        // Actions
        addGoal,
        updateGoal,
        deleteGoal,
        confirmDeleteGoal,
        addKeyResult,
        updateKRHandler,
        deleteKeyResult,
        calculateProgress,
        handleDrop,
        handleKRDrop,
        handleArchive,
        handleOpenContextReview,
        confirmContextAndGenerate,
        confirmAiProposal,
        syncKR
    };
};
