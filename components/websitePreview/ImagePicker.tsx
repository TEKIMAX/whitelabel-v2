import React, { useState, useEffect } from 'react';
import { Search, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { searchPixabayImages } from '../../services/pixabayService';

interface ImagePickerProps {
    onSelect: (url: string) => void;
    onClose: () => void;
    initialSearchTerm?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ onSelect, onClose, initialSearchTerm = '' }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'search'>('search');
    const [searchQuery, setSearchQuery] = useState(initialSearchTerm);
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial search
    useEffect(() => {
        if (initialSearchTerm) {
            handleSearch(initialSearchTerm);
        } else {
            handleSearch('nature'); // Default initial content
        }
    }, []);

    const handleSearch = async (query: string) => {
        setLoading(true);
        try {
            const results = await searchPixabayImages(query);
            setImages(results);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    onSelect(reader.result);
                    onClose();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-nobel-gold" />
                        Select Media
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'search'
                                ? 'border-b-2 border-nobel-gold text-nobel-gold bg-white'
                                : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                            }`}
                    >
                        Stock Photos
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload'
                                ? 'border-b-2 border-nobel-gold text-nobel-gold bg-white'
                                : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                            }`}
                    >
                        Upload
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    {activeTab === 'search' ? (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                        placeholder="Search for images..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:border-nobel-gold text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => handleSearch(searchQuery)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-nobel-dark text-white rounded-md text-sm font-medium hover:bg-black transition-colors"
                                >
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-nobel-gold" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {images.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                onSelect(url);
                                                onClose();
                                            }}
                                            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-100 hover:border-nobel-gold focus:outline-none"
                                        >
                                            <img src={url} alt="Result" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </button>
                                    ))}
                                    {images.length === 0 && (
                                        <div className="col-span-3 text-center py-20 text-gray-400 text-sm">
                                            No images found. Try a different search term.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};