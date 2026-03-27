import React, { useState } from 'react';
import { X, Edit2, Trash2, Check, Plus } from 'lucide-react';
import { BLOG_CATEGORIES } from '../constants';

interface CategoryCreationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
    categories: any[];
    onUpdate: (id: string, name: string) => void;
    onDelete: (id: string) => void;
}

export const CategoryCreationDialog: React.FC<CategoryCreationDialogProps> = ({
    isOpen,
    onClose,
    onCreate,
    categories,
    onUpdate,
    onDelete
}) => {
    const [categoryName, setCategoryName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (categoryName.trim()) {
            onCreate(categoryName.trim());
            setCategoryName('');
            // Don't close immediately so user can see it added or manage others
        }
    };

    const handleStartEdit = (cat: any) => {
        setEditingId(cat._id || cat.id); // Handle Convex ID
        setEditName(cat.name || cat.label);
    };

    const handleSaveEdit = (id: string) => {
        if (editName.trim()) {
            onUpdate(id, editName.trim());
            setEditingId(null);
            setEditName('');
        }
    };

    // Filter out default categories as they can't be managed here usually
    // But if we want to show all, we can. The user said "created custom category".
    // So we should distinguish.
    const customCategories = categories.filter(c => !BLOG_CATEGORIES.some(def => def.value === c.name || def.value === c.value));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold font-serif text-gray-900 mb-2">Manage Categories</h3>
                <p className="text-sm text-gray-500 mb-6">Create new categories or manage existing ones.</p>

                {/* Create New */}
                <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Create New
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="New category name..."
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-nobel-gold transition-all text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!categoryName.trim()}
                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </form>

                {/* List Existing */}
                <div className="flex-1 overflow-y-auto">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Custom Categories</h4>
                    {customCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No custom categories yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {customCategories.map((cat: any) => (
                                <div key={cat._id || cat.value} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg group hover:border-gray-200 transition-all">
                                    {editingId === (cat._id || cat.value) ? (
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 px-2 py-1 text-sm border border-nobel-gold rounded outline-none"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSaveEdit(cat._id)}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm font-medium text-gray-700">{cat.name || cat.label}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleStartEdit(cat)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(cat._id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
