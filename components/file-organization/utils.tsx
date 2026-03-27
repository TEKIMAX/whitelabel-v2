import React from 'react';
import {
    File as FileIcon,
    Image as ImageIcon,
    Film,
    Music,
    FileText,
} from 'lucide-react';

export const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-purple-500" />;
    if (type.startsWith('video/')) return <Film className="w-6 h-6 text-red-500" />;
    if (type.startsWith('audio/')) return <Music className="w-6 h-6 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-orange-500" />;
    return <FileIcon className="w-6 h-6 text-stone-400" />;
};
