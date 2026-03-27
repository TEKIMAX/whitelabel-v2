import React from 'react';
import { Plus, Play, History, Calendar, User, Eye, ArrowRight, Layout, Search, Presentation, Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface DeckHomeProps {
    versions: any[];
    onSelectVersion: (version: any) => void;
    onDeleteVersion: (versionId: string) => void;
    onNewDeck: () => void;
    projectName: string;
}

const DeckHome: React.FC<DeckHomeProps> = ({ versions, onSelectVersion, onDeleteVersion, onNewDeck, projectName }) => {
    const [authorSearch, setAuthorSearch] = React.useState('');
    const [versionToDelete, setVersionToDelete] = React.useState<any | null>(null);

    const filteredVersions = versions.filter(v =>
    (v.name.toLowerCase().includes(authorSearch.toLowerCase()) ||
        (v.createdBy && v.createdBy.toLowerCase().includes(authorSearch.toLowerCase())))
    );

    return (
        <div className="flex-1 flex bg-white overflow-hidden">
            {/* Left Side - 30% Full Cover */}
            <div className="w-[30%] relative group shrink-0 border-r border-stone-200">
                <div className="absolute inset-0 bg-[url('/images/Team.png')] bg-cover bg-center transition-transform duration-700" />
                <div className="absolute inset-0 bg-stone-900/60" />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <div className="mb-8">
                        <div className="w-16 h-1 w-12 bg-nobel-gold mx-auto mb-6" />
                        <h2 className="text-white text-4xl font-serif font-bold mb-3 tracking-tight">{projectName}</h2>
                        <p className="text-nobel-gold text-xs uppercase tracking-[0.3em] font-bold">Pitch Deck Hub</p>
                    </div>

                    <button
                        onClick={onNewDeck}
                        className="group relative flex items-center justify-center gap-3 bg-white text-stone-900 px-8 py-5 rounded-full font-bold hover:bg-nobel-gold hover:text-white transition-all active:scale-95 shadow-2xl"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="tracking-widest text-xs">START NEW DECK</span>
                    </button>

                    <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-8 px-12 opacity-60">
                        <div className="text-center">
                            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Versions</p>
                            <p className="text-white font-serif text-xl">{versions.length}</p>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="text-center">
                            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Modified</p>
                            <p className="text-white font-serif text-xl">
                                {versions[0] ? new Date(versions[0].createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - 70% Content */}
            <div className="flex-1 flex flex-col bg-stone-50/50 overflow-hidden">
                <div className="p-12 flex-1 flex flex-col">
                    <div className="flex items-end justify-between mb-12">
                        <div>
                            <h1 className="text-5xl font-serif font-bold text-stone-900 mb-4 tracking-tight">Presentation History</h1>
                            <p className="text-stone-500 text-lg max-w-xl leading-relaxed">View, edit, and manage all iterations of your startup pitch deck. Refinement starts here.</p>
                        </div>

                        <div className="relative w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search versions..."
                                value={authorSearch}
                                onChange={(e) => setAuthorSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 focus:border-nobel-gold transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-stone-200/60 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 scrollbar-hide">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                    <tr className="border-b border-stone-100">
                                        <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] leading-none">Version Details</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] leading-none">Authorship</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] leading-none">Saved On</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] leading-none text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVersions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-stone-200">
                                                        <History size={32} />
                                                    </div>
                                                    <p className="text-stone-400 italic font-serif">No presentation versions found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredVersions.map((v, index) => (
                                            <tr key={v._id} className="group border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center text-nobel-gold shadow-lg transition-transform">
                                                            <Presentation className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <span className="block font-bold text-stone-900 text-lg mb-0.5">{v.name}</span>
                                                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">v{filteredVersions.length - index}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        {v.createdByPicture ? (
                                                            <img src={v.createdByPicture} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                                                                <User className="w-4 h-4 text-stone-400" />
                                                            </div>
                                                        )}
                                                        <span className="font-bold text-stone-600 text-sm">{v.createdBy || 'Global User'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-medium text-stone-500 text-sm">
                                                    {new Date(v.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => onSelectVersion(v)}
                                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest text-stone-600 border border-stone-200 hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all active:scale-95 bg-white shadow-sm"
                                                        >
                                                            EDIT DECK <ArrowRight className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setVersionToDelete(v);
                                                            }}
                                                            className="p-3 rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
                                                            title="Delete Version"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
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
            <DeleteConfirmationDialog
                isOpen={!!versionToDelete}
                onClose={() => setVersionToDelete(null)}
                onConfirm={() => versionToDelete && onDeleteVersion(versionToDelete._id)}
                title="Delete Pitch Deck Version"
                description="Are you sure you want to delete this specific version of your pitch deck?"
                itemTitle={versionToDelete?.name}
            />
        </div>
    );
};

export default DeckHome;
