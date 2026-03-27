import React, { useState, useRef, useEffect } from 'react';
import { StartupData, AISettings, LegalDocument, DocumentType, TeamMember, LegalField, FieldType } from '../types';
import { Plus, Check, ChevronDown, Trash2, FileText, UserCheck, Clock, X, Printer, BadgeCheck, FileSignature, Upload, Calendar, Type, User, Mail, Briefcase, MapPin, Settings, Grid, Move, GripVertical, Search, Filter, PenTool, Eye, Share2, LogOut } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';
import CustomSelect from './CustomSelect';
import { convertPdfToImage } from '../services/pdfUtils';
import { LEGAL_TEMPLATES } from './legalTemplates';
import ReactMarkdown from 'react-markdown';

interface LegalDocumentsProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    user: { name: string; email: string; pictureUrl?: string } | null;
    allowedPages?: string[];
    onLogout?: () => void;
}



interface RenderFieldProps {
    field: LegalField;
    isBuilder: boolean;
    onInteract?: () => void;
    selectedFieldId: string | null;
    setSelectedFieldId: (id: string | null) => void;
    user: { name: string; email: string; pictureUrl?: string } | null;
    signMode: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onRemove: (id: string) => void;
}

const RenderField: React.FC<RenderFieldProps> = ({
    field,
    isBuilder,
    onInteract,
    selectedFieldId,
    setSelectedFieldId,
    user,
    signMode,
    onDragStart,
    onRemove
}) => {
    const isSelected = isBuilder && selectedFieldId === field.id;

    // Check if this field is assigned to the current user (for signing)
    const isAssignedToMe = user && (
        field.assignedTo === user.email || // Match by email
        (field.assignedTo === 'external' && !user) || // If external and no user (public link case - simplified)
        field.assignedTo === '' // Unassigned
    );

    // In Sign Mode, highlight fields assigned to me
    const isSignable = !isBuilder && signMode && isAssignedToMe && !field.value;

    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected || isSignable ? 10 : 1
    };

    let icon = <Type className="w-3 h-3" />;
    let bgColor = "bg-white";
    if (field.type === 'Signature') { icon = <FileSignature className="w-3 h-3" />; bgColor = "bg-amber-50"; }
    if (field.type === 'Date') { icon = <Calendar className="w-3 h-3" />; bgColor = "bg-blue-50"; }

    return (
        <div
            style={style}
            className={`group ${isBuilder ? 'cursor-move' : isSignable ? 'cursor-pointer' : 'cursor-default'} transition-all`}
            onClick={(e) => {
                e.stopPropagation();
                if (isBuilder) setSelectedFieldId(field.id);
                else if (isSignable) onInteract?.();
            }}
            draggable={isBuilder}
            onDragStart={(e) => isBuilder && onDragStart(e, field.id)}
        >
            <div className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border-2 shadow-sm whitespace-nowrap min-w-[140px] relative
                ${isSelected ? 'border-nobel-gold ring-2 ring-nobel-gold/20' : isSignable ? 'border-emerald-400 ring-2 ring-emerald-400/20 animate-pulse' : 'border-stone-300'}
                ${bgColor}
            `}>
                <div className="text-stone-400">{icon}</div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                        {field.label || field.type}
                        {field.assignedTo && <span className="text-[8px] ml-1 text-stone-300">({field.assignedTo})</span>}
                    </span>
                    <span className="text-xs font-medium text-stone-900">
                        {field.value ? field.value : (isSignable ? "Click to Sign" : "")}
                    </span>
                </div>

                {/* Visual Grip for Builder */}
                {isBuilder && (
                    <div className="ml-auto flex items-center gap-2 pl-2 border-l border-stone-200">
                        <GripVertical className="w-3 h-3 text-stone-300" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(field.id);
                            }}
                            className="text-stone-300 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-red-50"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const LegalDocuments: React.FC<LegalDocumentsProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    user,
    allowedPages,
    onLogout
}) => {
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
    const [createMode, setCreateMode] = useState<'template' | 'upload'>('template');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Dashboard State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Creation State
    const [selectedTemplate, setSelectedTemplate] = useState<string>('NDA');
    const [uploadFile, setUploadFile] = useState<{ name: string, data: string } | null>(null);
    const [customVars, setCustomVars] = useState<Record<string, string>>({
        'Effective Date': new Date().toISOString().split('T')[0],
        'Company Name': data.name || 'Your Company',
        'Jurisdiction': 'Delaware'
    });

    // Recipient & Field State
    const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
    const [recipientDetails, setRecipientDetails] = useState({
        name: '',
        email: '',
        role: '',
        address: ''
    });

    // Builder State
    const [builderFields, setBuilderFields] = useState<LegalField[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Viewing / Signing State
    const [viewingDocId, setViewingDocId] = useState<string | null>(null);
    const [signMode, setSignMode] = useState(false);

    // Auto-fill recipient details when selecting from team
    useEffect(() => {
        if (selectedRecipientId) {
            const member = data.teamMembers.find(m => m.id === selectedRecipientId);
            if (member) {
                setRecipientDetails({
                    name: member.name,
                    email: member.email,
                    role: member.role,
                    address: ''
                });
            }
        }
    }, [selectedRecipientId, data.teamMembers]);

    // --- Actions ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            try {
                const imageData = await convertPdfToImage(file);
                setUploadFile({
                    name: file.name,
                    data: imageData
                });
            } catch (error) {
                alert("Failed to process PDF. Please try an image instead.");
            }
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setUploadFile({
                        name: file.name,
                        data: ev.target.result as string
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Drag from Palette
    const handleDragStartPalette = (e: React.DragEvent, type: FieldType) => {
        e.dataTransfer.setData('fieldType', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Drag existing field
    const handleDragStartField = (e: React.DragEvent, fieldId: string) => {
        e.dataTransfer.setData('fieldId', fieldId);
        e.dataTransfer.effectAllowed = 'move';
        setSelectedFieldId(fieldId); // Auto-select on drag start
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Calculate relative percentage coordinates
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        const existingId = e.dataTransfer.getData('fieldId');
        const type = e.dataTransfer.getData('fieldType') as FieldType;

        if (existingId) {
            // Move Existing Field
            setBuilderFields(prev => prev.map(f => f.id === existingId ? { ...f, x, y } : f));
            setSelectedFieldId(existingId);
        } else if (type) {
            // Add New Field
            const newField: LegalField = {
                id: Date.now().toString(),
                type,
                x,
                y,
                value: '',
                label: type,
                assignedTo: selectedRecipientId || '' // Default to main recipient
            };
            setBuilderFields([...builderFields, newField]);
            setSelectedFieldId(newField.id);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const updateSelectedField = (updates: Partial<LegalField>) => {
        if (!selectedFieldId) return;
        setBuilderFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        setBuilderFields(prev => prev.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const handleSaveDoc = () => {
        if (!recipientDetails.name) {
            alert("Please enter recipient name.");
            return;
        }

        let content = '';
        if (createMode === 'template') {
            content = LEGAL_TEMPLATES[selectedTemplate] || '';
            content = content.replace(/{{Company Name}}/g, data.name || "The Company");
            content = content.replace(/{{Recipient Name}}/g, recipientDetails.name);
            content = content.replace(/{{Effective Date}}/g, customVars['Effective Date']);
            content = content.replace(/{{Jurisdiction}}/g, customVars['Jurisdiction']);
        }

        const newDoc: LegalDocument = {
            id: Date.now().toString(),
            type: createMode === 'upload' ? 'Custom Upload' : selectedTemplate as DocumentType,
            recipientId: selectedRecipientId || 'external',
            status: 'Pending Signature',
            content: content,
            attachmentUrl: uploadFile?.data,
            fields: builderFields,
            createdAt: Date.now(),
            variables: { ...customVars, ...recipientDetails }
        };

        onUpdateProject(p => ({
            ...p,
            legalDocuments: [...((p as any).legalDocuments || []), newDoc]
        }));

        setActiveTab('dashboard');
        setViewingDocId(newDoc.id);

        // Reset
        setBuilderFields([]);
        setUploadFile(null);
        setSelectedRecipientId('');
        setRecipientDetails({ name: '', email: '', role: '', address: '' });
    };

    const handleSignField = (docId: string, fieldId: string, value: string) => {
        const docIndex = ((data as any).legalDocuments || []).findIndex((d: LegalDocument) => d.id === docId);
        if (docIndex === -1) return;

        const doc = ((data as any).legalDocuments || [])[docIndex];
        const updatedFields = (doc.fields || []).map(f => f.id === fieldId ? { ...f, value } : f);

        const allSigned = updatedFields.every(f => !!f.value);

        onUpdateProject(p => ({
            ...p,
            legalDocuments: ((p as any).legalDocuments || []).map((d: LegalDocument, i: number) => i === docIndex ? {
                ...d,
                fields: updatedFields,
                status: allSigned ? 'Signed' : 'Pending Signature',
                signedAt: allSigned ? Date.now() : undefined
            } : d)
        }));
    };

    const handleDeleteDoc = (id: string) => {
        if (confirm("Delete document?")) {
            onUpdateProject(p => ({
                ...p,
                legalDocuments: ((p as any).legalDocuments || []).filter((d: LegalDocument) => d.id !== id)
            }));
            if (viewingDocId === id) setViewingDocId(null);
        }
    };



    const viewingDoc = ((data as any).legalDocuments || []).find((d: LegalDocument) => d.id === viewingDocId);
    const activeField = builderFields.find(f => f.id === selectedFieldId);

    // Filtered Docs
    const filteredDocs = ((data as any).legalDocuments || []).filter((doc: LegalDocument) => {
        const matchesSearch = (doc.name || doc.type).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.variables as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'All' || doc.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="h-screen flex flex-col bg-[#F9F8F4] text-stone-900 font-sans overflow-hidden">
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 print:hidden">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setActiveTab('create'); setViewingDocId(null); setCreateMode('template'); }} className="bg-stone-900 text-white px-5 py-2 rounded-full shadow-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Document
                    </button>

                    <div className="relative ml-2">
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            {user?.pictureUrl ? (
                                <img src={user.pictureUrl} alt={user.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                    <User className="w-4 h-4" />
                                </div>
                            )}
                            <ChevronDown size={14} className="text-gray-400" />
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        if (onLogout) onLogout();
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <LogOut size={14} />
                                    Sign Out
                                </button>
                            </div>
                        )}
                        {/* Optional backdrop to close */}
                        {isUserMenuOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                        )}
                    </div>


                </div>
            </header>

            <main className="flex-grow flex relative overflow-hidden">

                {/* DASHBOARD VIEW */}
                {activeTab === 'dashboard' && !viewingDoc && (
                    <div className="w-full p-8 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                                <div>
                                    <h1 className="font-serif text-3xl text-stone-900 mb-2">Document Vault</h1>
                                    <p className="text-stone-500 text-sm">Manage your contracts, agreements, and legal files.</p>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <div className="relative flex-grow md:flex-grow-0">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search documents..."
                                            className="pl-9 pr-4 py-2 rounded-lg border border-stone-200 text-sm focus:border-nobel-gold outline-none w-full md:w-64"
                                        />
                                    </div>
                                    <CustomSelect
                                        value={filterStatus}
                                        onChange={setFilterStatus}
                                        options={[
                                            { label: 'All Status', value: 'All' },
                                            { label: 'Draft', value: 'Draft' },
                                            { label: 'Pending Signature', value: 'Pending Signature' },
                                            { label: 'Signed', value: 'Signed' }
                                        ]}
                                        className="w-40"
                                    />
                                </div>
                            </div>

                            {filteredDocs.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-xl border border-stone-200 shadow-sm">
                                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-stone-300" />
                                    </div>
                                    <h3 className="font-bold text-stone-900 mb-1">No documents found</h3>
                                    <p className="text-stone-500 text-sm mb-6">Create a new document to get started.</p>
                                    <button onClick={() => { setActiveTab('create'); setCreateMode('template'); }} className="text-nobel-gold font-bold text-sm hover:underline">Create Document</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredDocs.map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => setViewingDocId(doc.id)}
                                            className="group bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-nobel-gold transition-all cursor-pointer overflow-hidden flex flex-col"
                                        >
                                            <div className="h-32 bg-stone-50 border-b border-stone-100 flex items-center justify-center relative overflow-hidden">
                                                {doc.attachmentUrl ? (
                                                    <img src={doc.attachmentUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <FileText className="w-12 h-12 text-stone-300" />
                                                )}
                                                <div className="absolute top-3 right-3">
                                                    {doc.status === 'Signed' ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <BadgeCheck className="w-3 h-3" /> Signed
                                                        </span>
                                                    ) : (
                                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-5 flex-grow">
                                                <h3 className="font-serif font-bold text-lg text-stone-900 mb-1 truncate">{doc.type}</h3>
                                                <p className="text-xs text-stone-500 mb-4">Created {new Date(doc.createdAt).toLocaleDateString()}</p>

                                                <div className="flex items-center gap-2 mb-2">
                                                    <User className="w-3 h-3 text-stone-400" />
                                                    <span className="text-xs font-bold text-stone-700">{(doc.variables as any)?.name || "Recipient"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3 h-3 text-stone-400" />
                                                    <span className="text-xs text-stone-500 truncate">{(doc.variables as any)?.email || "No email"}</span>
                                                </div>
                                            </div>
                                            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{(doc.fields || []).length} Fields</span>
                                                <span className="text-xs font-bold text-nobel-gold group-hover:translate-x-1 transition-transform">View &rarr;</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CREATE / BUILDER MODE */}
                {activeTab === 'create' && (
                    <div className="w-full h-full flex">
                        {/* Left Sidebar: Tool Palette */}
                        <div className="w-64 border-r border-stone-200 bg-white flex flex-col shrink-0">
                            <div className="p-6 border-b border-stone-100 bg-[#F9F8F4]">
                                <h2 className="font-serif text-lg text-stone-900">Tools</h2>
                                <p className="text-[10px] text-stone-500">Drag to canvas</p>
                            </div>
                            <div className="p-4 space-y-3">
                                {[
                                    { type: 'Signature', icon: FileSignature, label: 'Signature' },
                                    { type: 'Text', icon: Type, label: 'Text Box' },
                                    { type: 'Date', icon: Calendar, label: 'Date' },
                                    { type: 'Checkbox', icon: Check, label: 'Checkbox' }
                                ].map((tool) => (
                                    <div
                                        key={tool.type}
                                        draggable
                                        onDragStart={(e) => handleDragStartPalette(e, tool.type as FieldType)}
                                        className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-lg cursor-grab hover:border-nobel-gold hover:shadow-md transition-all active:cursor-grabbing group"
                                    >
                                        <tool.icon className="w-4 h-4 text-stone-400 group-hover:text-nobel-gold" />
                                        <span className="text-sm font-bold text-stone-700">{tool.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 mt-auto border-t border-stone-100">
                                <button onClick={() => { setActiveTab('dashboard'); setCreateMode('template'); }} className="w-full py-2 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-200 hover:text-stone-700 transition-colors">Cancel</button>
                            </div>
                        </div>

                        {/* Center: Canvas */}
                        <div className="flex-grow flex flex-col items-center p-8 overflow-y-auto bg-[#F5F5F0]" onClick={() => setSelectedFieldId(null)}>
                            {/* Mode Toggle Header */}
                            <div className="mb-6 flex gap-2 bg-white p-1 rounded-lg border border-stone-200 shadow-sm">
                                <button onClick={() => setCreateMode('template')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${createMode === 'template' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>Template</button>
                                <button onClick={() => setCreateMode('upload')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${createMode === 'upload' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>Upload</button>
                            </div>

                            {(createMode === 'template' || uploadFile) ? (
                                <div
                                    className="relative bg-white shadow-2xl w-full max-w-[800px] min-h-[1056px] h-auto flex flex-col border border-stone-200 transition-all mb-20 pb-20"
                                    ref={containerRef}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                >
                                    {createMode === 'template' ? (
                                        <div className="p-16 text-sm leading-loose font-serif text-stone-900 pointer-events-none select-none break-words">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-6 text-center uppercase tracking-wider" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-8 mb-4 uppercase tracking-wide border-b border-stone-200 pb-1" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-4 text-justify leading-relaxed" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-stone-900" {...props} />,
                                                    hr: ({ node, ...props }) => <hr className="my-8 border-stone-300" {...props} />
                                                }}
                                            >
                                                {(() => {
                                                    let content = LEGAL_TEMPLATES[selectedTemplate] || '';
                                                    content = content.replace(/{{Company Name}}/g, data.name || "The Company");
                                                    content = content.replace(/{{Recipient Name}}/g, recipientDetails.name || "Recipient Name");
                                                    content = content.replace(/{{Effective Date}}/g, customVars['Effective Date']);
                                                    content = content.replace(/{{Jurisdiction}}/g, customVars['Jurisdiction']);
                                                    return content;
                                                })()}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <img src={uploadFile!.data} alt="Document" className="w-full pointer-events-none select-none" />
                                    )}

                                    {builderFields.map(f => (
                                        <RenderField
                                            key={f.id}
                                            field={f}
                                            isBuilder={true}
                                            selectedFieldId={selectedFieldId}
                                            setSelectedFieldId={setSelectedFieldId}
                                            user={user}
                                            signMode={signMode}
                                            onDragStart={handleDragStartField}
                                            onRemove={removeField}
                                        />
                                    ))}

                                    {builderFields.length === 0 && (
                                        <div className="fixed bottom-12 left-1/2 ml-32 -translate-x-1/2 pointer-events-none z-50">
                                            <div className="bg-stone-900 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-700">
                                                <Move className="w-4 h-4" /> Drag fields from left sidebar
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('doc-upload')?.click()}
                                    className="w-full max-w-2xl h-96 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-nobel-gold hover:bg-white cursor-pointer transition-all bg-stone-100 group"
                                >
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6 text-nobel-gold" />
                                    </div>
                                    <span className="font-bold text-sm text-stone-600">Click to Upload Document</span>
                                    <span className="text-xs mt-2">PDF (First Page) or Image</span>
                                    <input id="doc-upload" type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} />
                                </div>
                            )}
                        </div>

                        {/* Right: Configuration Sidebar */}
                        <div className="w-80 bg-white border-l border-stone-200 shadow-xl flex flex-col h-full z-10">
                            {selectedFieldId && activeField ? (
                                // Field Properties View
                                <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                                    <div className="p-6 border-b border-stone-100 bg-[#F9F8F4] flex justify-between items-center">
                                        <h3 className="font-serif text-lg">Field Properties</h3>
                                        <button onClick={() => setSelectedFieldId(null)} className="text-stone-400 hover:text-stone-900"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="p-6 space-y-6 flex-grow">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Type</label>
                                            <CustomSelect
                                                value={activeField.type}
                                                onChange={(val) => updateSelectedField({ type: val })}
                                                options={[
                                                    { label: 'Signature', value: 'Signature' },
                                                    { label: 'Text Box', value: 'Text' },
                                                    { label: 'Date', value: 'Date' },
                                                    { label: 'Checkbox', value: 'Checkbox' }
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Label / Placeholder</label>
                                            <input
                                                value={activeField.label || ''}
                                                onChange={(e) => updateSelectedField({ label: e.target.value })}
                                                className="w-full p-2 border border-stone-200 rounded text-sm focus:border-nobel-gold outline-none"
                                                placeholder="e.g. Full Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Assign To</label>
                                            <CustomSelect
                                                value={activeField.assignedTo || ''}
                                                onChange={(val) => updateSelectedField({ assignedTo: val })}
                                                options={[
                                                    { label: 'Unassigned', value: '' },
                                                    { label: 'External User', value: 'external' },
                                                    ...data.teamMembers.map(m => ({ label: m.name, value: m.email })) // Using email for assignment matching
                                                ]}
                                                placeholder="Assign to..."
                                            />
                                            <p className="text-[10px] text-stone-400 mt-1">Who should fill this field?</p>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-stone-100">
                                        <button onClick={() => removeField(activeField.id)} className="w-full py-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
                                            <Trash2 className="w-4 h-4" /> Delete Field
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Document Configuration View (Default)
                                <div className="flex flex-col h-full">
                                    <div className="p-6 border-b border-stone-100 bg-[#F9F8F4]">
                                        <h3 className="font-serif text-lg">Document Settings</h3>
                                        <p className="text-[10px] text-stone-500">Recipient details</p>
                                    </div>
                                    <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                                        {/* Template Selector (Only visible in template mode) */}
                                        {createMode === 'template' && (
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Template</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {Object.keys(LEGAL_TEMPLATES).map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setSelectedTemplate(t)}
                                                            className={`px-3 py-2 text-left text-sm rounded border transition-all ${selectedTemplate === t ? 'border-nobel-gold bg-amber-50 font-bold text-stone-900' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-stone-100">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Select Recipient</label>
                                            <CustomSelect
                                                value={selectedRecipientId}
                                                onChange={setSelectedRecipientId}
                                                options={[{ label: 'External User', value: '' }, ...data.teamMembers.map(m => ({ label: m.name, value: m.id }))]}
                                                placeholder="Choose..."
                                                className="text-xs mb-4"
                                            />

                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                                    <input
                                                        value={recipientDetails.name}
                                                        onChange={(e) => setRecipientDetails({ ...recipientDetails, name: e.target.value })}
                                                        className="w-full pl-9 p-2 border border-stone-200 rounded text-sm focus:border-nobel-gold outline-none transition-colors"
                                                        placeholder="Full Name"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                                    <input
                                                        value={recipientDetails.email}
                                                        onChange={(e) => setRecipientDetails({ ...recipientDetails, email: e.target.value })}
                                                        className="w-full pl-9 p-2 border border-stone-200 rounded text-sm focus:border-nobel-gold outline-none transition-colors"
                                                        placeholder="Email Address"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                                    <input
                                                        value={recipientDetails.role}
                                                        onChange={(e) => setRecipientDetails({ ...recipientDetails, role: e.target.value })}
                                                        className="w-full pl-9 p-2 border border-stone-200 rounded text-sm focus:border-nobel-gold outline-none transition-colors"
                                                        placeholder="Role (e.g. Advisor)"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                                    <input
                                                        value={recipientDetails.address}
                                                        onChange={(e) => setRecipientDetails({ ...recipientDetails, address: e.target.value })}
                                                        className="w-full pl-9 p-2 border border-stone-200 rounded text-sm focus:border-nobel-gold outline-none transition-colors"
                                                        placeholder="Address (Optional)"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-stone-100 bg-stone-50">
                                        <button
                                            onClick={handleSaveDoc}
                                            disabled={createMode === 'upload' && !uploadFile}
                                            className="w-full py-3 bg-stone-900 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-nobel-gold transition-colors disabled:opacity-50 shadow-lg"
                                        >
                                            Save & Assign
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW / SIGN MODE */}
                {activeTab === 'dashboard' && viewingDoc && (
                    <div className="w-full h-full flex flex-col">
                        <div className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 shadow-sm shrink-0 print:hidden">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setViewingDocId(null)} className="md:hidden p-2 -ml-2"><X className="w-4 h-4" /></button>
                                <h3 className="font-bold text-stone-900">{viewingDoc.type}</h3>
                                <span className="text-stone-300">|</span>
                                <p className="text-xs text-stone-500">Recipient: <span className="font-bold">{(viewingDoc.variables as any)?.name}</span></p>
                            </div>
                            <div className="flex gap-3 items-center">
                                {/* Sign Mode Toggle */}
                                <div className="flex bg-stone-100 p-1 rounded-lg mr-4">
                                    <button
                                        onClick={() => setSignMode(false)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${!signMode ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        <Eye className="w-3 h-3" /> View
                                    </button>
                                    <button
                                        onClick={() => setSignMode(true)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${signMode ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-400 hover:text-stone-600'}`}
                                    >
                                        <PenTool className="w-3 h-3" /> Sign
                                    </button>
                                </div>

                                {viewingDoc.status === 'Signed' && (
                                    <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-100">
                                        <BadgeCheck className="w-4 h-4" /> Signed
                                    </span>
                                )}
                                <button
                                    onClick={() => {
                                        const url = window.location.href; // Mock link generation
                                        navigator.clipboard.writeText(url);
                                        alert("Link copied to clipboard! (Mock)");
                                    }}
                                    className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                                >
                                    <Share2 className="w-3 h-3" /> Share
                                </button>
                                <button onClick={() => window.print()} className="p-2 hover:bg-stone-100 rounded-full text-stone-500"><Printer className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteDoc(viewingDoc.id); setActiveTab('dashboard'); setViewingDocId(null); }} className="p-2 hover:bg-red-50 text-stone-300 hover:text-red-500 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex-grow p-8 md:p-12 overflow-y-auto flex justify-center bg-[#F5F5F0] print:bg-white print:p-0">
                            <div className="relative bg-white shadow-2xl w-full max-w-[800px] min-h-[1056px] h-auto print:shadow-none print:w-full">
                                {viewingDoc.attachmentUrl ? (
                                    <>
                                        <img src={viewingDoc.attachmentUrl} alt="Document" className="w-full" />
                                        {viewingDoc.fields?.map(f => (
                                            <RenderField
                                                key={f.id}
                                                field={f}
                                                isBuilder={false}
                                                selectedFieldId={selectedFieldId}
                                                setSelectedFieldId={setSelectedFieldId}
                                                user={user}
                                                signMode={signMode}
                                                onDragStart={handleDragStartField}
                                                onRemove={removeField}
                                                onInteract={() => {
                                                    if (viewingDoc.status === 'Signed') return;
                                                    if (f.type === 'Signature') {
                                                        const sig = prompt("Type your name to sign:");
                                                        if (sig) handleSignField(viewingDoc.id, f.id, sig);
                                                    } else if (f.type === 'Date') {
                                                        handleSignField(viewingDoc.id, f.id, new Date().toLocaleDateString());
                                                    } else {
                                                        const txt = prompt("Enter text:");
                                                        if (txt) handleSignField(viewingDoc.id, f.id, txt);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </>
                                ) : (
                                    <div className="p-16 text-sm leading-loose font-serif text-stone-900 break-words">
                                        <ReactMarkdown
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-6 text-center uppercase tracking-wider" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-8 mb-4 uppercase tracking-wide border-b border-stone-200 pb-1" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-4 text-justify leading-relaxed" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-bold text-stone-900" {...props} />,
                                                hr: ({ node, ...props }) => <hr className="my-8 border-stone-300" {...props} />
                                            }}
                                        >
                                            {viewingDoc.content}
                                        </ReactMarkdown>

                                        {/* Legacy Sign Button for text-only docs */}
                                        {viewingDoc.status !== 'Signed' && signMode && (
                                            <div className="mt-12 p-6 border-2 border-dashed border-stone-300 rounded bg-stone-50 text-center">
                                                <button
                                                    onClick={() => {
                                                        const sig = prompt("Type your full name to sign this document:");
                                                        if (sig) {
                                                            const signedContent = viewingDoc.content + `\n\n---\n**SIGNED ELECTRONICALLY BY:** ${sig}\n**DATE:** ${new Date().toLocaleString()}`;
                                                            onUpdateProject(p => ({
                                                                ...p,
                                                                legalDocuments: ((p as any).legalDocuments || []).map((d: LegalDocument) => d.id === viewingDoc.id ? { ...d, content: signedContent, status: 'Signed', signedAt: Date.now() } : d)
                                                            }));
                                                        }
                                                    }}
                                                    className="bg-nobel-gold text-white px-6 py-3 rounded font-bold uppercase tracking-wider text-xs hover:bg-stone-900 transition-colors"
                                                >
                                                    Click to Sign
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Version Indicator (Hidden/Subtle) to verify deployment */}
                <div className="fixed bottom-1 right-1 text-[8px] text-stone-300 pointer-events-none">v1.1</div>
            </main>
        </div>
    );
};

export default LegalDocuments;