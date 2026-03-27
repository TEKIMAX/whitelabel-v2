import React, { useState } from 'react';
import { useQuery, useMutation, useConvex } from 'convex/react';
import { api } from "../convex/_generated/api";
import { Plus, RefreshCw, Bug } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateManualCompetitor } from '../hooks/useCreate';

// Assuming StartupData is defined elsewhere or needs to be defined here
interface StartupData {
    projectId: string;
    // Add other properties of StartupData if known
}

interface ManualCompetitorTableProps {
    data: StartupData;
}

export const ManualCompetitorTable: React.FC<ManualCompetitorTableProps> = ({ data }) => {
    const convex = useConvex();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [showDebug, setShowDebug] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const competitors = useQuery(api.manual_competitors.listManualCompetitors, { projectId: data.projectId });
    // Mutations
    const addCompetitor = useCreateManualCompetitor();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }
        setIsSaving(true);
        try {
            await addCompetitor({
                projectId: data.projectId, // Corrected to use data.projectId
                name: name.trim(),
                source: website.trim(), // Added source field
                description: description.trim(), // Ensure description is still passed
            });
            setName("");
            setWebsite("");
            setDescription("");
            toast.success("Competitor added manually");
        } catch (error: any) {
            toast.error(`Failed to add competitor: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-stone-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900">Manual Competitor Entry</h2>
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="p-2 rounded-full hover:bg-stone-100 text-stone-500"
                    title="Toggle Debug View"
                >
                    <Bug className="w-5 h-5" />
                </button>
            </div>

            {/* Add Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Competitor Name *"
                    className="px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 outline-none"
                />
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 outline-none"
                />
                <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website"
                    className="px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 outline-none"
                />
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:bg-stone-400 transition-colors"
                >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Competitor
                </button>
            </form>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-stone-200">
                            <th className="py-3 px-4 font-semibold text-stone-600">Name</th>
                            <th className="py-3 px-4 font-semibold text-stone-600">Description</th>
                            <th className="py-3 px-4 font-semibold text-stone-600">Website</th>
                            <th className="py-3 px-4 font-semibold text-stone-600">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {competitors === undefined ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-stone-400">
                                    Loading...
                                </td>
                            </tr>
                        ) : competitors.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-stone-400">
                                    No competitors yet. Add one above.
                                </td>
                            </tr>
                        ) : (
                            competitors.map((c: any) => (
                                <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                                    <td className="py-3 px-4 font-medium text-stone-900">{c.name}</td>
                                    <td className="py-3 px-4 text-stone-600">{c.Description || '-'}</td>
                                    <td className="py-3 px-4 text-stone-600">
                                        {c.Website ? (
                                            <a href={c.Website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {c.Website}
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-stone-500 text-xs">
                                        {c.tags?.join(', ') || c.source}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Debug View */}
            {showDebug && (
                <div className="mt-8 p-4 bg-stone-100 rounded-lg text-xs">
                    <h3 className="font-bold mb-2">Raw Convex Data (Debug)</h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(competitors, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default ManualCompetitorTable;
