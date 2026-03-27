import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';

interface InputDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    description?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    initialValue?: string;
}

export const InputDialog: React.FC<InputDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    placeholder = "Enter text...",
    confirmLabel = "Save",
    cancelLabel = "Cancel",
    initialValue = ""
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(value);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 flex flex-col gap-4">
                        <div className="w-12 h-12 bg-nobel-gold/10 rounded-full flex items-center justify-center flex-shrink-0 self-center mb-2">
                            <Save className="w-6 h-6 text-nobel-gold" />
                        </div>

                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-serif font-bold text-gray-900">
                                {title}
                            </h3>
                            {description && (
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>

                        <div className="mt-2">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={placeholder}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nobel-gold focus:border-transparent outline-none transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 font-medium text-sm transition-all shadow-sm"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="submit"
                            disabled={!value.trim()}
                            className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 text-white bg-nobel-dark hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </form>

                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>,
        document.body
    );
};
