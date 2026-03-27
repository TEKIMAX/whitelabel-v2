import React from 'react';
import { FileText, Calendar, User, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Version {
    _id: string;
    name: string;
    version: number;
    updatedAt?: number; // or createdAt
    creatorName?: string;
    creatorImage?: string;
    createdAt: number;
}

interface PlanHistoryProps {
    versions: Version[];
    onSelectVersion: (version: Version) => void;
    onClose: () => void;
}

const PlanHistory: React.FC<PlanHistoryProps> = ({ versions, onSelectVersion, onClose }) => {
    return (<div className="flex flex-col md:flex-row h-full w-full bg-nobel-cream canvas-pattern overflow-hidden animate-fade-in" style={{ backgroundSize: '16px 16px' }}>
        {/* Left Panel - Visual/Cover */}
        <div
            className="w-full md:w-1/3 lg:w-1/4 relative border-r border-gray-200 p-8 flex flex-col items-center justify-center text-center bg-cover bg-center"
            style={{ backgroundImage: "url('/images/manworking.png')" }}
        >
            <div className="absolute inset-0 bg-black/60 z-0"></div>

            <div className="relative z-10 flex flex-col items-center w-full">
                <div className="w-48 h-64 bg-white shadow-2xl border border-gray-100 rounded-lg mb-8 relative rotate-[-2deg] flex flex-col overflow-hidden transition-transform hover:rotate-0 duration-500">
                    {/* Document Preview Style */}
                    <div className="h-4 bg-nobel-gold/20 w-full mb-4"></div>
                    <div className="px-4 space-y-2">
                        <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-100 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 rounded w-5/6"></div>
                        <div className="h-2 bg-gray-100 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 rounded w-4/5"></div>
                    </div>
                    <div className="mt-auto p-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center gap-2 justify-center text-gray-400">
                            <FileText size={16} />
                            <span className="text-xs font-serif">Business Plan</span>
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-serif font-bold text-white mb-2 shadow-sm">Version History</h2>
                <p className="text-gray-200 text-sm max-w-xs shadow-sm">
                    Track the evolution of your business plan. Review past iterations and restore previous versions if needed.
                </p>

                <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-white text-nobel-dark rounded-full hover:bg-gray-100 transition-all shadow-lg font-medium"
                    >
                        Open Editor
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>

        {/* Right Panel - List of Versions */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-lg">Saved Versions</h3>
                    <span className="text-sm text-gray-500">{versions.length} versions found</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                <th className="px-6 py-4 font-semibold">Version Name</th>
                                <th className="px-6 py-4 font-semibold">Saved By</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {versions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                        No saved versions yet.
                                    </td>
                                </tr>
                            ) : (
                                versions.map((version) => (
                                    <tr
                                        key={version._id}
                                        onClick={() => onSelectVersion(version)}
                                        className="group hover:bg-nobel-gold/5 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100 group-hover:bg-white group-hover:border-nobel-gold/30 group-hover:text-nobel-gold transition-colors">
                                                    v{version.version}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 group-hover:text-nobel-dark">{version.name || `Version ${version.version}`}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {version.creatorImage ? (
                                                    <img src={version.creatorImage} alt="" className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px]">
                                                        <User size={12} />
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-600">{version.creatorName || "Unknown"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar size={14} />
                                                <span>{format(version.createdAt, 'MMM d, yyyy h:mm a')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-400 group-hover:text-nobel-gold transition-colors">
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    );
};

export default PlanHistory;
