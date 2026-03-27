import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Upload, Plus, Star } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import DocumentSelector from '../DocumentSelector';
import { YEAR_THEMES } from './constants';
import { Milestone } from '../../types';

interface AddMilestoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (milestone: any) => void;
    initialData?: Milestone | null;
    projectFiles: any; // Type as needed
    legalDocs: any[]; // Type as needed
}

export const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    projectFiles,
    legalDocs
}) => {
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newType, setNewType] = useState('Launch');
    const [newDesc, setNewDesc] = useState('');
    const [newTraction, setNewTraction] = useState('Traction');
    const [newImage, setNewImage] = useState<string | null>(null);
    const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);
    const [newTheme, setNewTheme] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setNewTitle(initialData.title);
                setNewDate(new Date(initialData.date).toISOString().split('T')[0]);
                setNewType(initialData.type);
                setNewDesc(initialData.description);
                setNewTraction(initialData.tractionType || 'Traction');
                setNewImage(initialData.imageUrl || null);
                setSelectedDocuments(initialData.documents || []);
                setIsFeatured(initialData.isFeatured || false);
                setNewTheme(initialData.theme || '');
            } else {
                resetForm();
            }
        }
    }, [isOpen, initialData]);

    const resetForm = () => {
        setNewTitle('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewType('Launch');
        setNewDesc('');
        setNewTraction('Traction');
        setNewImage(null);
        setSelectedDocuments([]);
        setIsFeatured(false);
        setNewTheme('');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!newTitle) return;

        const milestoneData = {
            id: initialData ? initialData.id : Date.now().toString(),
            title: newTitle,
            date: new Date(newDate + 'T12:00:00').getTime(),
            type: newType,
            description: newDesc,
            tractionType: newTraction,
            imageUrl: newImage || undefined,
            documents: selectedDocuments,
            isFeatured: isFeatured,
            isMonumental: initialData ? initialData.isMonumental : false,
            theme: newTheme,
            tags: newTraction === 'Pivot' ? ['Pivot'] : [],
        };

        onSave(milestoneData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-[#F9F8F4] rounded-t-xl">
                    <h3 className="font-serif text-xl text-stone-900">{initialData ? 'Edit Milestone' : 'Log Milestone'}</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Title</label>
                        <input
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold transition-all placeholder-stone-300 font-bold text-stone-900"
                            placeholder="e.g. Series A Funding"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Date</label>
                            <input
                                type="date"
                                value={newDate}
                                onChange={e => setNewDate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold transition-all text-stone-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Status (Color)</label>
                            <CustomSelect
                                value={newTraction}
                                onChange={setNewTraction}
                                options={[{ label: 'Traction (Green)', value: 'Traction' }, { label: 'No Traction (Gray)', value: 'No Traction' }, { label: 'Pivot (Red)', value: 'Pivot' }]}
                                className="text-xs rounded-full"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="w-1/2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Type</label>
                            <CustomSelect
                                value={newType}
                                onChange={setNewType}
                                options={['Launch', 'Funding', 'Pivot', 'Metric', 'Hiring', 'Product', 'Other'].map(t => ({ label: t, value: t }))}
                                className="text-xs rounded-full"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Logo / Image</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-4 py-3 border border-dashed border-stone-300 rounded-lg text-xs text-stone-400 cursor-pointer hover:bg-stone-50 hover:border-stone-400 flex items-center gap-2 justify-center transition-all bg-white"
                            >
                                {newImage ? <span className="text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Added</span> : <><Upload className="w-3 h-3" /> Upload</>}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>

                    <div className="flex gap-4 items-start">
                        {/* Document Attachments */}
                        <div className="w-1/2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Attach References <span className="font-normal normal-case text-stone-300">(Optional)</span></label>
                            <DocumentSelector
                                legalDocs={legalDocs}
                                files={projectFiles?.files}
                                folders={projectFiles?.folders}
                                selectedDocuments={selectedDocuments}
                                onToggleDocument={(doc) => {
                                    setSelectedDocuments(prev => {
                                        if (prev.some(d => d.id === doc.id)) {
                                            return prev.filter(d => d.id !== doc.id);
                                        } else {
                                            return [...prev, doc];
                                        }
                                    });
                                }}
                            />
                        </div>

                        {/* Year Theme */}
                        <div className="w-1/2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Year Theme / Mood</label>
                            <CustomSelect
                                value={newTheme}
                                onChange={setNewTheme}
                                options={[
                                    { label: 'None', value: '' },
                                    ...Object.entries(YEAR_THEMES).map(([key, val]) => ({ label: val.label, value: key }))
                                ]} // Replaced usage of YEAR_THEMES
                                placeholder="Select Theme..."
                                className="text-xs"
                            />
                            <p className="text-[9px] text-stone-400 mt-1 italic">Sets the color of this year's timeline bar.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Context</label>
                        <textarea
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold transition-all h-24 text-stone-600 leading-relaxed placeholder-stone-300 resize-none"
                            placeholder="What happened?"
                        />
                    </div>

                    <div
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${isFeatured ? 'bg-amber-50 border-nobel-gold' : 'bg-white border-stone-200 hover:border-stone-300'}`}
                        onClick={() => setIsFeatured(!isFeatured)}
                    >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isFeatured ? 'bg-nobel-gold border-nobel-gold text-white' : 'border-stone-300 bg-white'}`}>
                            {isFeatured && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                            <span className={`text-sm font-bold ${isFeatured ? 'text-nobel-gold' : 'text-stone-700'}`}>Featured Event</span>
                            <p className="text-[10px] text-stone-400">Display prominently above the timeline.</p>
                        </div>
                        {isFeatured && <Star className="w-4 h-4 text-nobel-gold ml-auto fill-current" />}
                    </div>

                    <button onClick={handleSave} className="w-full py-4 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-nobel-gold transition-colors shadow-lg mt-2 flex justify-center items-center gap-2">
                        <Plus className="w-4 h-4" /> {initialData ? 'Update Milestone' : 'Log Milestone'}
                    </button>
                </div>
            </div>
        </div>
    );
};
