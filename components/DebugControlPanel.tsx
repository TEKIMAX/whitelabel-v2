import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { RefreshCw, Eye, Shield, AlertTriangle } from 'lucide-react';

const DebugControlPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const inspectData = useQuery(api.debug.inspectUser);
    const resetOnboarding = useMutation(api.debug.forceResetOnboarding);

    const [actionResult, setActionResult] = useState<string | null>(null);

    const handleReset = async () => {
        try {
            const result = await resetOnboarding();
            setActionResult(result);
            // Refresh logic if needed, but react query should update if keys change
            // Actually resetOnboarding updates DB, inspectUser should reflect it on next fetch
        } catch (e: any) {
            setActionResult(`Error: ${e.message}`);
        }
    };

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 left-4 z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                    title="Open Debug Panel"
                >
                    <Shield className="w-6 h-6" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white border border-stone-200 shadow-2xl rounded-xl p-4 w-96 max-h-[80vh] overflow-y-auto flex flex-col font-sans text-sm animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-2">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" /> Debug Controls
                </h3>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-stone-400 hover:text-stone-900"
                >
                    Close
                </button>
            </div>

            <div className="space-y-4">
                {/* Actions Section */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Actions</div>
                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-700 py-2 px-3 rounded-md transition-colors border border-stone-200 hover:border-red-200"
                    >
                        <AlertTriangle className="w-4 h-4" /> Reset Onboarding
                    </button>
                </div>

                {/* Result Message */}
                {actionResult && (
                    <div className="bg-stone-50 border border-stone-200 p-2 rounded text-xs text-stone-600 break-words">
                        {actionResult}
                    </div>
                )}

                {/* Inspector Section */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                            <Eye className="w-3 h-3" /> User State
                        </div>
                        <span className="text-[10px] text-stone-400">Live</span>
                    </div>

                    <div className="bg-stone-900 text-green-400 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar">
                        {inspectData ? (
                            <pre>{JSON.stringify(inspectData, null, 2)}</pre>
                        ) : (
                            <div className="flex items-center gap-2 text-stone-500">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-2 border-t border-stone-100 text-[10px] text-stone-400 text-center">
                Dev Mode Only
            </div>
        </div>
    );
};

export default DebugControlPanel;
