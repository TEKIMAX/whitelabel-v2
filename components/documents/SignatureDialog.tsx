import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Type, Eraser, X } from 'lucide-react';
import { toast } from 'sonner';

interface SignatureDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: string, type: 'text' | 'draw') => void;
}

export const SignatureDialog: React.FC<SignatureDialogProps> = ({ isOpen, onClose, onSubmit }) => {
    const [signMode, setSignMode] = useState<'type' | 'draw'>('type');
    const [typedSignature, setTypedSignature] = useState('');
    const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setSignMode('type');
            setTypedSignature('');
            setDrawnSignature(null);
        }
    }, [isOpen]);

    // Canvas Context Setup
    useEffect(() => {
        if (isOpen && signMode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#000';
            }
        }
    }, [isOpen, signMode]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawing.current = true;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const rect = canvas.getBoundingClientRect();
            const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const endDrawing = () => {
        isDrawing.current = false;
        if (canvasRef.current) {
            setDrawnSignature(canvasRef.current.toDataURL());
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setDrawnSignature(null);
        }
    };

    const handleSubmit = () => {
        if (signMode === 'type') {
            if (!typedSignature.trim()) {
                toast.error("Please type your name.");
                return;
            }
            onSubmit(typedSignature, 'text');
        } else {
            if (!drawnSignature) {
                toast.error("Please sign in the box.");
                return;
            }
            onSubmit(drawnSignature, 'draw');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <h4 className="font-serif text-lg font-bold text-nobel-dark">Sign Document</h4>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
                </div>

                <div className="p-6">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-6 border-b border-stone-200">
                        <button
                            onClick={() => setSignMode('type')}
                            className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${signMode === 'type' ? 'border-nobel-gold text-nobel-gold' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                        >
                            <span className="flex items-center gap-2"><Type size={14} /> Type</span>
                        </button>
                        <button
                            onClick={() => setSignMode('draw')}
                            className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${signMode === 'draw' ? 'border-nobel-gold text-nobel-gold' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                        >
                            <span className="flex items-center gap-2"><PenTool size={14} /> Draw</span>
                        </button>
                    </div>

                    {/* Type Input */}
                    {signMode === 'type' && (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest">Type your full name</label>
                            <input
                                type="text"
                                value={typedSignature}
                                onChange={(e) => setTypedSignature(e.target.value)}
                                className="w-full p-4 text-2xl font-serif text-nobel-dark border-b-2 border-stone-200 focus:border-nobel-gold focus:outline-none placeholder:text-stone-200 text-center"
                                placeholder="John Doe"
                                autoFocus
                            />
                            <p className="text-center text-xs text-stone-400 italic">This will be used as your legal digital signature.</p>
                        </div>
                    )}

                    {/* Draw Input */}
                    {signMode === 'draw' && (
                        <div className="space-y-4">
                            <div className="relative border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 overflow-hidden touch-none">
                                <canvas
                                    ref={canvasRef}
                                    width={400}
                                    height={160}
                                    className="w-full h-40 cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={endDrawing}
                                    onMouseLeave={endDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={endDrawing}
                                />
                                <button
                                    onClick={clearCanvas}
                                    className="absolute top-2 right-2 p-1.5 bg-white shadow-sm rounded-md text-stone-400 hover:text-red-500 transition-colors"
                                    title="Clear Signature"
                                >
                                    <Eraser size={14} />
                                </button>
                            </div>
                            <p className="text-center text-xs text-stone-400">Draw your signature above using your mouse or finger.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-nobel-dark text-white rounded-lg text-sm font-medium hover:bg-nobel-gold shadow-lg transition-all">
                        Complete Signing
                    </button>
                </div>
            </div>
        </div>
    );
};
