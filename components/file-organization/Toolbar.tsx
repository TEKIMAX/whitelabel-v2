import React from 'react';
import { Search } from 'lucide-react';

interface ToolbarProps {
    folderPath: { id: string; name: string }[];
    handleBreadcrumbClick: (index: number) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedTag: string | null;
    setSelectedTag: (tag: string | null) => void;
    allTags: string[];
}

export const Toolbar: React.FC<ToolbarProps> = ({
    folderPath,
    handleBreadcrumbClick,
    searchQuery,
    setSearchQuery,
    selectedTag,
    setSelectedTag,
    allTags
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-stone-500">
                <button
                    onClick={() => handleBreadcrumbClick(-1)}
                    className="px-3 py-1 bg-white border border-stone-200 rounded-full text-stone-600 font-medium hover:border-nobel-gold hover:text-stone-900 transition-colors shadow-sm"
                >
                    Files
                </button>
                {folderPath.map((folder, index) => (
                    <React.Fragment key={folder.id}>
                        <span className="text-stone-300">/</span>
                        <button
                            onClick={() => handleBreadcrumbClick(index)}
                            className={`hover:text-stone-900 transition-colors ${index === folderPath.length - 1 ? 'font-bold text-stone-900' : ''}`}
                        >
                            {folder.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            <div className="flex items-center gap-3">
                {/* Tag Filter */}
                {allTags.length > 0 && (
                    <select
                        value={selectedTag || ''}
                        onChange={(e) => setSelectedTag(e.target.value || null)}
                        className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:border-nobel-gold outline-none"
                    >
                        <option value="">All Tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                )}

                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:border-nobel-gold outline-none w-64"
                    />
                </div>
            </div>
        </div>
    );
};
