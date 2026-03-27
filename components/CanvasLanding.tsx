'use client';

import React, { useState } from 'react';
import { StartupData, CanvasVersion, AISettings, RolePermissions } from '../types';
import {
    Plus, History, Clock, Trash2, ChevronRight, ChevronLeft, Home, LayoutGrid,
    FileText, Edit3, Calendar, ArrowRight
} from 'lucide-react';
import TabNavigation from './TabNavigation';
import { Logo } from './Logo';
import DotPatternBackground from './DotPatternBackground';
import { motion, AnimatePresence } from 'framer-motion';

interface CanvasLandingProps {
    data: StartupData;
    onLoadVersion: (version: CanvasVersion) => void;
    onSaveVersion: (name: string) => void;
    onDeleteVersion: (versionId: string) => void;
    onOpenCanvas: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

const timeAgo = (date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min ago";
    return "Just now";
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const CanvasLanding: React.FC<CanvasLandingProps> = ({
    data,
    onLoadVersion,
    onSaveVersion,
    onDeleteVersion,
    onOpenCanvas,
    onNavigate,
    currentView,
    allowedPages,
    permissions
}) => {
    const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 8;
    const canCreateVersion = permissions?.canvas?.create ?? true;
    const versions = data.canvasVersions || [];
    const currentVersion = versions.find(v => v.id === data.currentCanvasId);

    // Pagination
    const totalPages = Math.ceil(versions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedVersions = versions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleCreateVersion = async () => {
        if (newVersionName.trim()) {
            setIsCreating(true);
            try {
                await onSaveVersion(newVersionName.trim());
                setNewVersionName('');
                setShowNewVersionDialog(false);
            } finally {
                setIsCreating(false);
            }
        }
    };

    const handleSelectVersion = (version: CanvasVersion) => {
        onLoadVersion(version);
        onOpenCanvas();
    };

    const handleDeleteVersion = (versionId: string) => {
        onDeleteVersion(versionId);
        setDeleteConfirmId(null);
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* LEFT SIDE: HERO IMAGE (30%) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-[30%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20"
            >
                <img
                    src="/images/canvasModel.png"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                    alt="Business Model Canvas"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                <div className="absolute top-12 left-12 z-30">
                    <Logo imageClassName="h-10 w-auto brightness-0 invert" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-12 space-y-6 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-32">
                    <div className="space-y-4">
                        <h2 className="text-white text-4xl font-serif font-bold leading-tight">
                            Business Model <br />
                            <span className="text-nobel-gold italic underline underline-offset-8 decoration-white/20">Canvas.</span>
                        </h2>
                        <div className="h-1 w-12 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed max-w-sm font-medium">
                            Visualize your business model using the <strong>Lean Canvas</strong> framework. Create and manage multiple versions.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* RIGHT SIDE: MAIN CONTENT (70%) */}
            <div className="w-[70%] h-full flex flex-col relative z-10">
                <DotPatternBackground color="#a8a29e" />

                {/* Header */}
                <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
                    <div className="flex items-center gap-6">
                        <TabNavigation
                            currentView={currentView}
                            onNavigate={onNavigate}
                            allowedPages={allowedPages}
                            projectFeatures={{
                                canvasEnabled: data.canvasEnabled,
                                marketResearchEnabled: data.marketResearchEnabled
                            }}
                            mode="light"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        {/* HUB BUTTON REMOVED */}
                        {canCreateVersion && (
                            <button
                                onClick={() => {
                                    setNewVersionName(`Version ${versions.length + 1}`);
                                    setShowNewVersionDialog(true);
                                }}
                                className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-md"
                            >
                                <Plus className="w-4 h-4" /> New Canvas
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow flex flex-col px-10 py-8 overflow-y-auto relative z-10">
                    <div className="max-w-5xl mx-auto w-full">
                        {/* Title */}
                        <div className="mb-8">
                            <h1 className="font-serif text-3xl text-stone-900 mb-2">Canvas Versions</h1>
                            <p className="text-stone-500 text-sm">
                                Manage your business model iterations. Select a version to edit or create a new one.
                            </p>
                        </div>

                        {/* Current Version Highlight */}
                        {currentVersion && (
                            <div className="mb-8 p-6 bg-nobel-gold/10 border border-nobel-gold/20 rounded-2xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold mb-1">Currently Active</p>
                                        <h3 className="font-serif text-xl text-stone-900">{currentVersion.name}</h3>
                                        <p className="text-xs text-stone-500 mt-1">Last updated {timeAgo(currentVersion.timestamp)}</p>
                                    </div>
                                    <button
                                        onClick={onOpenCanvas}
                                        className="px-6 py-3 bg-nobel-gold text-white rounded-full text-xs font-bold uppercase tracking-widest hover:brightness-90 transition-all flex items-center gap-2 shadow-lg"
                                    >
                                        <Edit3 className="w-4 h-4" /> Continue Editing
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Versions Table */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
                                <History className="w-4 h-4 text-stone-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">All Versions ({versions.length})</span>
                            </div>

                            {versions.length === 0 ? (
                                <div className="p-12 text-center">
                                    <LayoutGrid className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                                    <p className="text-stone-400 mb-4">No canvas versions yet.</p>
                                    <button
                                        onClick={() => {
                                            setNewVersionName('Version 1');
                                            setShowNewVersionDialog(true);
                                        }}
                                        className="px-6 py-3 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Create Your First Canvas
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-100">
                                    {paginatedVersions.map((version) => (
                                        <div
                                            key={version.id}
                                            className={`px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors group ${version.id === data.currentCanvasId ? 'bg-stone-50' : ''}`}
                                        >
                                            <button
                                                onClick={() => handleSelectVersion(version)}
                                                className="flex-grow text-left flex items-center gap-4"
                                            >
                                                <div className={`p-3 rounded-xl ${version.id === data.currentCanvasId ? 'bg-nobel-gold/10 text-nobel-gold' : 'bg-stone-100 text-stone-400'}`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-serif text-lg ${version.id === data.currentCanvasId ? 'font-bold text-nobel-gold' : 'text-stone-900'}`}>
                                                            {version.name}
                                                        </span>
                                                        {version.id === data.currentCanvasId && (
                                                            <span className="text-[9px] font-bold uppercase tracking-widest bg-nobel-gold text-white px-2 py-0.5 rounded-full">
                                                                Active
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-stone-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {timeAgo(version.timestamp)}
                                                        </span>
                                                        <span className="text-xs text-stone-300 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> {formatDate(version.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleSelectVersion(version)}
                                                    className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors flex items-center gap-2"
                                                >
                                                    Open <ChevronRight className="w-3 h-3" />
                                                </button>
                                                {deleteConfirmId === version.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDeleteVersion(version.id)}
                                                            className="px-3 py-2 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmId(null)}
                                                            className="px-3 py-2 bg-stone-200 text-stone-600 rounded-full text-xs font-bold hover:bg-stone-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirmId(version.id)}
                                                        className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Delete Version"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {versions.length > ITEMS_PER_PAGE && (
                                <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                                    <span className="text-xs text-stone-500">
                                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, versions.length)} of {versions.length} versions
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-stone-600" />
                                        </button>
                                        <span className="text-xs font-bold text-stone-600 px-3">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4 text-stone-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* New Version Dialog */}
            <AnimatePresence>
                {showNewVersionDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setShowNewVersionDialog(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="font-serif text-2xl text-stone-900 mb-2">Create New Canvas</h3>
                            <p className="text-sm text-stone-500 mb-6">Give your canvas version a descriptive name.</p>

                            <input
                                type="text"
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                placeholder="e.g., Q1 2026 Strategy"
                                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold focus:border-nobel-gold mb-6"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateVersion()}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewVersionDialog(false)}
                                    className="flex-1 px-4 py-3 border border-stone-200 text-stone-600 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateVersion}
                                    disabled={!newVersionName.trim() || isCreating}
                                    className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCreating ? 'Creating...' : 'Create Canvas'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CanvasLanding;
