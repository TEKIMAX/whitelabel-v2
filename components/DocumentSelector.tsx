import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Check, File, FileIcon, Search, AlertCircle } from 'lucide-react';
import { MilestoneDocument } from '../types';

interface DocumentSelectorProps {
    legalDocs?: any[];
    files?: any[];
    folders?: any[];
    selectedDocuments: MilestoneDocument[];
    onToggleDocument: (doc: MilestoneDocument) => void;
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({
    legalDocs = [],
    files = [],
    folders = [],
    selectedDocuments,
    onToggleDocument
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // --- Build Tree Structure ---
    const buildTree = () => {
        const tree: Record<string, { folder?: any, children: string[], files: any[] }> = {};
        const rootFolders: string[] = [];
        const rootFiles: any[] = [];

        // Initialize tree nodes for all folders
        folders.forEach(f => {
            tree[f._id] = { folder: f, children: [], files: [] };
        });

        // Hierarchy
        folders.forEach(f => {
            if (f.parentId && tree[f.parentId]) {
                tree[f.parentId].children.push(f._id);
            } else {
                rootFolders.push(f._id);
            }
        });

        // Distribute files
        files.forEach(f => {
            if (f.folderId && tree[f.folderId]) {
                tree[f.folderId].files.push(f);
            } else {
                rootFiles.push(f);
            }
        });

        return { tree, rootFolders, rootFiles };
    };

    const { tree, rootFolders, rootFiles } = useMemo(() => buildTree(), [files, folders]);

    // --- Toggle Selection ---
    const isSelected = (id: string) => selectedDocuments.some(d => d.id === id);

    const toggleFolder = (e: React.MouseEvent, folderId: string) => {
        e.stopPropagation();
        const newSet = new Set(expandedFolders);
        if (newSet.has(folderId)) newSet.delete(folderId);
        else newSet.add(folderId);
        setExpandedFolders(newSet);
    };

    // --- Recursive Folder Renderer ---
    const renderFolder = (folderId: string, level = 0) => {
        const node = tree[folderId];
        if (!node) return null;

        const isExpanded = expandedFolders.has(folderId) || searchQuery.length > 0; // Auto expand on search
        const hasChildren = node.children.length > 0 || node.files.length > 0;

        // Filter logic for search
        if (searchQuery) {
            const matchesSelf = node.folder.name.toLowerCase().includes(searchQuery.toLowerCase());
            // This is a simple filter: if searching, we might just show flat list or expand path?
            // "Show a visible tree" is harder with filtering.
            // Let's stick to basic tree behavior but expand.
            // Actually, simplified: if search query exists, just show items that match in a flat list?
            // The user asked for a tree. Let's keep tree but maybe highlight match.
        }

        return (
            <div key={folderId} style={{ marginLeft: level * 12 }}>
                <div
                    onClick={(e) => toggleFolder(e, folderId)}
                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-stone-50 rounded cursor-pointer text-sm text-stone-700 select-none"
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-3 h-3 text-stone-400" /> : <ChevronRight className="w-3 h-3 text-stone-400" />
                    ) : <span className="w-3" />}

                    <Folder className="w-4 h-4 text-nobel-gold fill-nobel-gold/10" />
                    <span className="truncate flex-grow">{node.folder.name}</span>
                </div>

                {isExpanded && (
                    <div className="border-l border-stone-100 ml-2.5 pl-1">
                        {node.children.map(childId => renderFolder(childId, level + 1))}
                        {node.files.map(file => renderFile(file, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderFile = (file: any, level = 0) => {
        if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return null;

        const selected = isSelected(file._id);

        return (
            <div
                key={file._id}
                onClick={() => onToggleDocument({ id: file._id, name: file.name, type: 'File' })}
                className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm transition-colors ml-4 ${selected ? 'bg-nobel-gold/10 text-nobel-gold font-medium' : 'hover:bg-stone-50 text-stone-600'}`}
            >
                {selected ? <Check className="w-3 h-3 flex-shrink-0" /> : <FileText className="w-3 h-3 text-stone-400 flex-shrink-0" />}
                <span className="truncate">{file.name}</span>
            </div>
        );
    };

    const renderLegalDoc = (doc: any) => {
        if (searchQuery && !doc.type.toLowerCase().includes(searchQuery.toLowerCase())) return null;
        const selected = isSelected(doc._id);

        return (
            <div
                key={doc._id}
                onClick={() => onToggleDocument({ id: doc._id, name: doc.type ? `${doc.type} (${doc.recipientId})` : 'Legal Doc', type: 'Legal', url: doc.attachmentUrl })}
                className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm transition-colors ${selected ? 'bg-nobel-gold/10 text-nobel-gold font-medium' : 'hover:bg-stone-50 text-stone-600'}`}
            >
                {selected ? <Check className="w-3 h-3 flex-shrink-0" /> : <FileIcon className="w-3 h-3 text-stone-400 flex-shrink-0" />}
                <span className="truncate">{doc.type || 'Document'} <span className="text-xs text-stone-400">({doc.recipientId})</span></span>
            </div>
        );
    };

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-3 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 hover:border-stone-300 focus:ring-1 focus:ring-nobel-gold focus:border-nobel-gold transition-all"
            >
                <div className="flex gap-2 items-center text-stone-500">
                    <Search className="w-4 h-4" />
                    <span className="text-stone-900 font-medium">Select Documents...</span>
                    {selectedDocuments.length > 0 && (
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs font-bold">{selectedDocuments.length}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-2 border-b border-stone-100 bg-stone-50">
                        <input
                            type="text"
                            placeholder="Filter documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold"
                            autoFocus
                        />
                    </div>

                    <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">

                        {/* Legal Documents Section */}
                        {legalDocs.length > 0 && (searchQuery ? legalDocs.some(d => d.type.toLowerCase().includes(searchQuery.toLowerCase())) : true) && (
                            <div className="mb-2">
                                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1 mb-1">
                                    Legal Documents
                                </div>
                                {legalDocs.map(renderLegalDoc)}
                            </div>
                        )}

                        {/* Files Section */}
                        {(rootFolders.length > 0 || rootFiles.length > 0) && (
                            <div className="mt-2">
                                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1 mb-1">
                                    Project Files
                                </div>
                                {rootFolders.map(fid => renderFolder(fid))}
                                {rootFiles.map(f => renderFile(f))}
                            </div>
                        )}

                        {legalDocs.length === 0 && rootFolders.length === 0 && rootFiles.length === 0 && (
                            <div className="p-4 text-center text-xs text-stone-400 italic">No available documents</div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Tags Below */}
            {selectedDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-700 shadow-sm animate-in fade-in zoom-in-95">
                            {doc.type === 'Legal' ? <FileIcon className="w-3 h-3 text-stone-400" /> : <FileText className="w-3 h-3 text-stone-400" />}
                            <span className="max-w-[150px] truncate">{doc.name}</span>
                            <button
                                onClick={() => onToggleDocument(doc)}
                                className="text-stone-400 hover:text-red-500 transition-colors ml-1"
                            >
                                <span className="sr-only">Remove</span>
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentSelector;
