import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
    X, Save, Layout, Palette, Image as ImageIcon, Type, Link as LinkIcon, Upload
} from 'lucide-react';
import { toast } from "sonner";
import { UnifiedMediaPicker } from './UnifiedMediaPicker';

interface BlogCustomizationSheetProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: Id<"projects">;
    currentSettings?: {
        title?: string;
        description?: string;
        coverImage?: string;
        themeColor?: string;
        sidebarTextColor?: string;
        mainHeroImage?: string;
    };
}

const THEME_COLORS = [
    { name: 'Black', value: '#000000', text: '#ffffff' },
    { name: 'White', value: '#ffffff', text: '#111827' },
    { name: 'Soft Blue', value: '#eff6ff', text: '#1e3a8a' }, // blue-50, blue-900
    { name: 'Soft Green', value: '#f0fdf4', text: '#14532d' }, // green-50, green-900
    { name: 'Soft Purple', value: '#faf5ff', text: '#581c87' }, // purple-50, purple-900
    { name: 'Soft Pink', value: '#fdf2f8', text: '#831843' }, // pink-50, pink-900
    { name: 'Soft Yellow', value: '#fefce8', text: '#713f12' }, // yellow-50, yellow-900
    { name: 'Soft Orange', value: '#fff7ed', text: '#7c2d12' }, // orange-50, orange-900
    { name: 'Soft Teal', value: '#f0fdfa', text: '#134e4a' }, // teal-50, teal-900
    { name: 'Soft Indigo', value: '#eef2ff', text: '#312e81' }, // indigo-50, indigo-900
];

export const BlogCustomizationSheet: React.FC<BlogCustomizationSheetProps> = ({
    isOpen, onClose, projectId, currentSettings
}) => {
    const updateProject = useMutation(api.projects.update);

    // Local State
    const [title, setTitle] = useState(currentSettings?.title || "");
    const [description, setDescription] = useState(currentSettings?.description || "");
    const [themeColor, setThemeColor] = useState(currentSettings?.themeColor || "#000000");
    const [sidebarTextColor, setSidebarTextColor] = useState(currentSettings?.sidebarTextColor || "#ffffff");
    const [coverImage, setCoverImage] = useState(currentSettings?.coverImage || "");
    const [mainHeroImage, setMainHeroImage] = useState(currentSettings?.mainHeroImage || "");
    const [isSaving, setIsSaving] = useState(false);

    // Media Picker State
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = useState<'cover' | 'hero'>('cover');

    // Sync props to state if they change and we haven't touched them (simplified)
    useEffect(() => {
        if (isOpen) {
            setTitle(currentSettings?.title || "");
            setDescription(currentSettings?.description || "");
            setThemeColor(currentSettings?.themeColor || "#000000");
            setSidebarTextColor(currentSettings?.sidebarTextColor || "#ffffff");
            setCoverImage(currentSettings?.coverImage || "");
            setMainHeroImage(currentSettings?.mainHeroImage || "");
        }
    }, [isOpen, currentSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProject({
                id: projectId,
                updates: {
                    blogSettings: {
                        title,
                        description,
                        themeColor,
                        sidebarTextColor,
                        coverImage,
                        mainHeroImage
                    }
                }
            });
            toast.success("Blog settings updated!");
            onClose();
        } catch (error) {
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    };

    const openMediaPicker = (target: 'cover' | 'hero') => {
        setMediaPickerTarget(target);
        setShowMediaPicker(true);
    };

    const handleMediaSelect = (url: string) => {
        if (mediaPickerTarget === 'cover') {
            setCoverImage(url);
        } else {
            setMainHeroImage(url);
        }
        setShowMediaPicker(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end font-sans">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

            {/* Sheet */}
            <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
                        <Layout className="w-5 h-5" /> Customize Blog
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* General Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Type className="w-4 h-4" /> Header Content
                        </h3>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Blog Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Engineering at Acme"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-0 transition-colors text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="A brief description of what your blog is about..."
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-0 transition-colors text-sm h-24 resize-none"
                            />
                        </div>
                    </section>

                    {/* Appearance */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Sidebar Appearance
                        </h3>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-gray-500">Sidebar Theme</label>
                            <div className="grid grid-cols-6 gap-2">
                                {THEME_COLORS.map((color) => (
                                    <button
                                        key={color.name}
                                        onClick={() => {
                                            setThemeColor(color.value);
                                            setSidebarTextColor(color.text);
                                        }}
                                        className={`w-full aspect-square rounded-full border-2 transition-all ${themeColor === color.value ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'}`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                                {/* Custom Color Picker */}
                                <div className="relative w-full aspect-square rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 overflow-hidden">
                                    <input
                                        type="color"
                                        value={themeColor}
                                        onChange={(e) => {
                                            setThemeColor(e.target.value);
                                            // Simple contrast check for text color
                                            const hex = e.target.value.replace('#', '');
                                            const r = parseInt(hex.substr(0, 2), 16);
                                            const g = parseInt(hex.substr(2, 2), 16);
                                            const b = parseInt(hex.substr(4, 2), 16);
                                            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                            setSidebarTextColor(yiq >= 128 ? '#000000' : '#ffffff');
                                        }}
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        title="Custom Color"
                                    />
                                    <span className="text-[10px] font-bold text-gray-400">+</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Logo</label>
                            <div
                                onClick={() => openMediaPicker('cover')}
                                className="w-full h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors relative overflow-hidden group"
                            >
                                {coverImage ? (
                                    <>
                                        <img src={coverImage} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-4" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white text-xs font-medium">Change Logo</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                                        <span className="text-xs text-gray-500">Select Logo</span>
                                    </>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400">Displayed at the top of your sidebar.</p>
                        </div>
                    </section>

                    {/* Preview (Mini) */}
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Preview Sidebar</div>
                        <div
                            className="rounded-lg p-6 shadow-sm flex flex-col gap-4 text-center transition-colors duration-300"
                            style={{ backgroundColor: themeColor, color: sidebarTextColor }}
                        >
                            {coverImage && (
                                <img src={coverImage} alt="Logo" className="w-16 h-16 object-contain rounded-lg mx-auto bg-black/5 p-2" />
                            )}
                            <div>
                                <div className="font-serif font-bold text-lg leading-tight">{title || "Your Blog Title"}</div>
                                <div className="text-xs opacity-80 mt-1 line-clamp-3">{description || "Description goes here..."}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </button>
                </div>
            </div>

            {showMediaPicker && (
                <UnifiedMediaPicker
                    projectId={projectId as any} // Cast safely as ID types can be string compatible
                    onSelect={handleMediaSelect}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}
        </div>,
        document.body
    );
};
