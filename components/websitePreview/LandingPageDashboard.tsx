
import React, { useState } from 'react';
import { Plus, MoreVertical, Edit3, Trash2, Globe, ExternalLink, ArrowRight, Layout, AlertTriangle } from 'lucide-react';
import { LandingPageConfig, DEFAULT_CONFIG } from '../../types';
import { ImagePicker } from './ImagePicker';
import { StartupData, ViewState } from '../../types';
import { Logo } from '../Logo';
import ProjectSelector from '../ProjectSelector';
import TabNavigation from '../TabNavigation';

interface LandingPageMeta {
    id: string;
    name: string;
    description: string;
    thumbnailUrl?: string; // Optional, maybe use hero image
    createdAt: number;
    config: LandingPageConfig;
}

interface LandingPageDashboardProps {
    pages: LandingPageMeta[];
    onCreatePage: (meta: LandingPageMeta) => void;
    onEditPage: (pageId: string) => void;
    onDeletePage: (pageId: string) => void;
    allProjects: StartupData[];
    currentProject?: StartupData;
    onSwitchProject: (id: string) => void;
    onNavigate: (view: ViewState) => void;
}

export const LandingPageDashboard: React.FC<LandingPageDashboardProps> = ({
    pages,
    onCreatePage,
    onEditPage,
    onDeletePage,
    allProjects,
    currentProject,
    onSwitchProject,
    onNavigate
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletePageId, setDeletePageId] = useState<string | null>(null);

    // New Page State
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageDescription, setNewPageDescription] = useState('');
    const [newPageImage, setNewPageImage] = useState('');
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

    const handleCreate = () => {
        if (!newPageTitle) return; // Simple validation

        const newPage: LandingPageMeta = {
            id: Date.now().toString(),
            name: newPageTitle,
            description: newPageDescription,
            thumbnailUrl: newPageImage,
            createdAt: Date.now(),
            config: {
                ...DEFAULT_CONFIG,
                hero: {
                    ...DEFAULT_CONFIG.hero,
                    mediaUrl: newPageImage || DEFAULT_CONFIG.hero.mediaUrl, // Use selected image if available
                    title: newPageTitle,
                    subtitle: newPageDescription || DEFAULT_CONFIG.hero.subtitle
                }
            }
        };

        onCreatePage(newPage);
        resetForm();
        setIsCreateModalOpen(false);
    };

    const resetForm = () => {
        setNewPageTitle('');
        setNewPageDescription('');
        setNewPageImage('');
    };

    const confirmDelete = () => {
        if (deletePageId) {
            onDeletePage(deletePageId);
            setDeletePageId(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] text-stone-900 font-sans relative">

            {/* Header */}
            <header className="px-6 py-4 bg-[#F9F8F4]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-4">

                    {currentProject && (
                        <div className="relative">
                        </div>
                    )}

                    <TabNavigation
                        currentView={'LANDING_PAGE'}
                        onNavigate={onNavigate}
                        projectFeatures={{
                            canvasEnabled: currentProject?.canvasEnabled,
                            marketResearchEnabled: currentProject?.marketResearchEnabled
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-md bg-stone-900 text-white hover:bg-nobel-gold"
                    >
                        <Plus className="w-4 h-4" />
                        Create Page
                    </button>
                </div>
            </header>

            <div className="flex-grow p-8">
                <div className="max-w-7xl mx-auto mt-8 animate-fade-in-up">

                    <div className="text-center mb-16">
                        <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">WEBSITE BUILDER</div>
                        <h1 className="font-serif text-4xl md:text-5xl mb-6 text-stone-900">Landing Pages</h1>
                        <div className="w-16 h-1 bg-nobel-gold mx-auto opacity-60"></div>
                        <p className="mt-4 text-stone-500 max-w-lg mx-auto">Create stunning, high-converting landing pages for your startup ideas in minutes.</p>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">

                        {/* Create New Card */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex flex-col items-center justify-center h-72 bg-[#F5F4F0] rounded-xl border border-stone-200 border-dashed hover:border-stone-400 hover:bg-white transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-400 group-hover:bg-nobel-gold group-hover:text-white transition-colors mb-4">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-serif text-lg text-stone-500 group-hover:text-stone-900 italic">Create New Page</span>
                        </button>

                        {pages.map((page) => (
                            <div
                                key={page.id}
                                onClick={() => onEditPage(page.id)}
                                className="flex flex-col relative group p-0 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-lg transition-all duration-300 h-72 cursor-pointer hover:border-nobel-gold/50 overflow-hidden"
                            >
                                {/* Thumbnail Header */}
                                <div className="h-32 w-full bg-gray-100 relative overflow-hidden">
                                    {page.thumbnailUrl ? (
                                        <img
                                            src={page.thumbnailUrl}
                                            alt={page.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                            <Layout className="w-10 h-10 opacity-30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>

                                <div className="p-6 flex-grow flex flex-col items-center text-center">
                                    <h3 className="font-serif text-2xl text-stone-900 mb-2 line-clamp-1">{page.name}</h3>
                                    <div className="w-8 h-0.5 bg-nobel-gold mb-3 opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                    <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-4 leading-relaxed line-clamp-2">
                                        {page.description || "No description provided"}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between w-full border-t border-stone-100 pt-4">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                                            {new Date(page.createdAt).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeletePageId(page.id); }}
                                                className="p-2 text-stone-300 hover:text-red-500 hover:bg-stone-50 rounded-full transition-colors"
                                                title="Delete Page"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditPage(page.id); }}
                                                className="p-2 text-stone-300 hover:text-stone-900 hover:bg-stone-50 rounded-full transition-colors"
                                                title="Edit Page"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="bg-stone-50 px-8 py-6 border-b border-stone-100">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">Create New Page</h2>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Page Title</label>
                                <input
                                    type="text"
                                    value={newPageTitle}
                                    onChange={(e) => setNewPageTitle(e.target.value)}
                                    placeholder="e.g. My Awesome Startup"
                                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/50 outline-none transition-all font-serif text-lg"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Description</label>
                                <textarea
                                    value={newPageDescription}
                                    onChange={(e) => setNewPageDescription(e.target.value)}
                                    placeholder="Briefly describe your value proposition..."
                                    className="w-full px-4 py-3 bg-[#F9F8F4] border border-stone-200 rounded-lg focus:border-stone-400 outline-none transition-all h-24 resize-none text-sm leading-relaxed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Hero Image</label>
                                {newPageImage ? (
                                    <div className="relative rounded-lg overflow-hidden h-40 group border border-stone-200">
                                        <img src={newPageImage} alt="Selected" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setNewPageImage('')}
                                            className="absolute top-2 right-2 p-1.5 bg-white rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm text-stone-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsImagePickerOpen(true)}
                                        className="w-full h-32 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center text-stone-400 hover:border-nobel-gold hover:text-nobel-gold hover:bg-nobel-gold/5 transition-all gap-2"
                                    >
                                        <Globe className="w-6 h-6" />
                                        <span className="text-xs font-bold uppercase tracking-wide">Select Image</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-stone-50 border-t border-stone-100 flex gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 px-6 py-3 bg-stone-100 text-stone-600 font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-stone-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newPageTitle}
                                className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
                            >
                                Create Page <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletePageId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 font-serif">Delete Page?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete this landing page? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeletePageId(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Picker */}
            {isImagePickerOpen && (
                <ImagePicker
                    onSelect={(url) => {
                        setNewPageImage(url);
                        setIsImagePickerOpen(false);
                    }}
                    onClose={() => setIsImagePickerOpen(false)}
                    initialSearchTerm={newPageTitle || 'startup'}
                />
            )}
        </div>
    );
};
