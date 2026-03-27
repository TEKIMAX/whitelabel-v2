
import React, { useEffect } from 'react';
import { Check, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', isVisible, onClose, duration = 3000 }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <Check size={18} className="text-green-500" />;
            case 'error': return <X size={18} className="text-red-500" />;
            default: return <Info size={18} className="text-blue-500" />;
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
            <div className="bg-white border border-stone-200 shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 min-w-[300px]">
                <div className={`p-1.5 rounded-full ${type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-blue-50'}`}>
                    {getIcon()}
                </div>
                <p className="text-sm font-medium text-stone-900">{message}</p>
                <button onClick={onClose} className="ml-auto text-stone-400 hover:text-stone-600">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
