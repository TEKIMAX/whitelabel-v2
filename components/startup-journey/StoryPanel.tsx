import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import React, { useState } from 'react';
import { Wand2, ChevronLeft, ChevronRight, Save, History } from 'lucide-react';
import Confetti from 'react-confetti';
import { MiniStoryEditor } from './MiniStoryEditor';
import { StartupData } from '../../types';
import { useActiveModel } from '../../hooks/useActiveModel';

interface StoryPanelProps {
    data: StartupData;
    updateProject: any;
    onUpdateProject?: (updater: (project: StartupData) => StartupData) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onSaveToCloud: () => void;
}

export const StoryPanel: React.FC<StoryPanelProps> = ({ data, updateProject, onUpdateProject, isCollapsed, onToggleCollapse, onSaveToCloud }) => {
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState<string>('current');
    const generateStory = useAction(api.ai.generateStartupJourneyStory);
    const { activeModel, capabilities } = useActiveModel();
    const hasTools = capabilities.includes('tools') || capabilities.includes('websearch');

    const handleGenerateStory = async () => {
        setIsGeneratingStory(true);
        try {
            const story = await generateStory({ startupData: data, modelName: activeModel || undefined });
            await updateProject({
                id: data.id as any,
                updates: {
                    journeyStoryContent: story
                }
            });
            if (onUpdateProject) {
                onUpdateProject(prev => ({ ...prev, journeyStoryContent: story }));
            }
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
        } finally {
            setIsGeneratingStory(false);
        }
    };

    const displayedContent = selectedVersionId === 'current'
        ? (data.journeyStoryContent || '')
        : (data.journeyStoryVersions?.find(v => v.id === selectedVersionId)?.content || '');

    return (
        <div className={`border-r border-stone-200 bg-stone-50 relative flex flex-col h-full transition-all duration-300 z-30 ${isCollapsed ? 'w-12' : 'w-[45%]'}`}>
            {showSuccess && <Confetti numberOfPieces={200} recycle={false} />}

            {/* Collapse/Expand Toggle - Centered Vertical Pill */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 h-16 w-6 bg-white border border-stone-200 rounded-r-xl flex items-center justify-center shadow-md text-stone-400 hover:text-nobel-gold hover:bg-stone-50 transition-all cursor-pointer"
                title={isCollapsed ? "Expand Origin Story" : "Collapse Origin Story"}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Scrollable Content Container */}
            <div className="w-full h-full overflow-y-auto flex flex-col">
                {!isCollapsed && (
                    <>
                        <div className="p-8 border-b border-stone-200 bg-white sticky top-0 z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <h2 className="font-serif text-3xl font-bold text-stone-900 shrink-0">Origin Story</h2>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded px-2 py-1.5">
                                    <History className="w-3 h-3 text-stone-400 shrink-0" />
                                    <select
                                        value={selectedVersionId}
                                        onChange={(e) => setSelectedVersionId(e.target.value)}
                                        className="bg-transparent text-xs font-bold uppercase tracking-wider text-stone-600 outline-none cursor-pointer max-w-[120px] sm:max-w-none"
                                    >
                                        <option value="current">Current Draft</option>
                                        {data.journeyStoryVersions && data.journeyStoryVersions.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} - {new Date(v.createdAt).toLocaleDateString()}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedVersionId === 'current' && (
                                    <button
                                        onClick={onSaveToCloud}
                                        disabled={!data.journeyStoryContent}
                                        title="Save to Document Library"
                                        className="flex items-center gap-2 px-3 py-2 border border-stone-200 bg-white text-stone-600 text-xs font-bold uppercase tracking-widest hover:bg-stone-50 hover:text-stone-900 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-3 h-3" /> Save Version
                                    </button>
                                )}

                                {selectedVersionId !== 'current' && (
                                    <button
                                        onClick={() => {
                                            updateProject({
                                                id: data.id as any,
                                                updates: {
                                                    journeyStoryContent: displayedContent
                                                }
                                            });
                                            if (onUpdateProject) {
                                                onUpdateProject(prev => ({ ...prev, journeyStoryContent: displayedContent }));
                                            }
                                            setSelectedVersionId('current');
                                            import('sonner').then(({ toast }) => toast.success("Version restored"));
                                        }}
                                        title="Restore this version to current draft"
                                        className="flex items-center gap-2 px-3 py-2 border border-stone-200 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shrink-0"
                                    >
                                        <History className="w-3 h-3" /> Restore Version
                                    </button>
                                )}

                                <div className="relative group/tooltip">
                                    <button
                                        onClick={handleGenerateStory}
                                        disabled={isGeneratingStory || !hasTools}
                                        className={`flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-none text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors disabled:opacity-50 shrink-0 ${!hasTools ? 'cursor-not-allowed' : ''}`}
                                    >
                                        {isGeneratingStory ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Writing...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-3 h-3" /> AI Writer
                                            </>
                                        )}
                                    </button>
                                    {!isGeneratingStory && !hasTools && (
                                        <div className="absolute top-full mt-2 right-0 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none">
                                            Selected model does not support tool calling.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col p-8 pt-0 pb-8">
                            <MiniStoryEditor
                                className="flex-grow min-h-[500px]"
                                content={displayedContent}
                                readOnly={selectedVersionId !== 'current'}
                                onChange={(newContent) => {
                                    if (selectedVersionId === 'current') {
                                        updateProject({
                                            id: data.id as any,
                                            updates: { journeyStoryContent: newContent }
                                        });
                                        if (onUpdateProject) {
                                            onUpdateProject(prev => ({ ...prev, journeyStoryContent: newContent }));
                                        }
                                    }
                                }}
                            />
                        </div>
                    </>
                )}

                {/* Collapsed State - Vertical Text */}
                {isCollapsed && (
                    <div className="flex items-center justify-center h-full cursor-pointer hover:bg-stone-100 transition-colors" onClick={onToggleCollapse}>
                        <div className="transform -rotate-90 whitespace-nowrap">
                            <span className="font-serif text-sm font-bold text-stone-400 tracking-wider">ORIGIN STORY</span>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
