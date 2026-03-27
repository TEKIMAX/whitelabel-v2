import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Video, FileText, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import CustomSelect from '../../CustomSelect';
import { CustomerStatus } from '../../../types';
import ReactMarkdown from 'react-markdown';

interface Interview {
    id: string;
    [key: string]: any;
}

interface LinkedVideo {
    videoUrl?: string;
    waiverUrl?: string;
}

interface InterviewsTableProps {
    interviews: Interview[];
    headers: string[];
    selectedId?: string;
    selectedIds: Set<string>;
    canEdit: boolean;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    linkedVideosMap: Map<string, LinkedVideo>;
    onSelect: (id: string) => void;
    onSelectAll: () => void;
    onToggleSelect: (id: string) => void;
    onUpdateStatus: (id: string, status: CustomerStatus) => void;
    onUpdateCell: (id: string, field: string, value: string) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onAddColumn: () => void;
    onPageChange: (page: number) => void;
}

const statusOptions = [
    { label: 'Networking', value: 'Networking', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: 'Outreach Sent', value: 'Outreach Sent', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { label: 'Scheduled', value: 'Scheduled', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { label: 'Interviewed', value: 'Interviewed', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    { label: 'Follow-up Needed', value: 'Follow-up Needed', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { label: 'Potential Fit', value: 'Potential Fit', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: 'Subscriber', value: 'Subscriber', color: 'bg-green-100 text-green-700 border-green-200' },
    { label: 'Abandoned', value: 'Abandoned', color: 'bg-red-100 text-red-700 border-red-200' },
    { label: 'Not Yet Closed', value: 'Not Yet Closed', color: 'bg-stone-100 text-stone-600 border-stone-200' }
];

export const InterviewsTable: React.FC<InterviewsTableProps> = ({
    interviews,
    headers,
    selectedId,
    selectedIds,
    canEdit,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    linkedVideosMap,
    onSelect,
    onSelectAll,
    onToggleSelect,
    onUpdateStatus,
    onUpdateCell,
    onDelete,
    onDuplicate,
    onAddColumn,
    onPageChange
}) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const defaultVisible = new Set(['Status', 'Name', 'Email', 'Role', 'Organization', 'Notes', 'Pain Points']);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
        return new Set(headers.filter(h => !defaultVisible.has(h)));
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (header: string) => {
        const next = new Set(hiddenColumns);
        if (next.has(header)) next.delete(header);
        else next.add(header);
        setHiddenColumns(next);
    };

    const visibleHeaders = headers.filter(h => !hiddenColumns.has(h));

    return (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm flex-grow flex flex-col overflow-hidden">
            {/* Column visibility toggle */}
            <div className="flex justify-end px-4 py-2 border-b border-stone-100 bg-[#F9F8F4]">
                <div className="relative" ref={columnMenuRef}>
                    <button
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        title="Toggle columns"
                        className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                    {showColumnMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 w-56 py-2 max-h-72 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-stone-100 mb-1">Toggle Columns</div>
                            {headers.filter(h => h !== 'Status').map(header => (
                                <button
                                    key={header}
                                    onClick={() => toggleColumn(header)}
                                    className="w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors"
                                >
                                    {hiddenColumns.has(header)
                                        ? <EyeOff className="w-3.5 h-3.5 text-stone-300" />
                                        : <Eye className="w-3.5 h-3.5 text-stone-900" />}
                                    <span className={hiddenColumns.has(header) ? 'text-stone-400 line-through' : ''}>{header}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-grow pb-24 overflow-x-auto overflow-y-hidden">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#F5F4F0] sticky top-0 z-0">
                        <tr>
                            <th className="px-6 py-4 border-b border-stone-200 w-10">
                                <input
                                    type="checkbox"
                                    checked={interviews.length > 0 && selectedIds.size === interviews.length}
                                    onChange={onSelectAll}
                                    className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                    disabled={!canEdit}
                                />
                            </th>
                            {visibleHeaders.map(header => (
                                <th key={header} className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500 whitespace-nowrap">
                                    {header}
                                </th>
                            ))}
                            <th className="px-6 py-4 border-b border-stone-200 w-10">
                                {canEdit && (
                                    <button onClick={onAddColumn} className="p-1 hover:bg-stone-200 rounded">
                                        <Plus className="w-3 h-3 text-stone-400" />
                                    </button>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {interviews.map((interview) => (
                            <tr
                                key={interview.id}
                                onClick={() => onSelect(interview.id)}
                                className={`hover:bg-[#F9F8F4] transition-colors cursor-pointer group ${selectedId === interview.id ? 'bg-[#F5F4F0]' : ''}`}
                            >
                                <td className="px-6 py-4 align-top w-10" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(interview.id)}
                                        onChange={() => onToggleSelect(interview.id)}
                                        className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                        disabled={!canEdit}
                                    />
                                </td>
                                {visibleHeaders.map(header => (
                                    <td key={header} className="px-6 py-4 align-top">
                                        {header === 'Status' ? (
                                            <CustomSelect
                                                value={interview.customerStatus || interview.Status || 'Not Yet Closed'}
                                                onChange={(val) => onUpdateStatus(interview.id, val as CustomerStatus)}
                                                options={statusOptions}
                                                className={`w-32 ${!canEdit ? 'opacity-70 pointer-events-none' : ''}`}
                                            />
                                        ) : header === 'Video' ? (
                                            <div className="flex justify-center">
                                                {linkedVideosMap.get(interview.id)?.videoUrl ? (
                                                    <Video className="w-5 h-5 text-stone-900" />
                                                ) : <span className="text-stone-300">-</span>}
                                            </div>
                                        ) : header === 'Waiver' ? (
                                            <div className="flex justify-center">
                                                {linkedVideosMap.get(interview.id)?.waiverUrl ? (
                                                    <FileText className="w-5 h-5 text-nobel-gold" />
                                                ) : <span className="text-stone-300">-</span>}
                                            </div>
                                        ) : header === 'Notes' || header === 'Pain Points' || header === 'Survey Feedback' ? (
                                            <div 
                                                className="prose prose-stone prose-sm max-w-none line-clamp-2 text-xs leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold [&_p]:my-1 [&_ul]:my-1 [&_blockquote]:hidden"
                                            >
                                                <ReactMarkdown>{interview[header] || ''}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div
                                                contentEditable={canEdit}
                                                suppressContentEditableWarning
                                                onBlur={(e) => canEdit && onUpdateCell(interview.id, header, e.currentTarget.textContent || '')}
                                                className={`outline-none focus:bg-white focus:ring-2 focus:ring-nobel-gold/20 rounded p-1 min-h-[1.5em] truncate ${!canEdit ? 'cursor-default' : ''}`}
                                            >
                                                {interview[header]}
                                            </div>
                                        )}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-center">
                                    {canEdit && (
                                        <div className="flex items-center gap-1 justify-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDuplicate(interview.id); }}
                                                className="text-stone-300 hover:text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Duplicate interview"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(interview.id); }}
                                                className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete interview"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="border-t border-stone-200 p-4 flex justify-between items-center bg-white">
                <div className="text-xs text-stone-500 font-medium">
                    Showing {startItem} to {endItem} of {totalItems} entries
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-300 transition-colors shadow-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-300 transition-colors shadow-sm"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
