import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Upload, Check, Palette, Type, Image, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface BrandingSettingsProps {
    orgId: string;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({ orgId }) => {
    const branding = useQuery(api.branding.getBranding, { orgId });
    const saveBranding = useMutation(api.branding.saveBranding);
    const generateUploadUrl = useMutation(api.branding.generateUploadUrl);

    const [appName, setAppName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#C5A059');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingStorageId, setPendingStorageId] = useState<string | null>(null);
    const [logoRemoved, setLogoRemoved] = useState(false);
    const [isLogoTransparent, setIsLogoTransparent] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state from server
    React.useEffect(() => {
        if (branding && !logoRemoved) {
            setAppName(branding.appName || '');
            setPrimaryColor(branding.primaryColor || '#C5A059');
            if (branding.logoUrl) setPreviewUrl(branding.logoUrl);
            if (branding.isLogoTransparent !== undefined) setIsLogoTransparent(branding.isLogoTransparent);
        }
    }, [branding]);

    // Live Theme Preview
    React.useEffect(() => {
        if (typeof document !== 'undefined' && primaryColor) {
            const hex = primaryColor;
            let r = 197, g = 160, b = 89;
            const cleanHex = hex.replace(/^#/, '');
            if (cleanHex.length === 6) {
                r = parseInt(cleanHex.slice(0, 2), 16);
                g = parseInt(cleanHex.slice(2, 4), 16);
                b = parseInt(cleanHex.slice(4, 6), 16);
            }
            document.documentElement.style.setProperty('--brand-color', `${r} ${g} ${b}`);
        }
    }, [primaryColor]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (PNG, JPG, SVG).');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Logo must be under 2MB.');
            return;
        }

        setUploading(true);
        try {
            // Step 1: Show preview immediately
            setLogoRemoved(false);
            const reader = new FileReader();
            reader.onload = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);

            // Step 2: Get upload URL from Convex
            const postUrl = await generateUploadUrl();

            // Step 3: Upload file to Convex storage
            const result = await fetch(postUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            const json = await result.json();
            const storageId = json.storageId;
            setPendingStorageId(storageId);

            // Step 4: Auto-save immediately after upload
            await saveBranding({
                orgId,
                logoStorageId: storageId,
                appName: appName || undefined,
                primaryColor: primaryColor || undefined,
                removeLogo: false,
                isLogoTransparent,
            });
            setSaved(true);
            setPendingStorageId(null);
            setTimeout(() => setSaved(false), 2000);
            toast.success('Logo uploaded successfully!');
        } catch (err) {
            toast.error('Failed to upload logo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveBranding({
                orgId,
                appName: appName || undefined,
                primaryColor: primaryColor || undefined,
                ...(pendingStorageId ? { logoStorageId: pendingStorageId as any } : {}),
                removeLogo: logoRemoved,
                isLogoTransparent,
            });
            if (logoRemoved) {
                setPreviewUrl(null);
                setLogoRemoved(false);
            }
            setPendingStorageId(null);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            toast.success('Branding settings saved successfully!');
        } catch (err) {
            toast.error('Failed to save branding settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setSaving(true);
        try {
            await saveBranding({
                orgId,
                appName: undefined,
                primaryColor: undefined,
                logoUrl: undefined,
                logoStorageId: undefined,
                removeLogo: true,
            });
            setAppName('');
            setPrimaryColor('#C5A059');
            setPreviewUrl(null);
            setPendingStorageId(null);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            toast.success('Branding reset to default.');
        } catch (err) {
            toast.error('Failed to reset branding.');
        } finally {
            setSaving(false);
        }
    };

    const colorPresets = [
        '#1c1917', '#C5A059', '#dc2626', '#ea580c', '#ca8a04',
        '#16a34a', '#059669', '#0891b2', '#0284c7', '#2563eb',
        '#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#64748b',
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="flex flex-col gap-1">
                <h2 className="font-serif text-2xl font-bold text-stone-900">Branding</h2>
                <p className="text-stone-500 text-sm">Customize your workspace logo, name, and appearance.</p>
            </div>

            {/* Logo Upload */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Image className="w-5 h-5 text-stone-400" />
                    <h3 className="font-semibold text-stone-900">Logo</h3>
                </div>

                <div className="flex items-center gap-8">
                    {/* Preview */}
                    <div className="relative group">
                        <div
                            className="w-24 h-24 rounded-2xl border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden bg-stone-50 transition-all group-hover:border-stone-400 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl && !logoRemoved ? (
                                <img src={previewUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="text-center">
                                    <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                                    <span className="text-[10px] text-stone-400 font-medium">Upload</span>
                                </div>
                            )}
                        </div>
                        {previewUrl && !logoRemoved && (
                            <button
                                onClick={() => setLogoRemoved(true)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Logo"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </button>
                        )}    {uploading && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
                                <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                    </div>

                    {/* Instructions */}
                    <div className="flex-1">
                        <p className="text-sm text-stone-700 font-medium mb-1">Upload your brand logo</p>
                        <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
                            Recommended: Square image, at least 128×128px. PNG or SVG. Max 2MB.
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-lg transition-all disabled:opacity-50 shrink-0"
                            >
                                {uploading ? 'Uploading...' : previewUrl && !logoRemoved ? 'Change Logo' : 'Choose File'}
                            </button>
                            {previewUrl && !logoRemoved && (
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={isLogoTransparent}
                                            onChange={(e) => setIsLogoTransparent(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-8 h-4 bg-stone-200 rounded-full peer peer-checked:bg-stone-800 transition-colors"></div>
                                        <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform"></div>
                                    </div>
                                    <span className="text-xs text-stone-500 font-medium group-hover:text-stone-700 transition-colors select-none">
                                        Transparent Background
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-all disabled:opacity-50 shadow-sm"
                >
                    {saved ? (
                        <><Check className="w-4 h-4" /> Saved</>
                    ) : saving ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                    ) : (
                        'Save Branding'
                    )}
                </button>
                <button
                    onClick={handleReset}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold hover:bg-stone-200 transition-all disabled:opacity-50"
                >
                    <RotateCcw className="w-4 h-4" /> Reset to Default
                </button>
            </div>
        </div>
    );
};
