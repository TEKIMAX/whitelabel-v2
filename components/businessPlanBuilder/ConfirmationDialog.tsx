import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isDangerous = false
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                    {isDangerous && (
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mb-2">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <h3 className="text-xl font-serif font-bold text-gray-900">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 font-medium text-sm transition-all shadow-sm"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 text-white
                            ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-nobel-dark hover:bg-black'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>

                <button
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
