import React, { useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useAction } from 'convex/react';
import { useCreateCustomerInterview, useCreateFeature, useCreateDocument } from '../../hooks/useCreate';
import { StartupData, CustomerInterview, AISettings, CustomerStatus, RolePermissions } from '../../types';
import { analyzeCustomerFeedback, analyzeCustomerFit } from '../../services/geminiService';
import { Upload, Download, Plus, Search, Trash2, ChevronDown, ChevronUp, Check, LayoutGrid, X, User, Brain, Loader2, Sparkles, MessageSquare, ChevronLeft, ChevronRight, Video, FileText, Play, Eye, Home, Target, BookOpen, PieChart as PieChartIcon, FolderPlus, Copy, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import CustomSelect from '../CustomSelect';
import { toast } from "sonner";
import { Logo } from '../Logo';
import MiniEditor from '../editor/MiniEditor';
import { SaveToFilesDialog } from '../nobel_chat/SaveToFilesDialog';
import { marked } from 'marked';
import { OverviewTab, FitAnalysisTab, QuestionsTab, VideoInterviewsTab } from './tabs';
import { ModelSelect } from '../ModelSelector';
import { useActiveModel } from '../../hooks/useActiveModel';
import { SentimentBadge } from './SentimentBadge';
import {
    InterviewDetailSheet,
    EmptyState,
    VideoDetailSheet,
    AddVideoModal,
    InterviewsTable,
    QuestionsSideSheet
} from './components';

interface CustomerDevProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

const defaultHeaders = ['Name', 'Role', 'Organization', 'Email', 'Notes', 'Pain Points', 'Survey Feedback', 'Willingness to Pay ($)'];

const CustomerDev: React.FC<CustomerDevProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    settings,
    allowedPages,
    permissions
}) => {
    // Permission Verification
    const canEdit = permissions ? (permissions.global?.edit ?? false) : true;
    
    const { activeModel, capabilities } = useActiveModel();
    const hasTools = capabilities.includes('tools') || capabilities.includes('websearch');
    const modifiedSettings = { ...settings, modelName: activeModel || settings.modelName };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const generateInterviewScriptAction = useAction(api.aiModules.interviewActions.generateInterviewScript);
    const [searchTerm, setSearchTerm] = useState('');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'video' | 'fit' | 'questions'>('overview');

    // Fit Analysis & Question Gen State
    const [fitAnalysis, setFitAnalysis] = useState<string>('');
    const [isAnalyzingFit, setIsAnalyzingFit] = useState(false);
    const [notesAccordionOpen, setNotesAccordionOpen] = useState(true);
    const [mediaAccordionOpen, setMediaAccordionOpen] = useState(false);
    const [insightsAccordionOpen, setInsightsAccordionOpen] = useState(true);
    const [fieldsAccordionOpen, setFieldsAccordionOpen] = useState(false);
    const [fitAnalysisPrompt, setFitAnalysisPrompt] = useState('');

    const [selectedQuestionCustomerId, setSelectedQuestionCustomerId] = useState<string>('new');
    const [targetName, setTargetName] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [targetDomain, setTargetDomain] = useState('');
    const [targetIndustry, setTargetIndustry] = useState('');
    const [generatedQuestions, setGeneratedQuestions] = useState<string | null>(null);
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

    const questionsHistory = (data.customerInterviews || [])
        .filter(c => {
            const notes = c.Notes || '';
            return notes.includes('Interview Script') || notes.includes('Generated Interview Questions') || notes.includes('## Problem Validation');
        })
        .map(c => ({
            id: c.id,
            name: c.Name || 'Unknown',
            role: c.Role || '',
            organization: c.Organization || '',
            notes: c.Notes || '',
        }));

    // Dialog States
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveContentForDialog, setSaveContentForDialog] = useState<string>('');
    const [saveDialogTitle, setSaveDialogTitle] = useState('Save to Documents');
    const [saveDialogFilename, setSaveDialogFilename] = useState('New AI Document');
    const createDocument = useCreateDocument();

    // Auto-fill CRM fields based on selection — only reset questions when user changes customer
    const prevCustomerIdRef = React.useRef(selectedQuestionCustomerId);
    React.useEffect(() => {
        // Only auto-fill and reset when the *selected customer* changes, not when interview data updates
        if (prevCustomerIdRef.current === selectedQuestionCustomerId) return;
        prevCustomerIdRef.current = selectedQuestionCustomerId;

        if (selectedQuestionCustomerId === 'new') {
            setTargetName('');
            setTargetRole('');
            setTargetDomain('');
            setTargetIndustry('');
            setGeneratedQuestions(null);
        } else {
            const customer = data.customerInterviews.find(c => c.id === selectedQuestionCustomerId);
            if (customer) {
                setTargetName(customer.Name || '');
                setTargetRole(customer.Role || '');
                setTargetDomain(customer.Organization || '');
                setTargetIndustry(customer.Industry || '');
                setGeneratedQuestions(null);
            }
        }
    }, [selectedQuestionCustomerId]);

    const handleAnalyzeFit = async () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one interview to analyze");
            return;
        }
        setIsAnalyzingFit(true);
        try {
            // Sanitize data — strip Convex internal fields to avoid serialization errors
            const selectedInterviewsData = data.customerInterviews
                .filter(i => selectedIds.has(i.id))
                .map(({ _id, _creationTime, customData, ...rest }: any) => ({
                    Name: rest.Name || '',
                    Role: rest.Role || '',
                    Organization: rest.Organization || '',
                    Industry: rest.Industry || '',
                    'Pain Points': rest['Pain Points'] || '',
                    Notes: rest.Notes || '',
                    Status: rest.customerStatus || rest.Status || '',
                    'Survey Feedback': rest['Survey Feedback'] || '',
                }));
            const result = await analyzeCustomerFit(data, selectedInterviewsData, modifiedSettings, fitAnalysisPrompt);
            // Strip AI preamble (e.g. "Okay, let's analyze...")
            const cleaned = result.replace(/^(?:Okay|Sure|Alright|Let me|Here's|Here is|I'll)[^\n]*\n*/i, '').trim();
            setFitAnalysis(cleaned);
        } catch (e) {
            console.error('[Fit Analysis Error]', e);
            toast.error("Failed to analyze fit");
        } finally {
            setIsAnalyzingFit(false);
        }
    };

    const handleGenerateQuestions = async () => {
        setIsGeneratingQuestions(true);
        try {
            // Use Convex action with full cross-referenced startup context
            const result = await generateInterviewScriptAction({
                problem: data.canvas?.['Problem'] || data.hypothesis || '',
                segments: data.canvas?.['Customer Segments'] || '',
                businessName: data.name,
                canvasData: data.canvas || undefined,
                marketData: data.market ? {
                    tam: data.market.tam,
                    sam: data.market.sam,
                    som: data.market.som,
                } : undefined,
                competitors: data.competitorAnalysis?.competitors?.slice(0, 3).map(c => ({
                    name: c.name,
                    differentiator: c.differentiator
                })),
                goals: data.goals?.filter(g => !g.archived).slice(0, 3).map(g => g.title),
                revenueModel: data.revenueModel ? {
                    businessModelType: data.revenueModel.businessModelType,
                    revenueStreams: data.revenueModel.revenueStreams?.slice(0, 5),
                    monthlyGrowthRate: data.revenueModel.monthlyGrowthRate,
                    churnRate: data.revenueModel.churnRate,
                    cac: data.revenueModel.cac,
                } : undefined,
                existingInterviews: data.customerInterviews?.slice(0, 5)?.map(i => ({
                    Name: i.Name || '',
                    Role: i.Role || '',
                    'Pain Points': i['Pain Points'] || '',
                    Notes: (i.Notes || '').substring(0, 200),
                })),
                targetName,
                targetRole,
                targetDomain,
                targetIndustry,
                modelName: modifiedSettings.modelName
            });
            setGeneratedQuestions(result);

            // CRM Sync
            if (selectedQuestionCustomerId === 'new') {
                const newId = Date.now().toString() + Math.random().toString(36).substring(7);
                const newInterview = {
                    id: newId,
                    Name: targetName || 'Unknown Prospect',
                    Role: targetRole,
                    Organization: targetDomain,
                    Industry: targetIndustry,
                    Status: 'To Interview',
                    Notes: `### Generated Interview Questions\n\n${result}`
                };
                await addInterview({ projectId: data.id, interview: newInterview as any });
                setSelectedQuestionCustomerId(newId);
                toast.success("Added new prospect to CRM with generated questions.");
            } else {
                const existing = data.customerInterviews.find(i => i.id === selectedQuestionCustomerId);
                if (existing && existing.id && !existing.id.toString().includes('.')) {
                    const updatedNotes = existing.Notes
                        ? `${existing.Notes}\n\n---\n\n${result}`
                        : result;

                    const currentCustomData = existing.customData ? JSON.parse(existing.customData) : {};
                    const updatedCustomData = {
                        ...currentCustomData,
                        Name: targetName || existing.Name || currentCustomData.Name,
                        Role: targetRole || existing.Role || currentCustomData.Role,
                        Organization: targetDomain || existing.Organization || currentCustomData.Organization,
                        Industry: targetIndustry || existing.Industry || currentCustomData.Industry,
                        Notes: updatedNotes
                    };

                    await updateInterview({
                        id: existing.id as any,
                        customData: JSON.stringify(updatedCustomData)
                    });
                    toast.success("Updated existing prospect CRM notes.");
                }
            }
        } catch (e) {
            toast.error("Failed to generate questions");
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    const openSaveDialog = (content: string, title?: string, defaultFilename?: string) => {
        setSaveContentForDialog(content);
        if (title) setSaveDialogTitle(title);
        if (defaultFilename) setSaveDialogFilename(defaultFilename);
        else setSaveDialogFilename('New AI Document');
        setIsSaveDialogOpen(true);
    };

    const handleSaveToDocs = async (folderId: string | null, filename: string) => {
        if (!saveContentForDialog) return;

        try {
            await createDocument({
                projectId: data.id as any,
                folderId: folderId ? folderId as any : undefined,
                title: filename.endsWith('.md') ? filename : `${filename}.md`,
                content: saveContentForDialog,
                type: 'doc',
                tags: [{ name: 'AI Assisted', color: '#7c007c' }, { name: 'Customer Discovery', color: '#0d9488' }]
            });
            toast.success("Saved to documents");
            setIsSaveDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save document");
        }
    };

    // Sheet State
    const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedVideoInterview, setSelectedVideoInterview] = useState<any | null>(null);

    // Add Video Interview State
    const [showAddVideoModal, setShowAddVideoModal] = useState(false);
    const [newVideoName, setNewVideoName] = useState('');
    const [newVideoEmail, setNewVideoEmail] = useState('');
    const [newVideoLinkedId, setNewVideoLinkedId] = useState('');
    const [waiverFile, setWaiverFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const replaceVideoRef = useRef<HTMLInputElement>(null);
    const replaceWaiverRef = useRef<HTMLInputElement>(null);

    const handleReplaceUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'waiver') => {
        const file = e.target.files?.[0];
        if (!file || !selectedInterviewId) return;

        const linkedWrapper = linkedVideosMap.get(selectedInterviewId);
        if (!linkedWrapper) return;

        setIsUploading(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            await updateVideoInterview({
                id: linkedWrapper._id,
                [type === 'video' ? 'videoFileId' : 'waiverFileId']: storageId
            });
            toast.success(`${type === 'video' ? 'Video' : 'Waiver'} updated successfully`);
        } catch (error) {
            toast.error("Failed to update file");
        } finally {
            setIsUploading(false);
            if (replaceVideoRef.current) replaceVideoRef.current.value = '';
            if (replaceWaiverRef.current) replaceWaiverRef.current.value = '';
        }
    };

    // Add Entry Modal State
    const [showAddEntryModal, setShowAddEntryModal] = useState(false);
    const [newEntryData, setNewEntryData] = useState<Record<string, string>>({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Default headers if no data
    // Header Logic
    const allKeys = new Set<string>();
    data.customerInterviews.forEach(i => Object.keys(i).forEach(k => allKeys.add(k)));
    const ignoredKeys = ['id', 'sentiment', 'aiAnalysis', 'customerStatus', 'Video', 'Waiver', 'willingnessToPay'];
    const dynamicHeaders = Array.from(allKeys).filter(k => !ignoredKeys.includes(k) && k !== 'Status');
    const headers = ['Status', ...dynamicHeaders.length > 0 ? dynamicHeaders : defaultHeaders.filter(h => h !== 'Status'), 'Video', 'Waiver'];

    // Derived state for selected interview
    const selectedInterview = data.customerInterviews.find(i => i.id === selectedInterviewId);

    // Mutations & Queries
    const bulkAdd = useMutation(api.customers.bulkAddInterviews);
    const addInterview = useCreateCustomerInterview();
    const updateInterview = useMutation(api.customers.updateInterview);
    const deleteInterview = useMutation(api.customers.deleteInterview);
    const bulkDelete = useMutation(api.customers.bulkDeleteInterviews);

    const videoInterviews = useQuery(api.customers.getVideoInterviews, { projectId: data.id }) || [];

    // Analytics Computations
    const sentimentCounts = data.customerInterviews.reduce((acc, curr) => {
        const s = (curr.sentiment || 'Unknown').toLowerCase();
        if (s.includes('positive')) acc.positive++;
        else if (s.includes('negative')) acc.negative++;
        else acc.neutral++;
        return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    const sentimentChartData = [
        { name: 'Positive', count: sentimentCounts.positive, fill: '#10B981' },
        { name: 'Neutral', count: sentimentCounts.neutral, fill: '#9CA3AF' },
        { name: 'Negative', count: sentimentCounts.negative, fill: '#EF4444' }
    ];

    const roleDistribution = data.customerInterviews.reduce((acc: any, curr) => {
        const role = curr.Role || 'Unknown';
        if (!acc[role]) acc[role] = { name: role, count: 0 };
        acc[role].count++;
        return acc;
    }, {});
    const roleChartData = Object.values(roleDistribution).sort((a: any, b: any) => b.count - a.count).slice(0, 6);

    const avgWTP = React.useMemo(() => {
        let sum = 0;
        let count = 0;
        data.customerInterviews.forEach(ci => {
            if (ci.willingnessToPay) {
                const num = parseInt(ci.willingnessToPay.replace(/[^0-9]/g, ''));
                if (!isNaN(num) && num > 0) {
                    sum += num;
                    count++;
                }
            }
        });
        return count > 0 ? Math.round(sum / count) : 0;
    }, [data.customerInterviews]);

    const generateUploadUrl = useMutation(api.customers.generateUploadUrl);
    const saveVideoInterview = useMutation(api.customers.saveVideoInterview);
    const deleteVideoInterview = useMutation(api.customers.deleteVideoInterview);
    const updateProject = useMutation(api.projects.update);
    const updateVideoInterview = useMutation(api.customers.updateVideoInterview);
    const addFeatureMutation = useCreateFeature();

    // File System Data
    const allFiles = useQuery(api.files.getAllFileSystem, { projectId: data.id });
    const videoFiles = allFiles?.files.filter(f => f.type.startsWith('video/')) || [];
    const documentFiles = allFiles?.files.filter(f => !f.type.startsWith('video/') && !f.type.startsWith('image/')) || [];

    // Helper to parse/format Willingness to Pay
    const willingnessValue = newEntryData['Willingness to Pay ($)'] || '';
    const isPaying = willingnessValue && willingnessValue !== 'No' && !willingnessValue.startsWith('No ');
    const interestStatus = willingnessValue.startsWith('$') ? 'Yes' : (willingnessValue === 'Maybe' ? 'Maybe' : 'No');
    const priceValue = willingnessValue.startsWith('$') ? willingnessValue.replace('$', '') : '';

    // Derived state for linked videos
    const linkedVideosMap = React.useMemo(() => {
        const map = new Map();
        if (videoInterviews) {
            videoInterviews.forEach((v: any) => {
                if (v.linkedInterviewId) {
                    map.set(v.linkedInterviewId, v);
                }
            });
        }
        return map;
    }, [videoInterviews]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;

                // Robust CSV Parser
                const rows: string[][] = [];
                let currentRow: string[] = [];
                let currentCell = '';
                let insideQuote = false;

                // Normalize line endings
                const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

                for (let i = 0; i < normalizedText.length; i++) {
                    const char = normalizedText[i];
                    const nextChar = normalizedText[i + 1];

                    if (insideQuote) {
                        if (char === '"' && nextChar === '"') {
                            currentCell += '"';
                            i++;
                        } else if (char === '"') {
                            insideQuote = false;
                        } else {
                            currentCell += char;
                        }
                    } else {
                        if (char === '"') {
                            insideQuote = true;
                        } else if (char === ',') {
                            currentRow.push(currentCell.trim());
                            currentCell = '';
                        } else if (char === '\n') {
                            currentRow.push(currentCell.trim());
                            if (currentRow.some(c => c !== '')) rows.push(currentRow);
                            currentRow = [];
                            currentCell = '';
                        } else {
                            currentCell += char;
                        }
                    }
                }
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    if (currentRow.some(c => c !== '')) rows.push(currentRow);
                }

                if (rows.length === 0) {
                    toast.error("CSV file is empty");
                    return;
                }

                const csvHeaders = rows[0].map(h => h.trim());
                const newInterviews: any[] = [];

                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i];
                    // Skip empty rows
                    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

                    const interview: any = {};

                    csvHeaders.forEach((header, index) => {
                        interview[header] = values[index] || '';
                    });
                    newInterviews.push(interview);
                }

                if (newInterviews.length === 0) {
                    toast.error("No valid data found in CSV");
                    return;
                }

                // Persist to Backend
                await bulkAdd({
                    projectId: data.id,
                    interviews: newInterviews.map(i => {
                        const { Status, ...custom } = i;
                        return {
                            customerStatus: Status || 'Not Yet Closed',
                            customData: JSON.stringify(custom)
                        };
                    })
                });

                toast.success(`Successfully imported ${newInterviews.length} interviews`);
            } catch (error) {
                toast.error("Failed to import CSV. Please check the file format.");
            } finally {
                // Reset file input so the same file can be selected again
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.onerror = () => {
            toast.error("Failed to read file");
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleExportCSV = () => {
        if (data.customerInterviews.length === 0) {
            toast.error("No data to export");
            return;
        }

        // Use the defined headers and explicitly prepend "Status" and "ID" as necessary, though headers comes from state
        const allHeaders = [...headers];

        // Build rows
        const csvRows = [];

        // Add header row
        csvRows.push(allHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

        // Add data rows based on filtered list so they get their current search results exported
        for (const interview of paginatedInterviews.length > 0 ? paginatedInterviews : data.customerInterviews) {
            const rowData: string[] = [];
            for (const header of allHeaders) {
                let cellValue = '';
                if (header === 'Status') {
                    cellValue = String(interview.customerStatus || interview.Status || 'Not Yet Closed');
                } else {
                    const value = interview[header as keyof CustomerInterview];
                    cellValue = value !== undefined && value !== null ? String(value) : '';
                }

                // Escape quotes
                const escapedCell = `"${cellValue.replace(/"/g, '""')}"`;
                rowData.push(escapedCell);
            }
            csvRows.push(rowData.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Customer_Discovery_${data.name || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exported successfuly");
    };

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();

        const newInterview: CustomerInterview = {
            id: Date.now().toString(),
            customerStatus: 'Not Yet Closed',
            ...newEntryData
        };

        // Ensure all headers exist
        headers.forEach(h => {
            if (h !== 'Status' && !newInterview[h]) newInterview[h] = '';
        });

        const { id, customerStatus, ...custom } = newInterview;

        // Extract Schema Fields from Custom Data
        const willingnessKey = 'Willingness to Pay ($)';
        const willingnessToPay = custom[willingnessKey] as string | undefined;
        if (willingnessToPay) {
            delete custom[willingnessKey];
        }

        // Optimistic update
        onUpdateProject(p => ({
            ...p,
            customerInterviews: [newInterview, ...p.customerInterviews]
        }));

        await addInterview({
            projectId: data.id,
            customerStatus: customerStatus || 'Not Yet Closed',
            customData: JSON.stringify(custom),
            willingnessToPay: willingnessToPay
        });

        setShowAddEntryModal(false);
        setNewEntryData({});
        toast.success("Interview added", { icon: <Check className="w-4 h-4 text-black" /> });
    };

    const handleUpdateCell = (id: string, field: string, value: string) => {
        onUpdateProject(p => ({
            ...p,
            customerInterviews: p.customerInterviews.map(i =>
                i.id === id ? { ...i, [field]: value } : i
            )
        }));

        const interview = data.customerInterviews.find(i => i.id === id);
        if (interview) {
            const { id: _id, customerStatus, sentiment, aiAnalysis, ...rest } = interview;

            // Apply update
            const updatedObject: any = { ...rest, [field]: value };

            // Extract Schema Fields
            const willingnessKey = 'Willingness to Pay ($)';
            const willingnessToPay = updatedObject[willingnessKey];

            // Clean payload
            delete updatedObject[willingnessKey];
            delete updatedObject['willingnessToPay'];

            updateInterview({
                id: id as any,
                customData: JSON.stringify(updatedObject),
                willingnessToPay: willingnessToPay
            });
        }
    };

    const handleUpdateStatus = (id: string, status: CustomerStatus) => {
        onUpdateProject(p => ({
            ...p,
            customerInterviews: p.customerInterviews.map(i =>
                i.id === id ? { ...i, Status: status, customerStatus: status } : i
            )
        }));

        const existing = data.customerInterviews.find(i => i.id === id);
        // Only trigger update if it's a real Convex ID, not a generic floating local one
        if (existing && existing.id && !existing.id.toString().includes('.')) {
            updateInterview({
                id: existing.id as any,
                customerStatus: status
            });
        }
    };

    const handleDuplicateInterview = async (id: string) => {
        const original = data.customerInterviews.find(i => i.id === id);
        if (!original) return;

        const { id: _id, _id: _convexId, _creationTime, ...fields } = original as any;
        const duplicated: any = {
            ...fields,
            id: Date.now().toString(),
            Name: `Copy of ${original.Name || 'Interview'}`,
            customerStatus: original.customerStatus || 'Not Yet Closed',
        };

        // Optimistic update
        onUpdateProject(p => ({
            ...p,
            customerInterviews: [duplicated, ...p.customerInterviews]
        }));

        const { customerStatus, sentiment, aiAnalysis, willingnessToPay, ...custom } = duplicated;
        await addInterview({
            projectId: data.id,
            customerStatus: customerStatus || 'Not Yet Closed',
            customData: JSON.stringify(custom),
            willingnessToPay: willingnessToPay,
        });
        toast.success("Interview duplicated", { icon: <Copy className="w-4 h-4 text-black" /> });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Delete this record?')) {
            onUpdateProject(p => ({
                ...p,
                customerInterviews: p.customerInterviews.filter(i => i.id !== id)
            }));
            if (selectedInterviewId === id) setSelectedInterviewId(null);
            deleteInterview({ id: id as any });
            toast.success("Interview deleted", { icon: <Trash2 className="w-4 h-4 text-black" /> });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (confirm(`Delete ${selectedIds.size} selected interviews?`)) {
            const idsToDelete = Array.from(selectedIds);
            onUpdateProject(p => ({
                ...p,
                customerInterviews: p.customerInterviews.filter(i => !selectedIds.has(i.id))
            }));
            setSelectedIds(new Set());
            if (selectedInterviewId && selectedIds.has(selectedInterviewId)) setSelectedInterviewId(null);
            await bulkDelete({ ids: idsToDelete as any });
            toast.success("Interviews deleted", { icon: <Trash2 className="w-4 h-4 text-black" /> });
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedInterviews.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedInterviews.map(i => i.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleAddColumn = () => {
        const name = prompt("Enter new column name:");
        if (name && !headers.includes(name)) {
            onUpdateProject(p => ({
                ...p,
                customerInterviews: p.customerInterviews.map(i => ({ ...i, [name]: '' }))
            }));
        }
    };

    const handleRunAnalysis = async () => {
        if (!selectedInterview) return;
        setIsAnalyzing(true);
        const result = await analyzeCustomerFeedback(selectedInterview, settings);
        onUpdateProject(p => ({
            ...p,
            customerInterviews: p.customerInterviews.map(i =>
                i.id === selectedInterview.id
                    ? { ...i, sentiment: result.sentiment, aiAnalysis: result.aiAnalysis }
                    : i
            )
        }));

        // Persist to backend
        await updateInterview({
            id: selectedInterview.id as any,
            sentiment: result.sentiment,
            aiAnalysis: result.aiAnalysis
        });

        setIsAnalyzing(false);
    };

    const handleCreateRoadmapTask = async () => {
        if (!selectedInterview || !selectedInterview.aiAnalysis) return;

        try {
            await addFeatureMutation({
                projectId: data.id,
                title: `Insight from ${selectedInterview.Name || 'Interview'}`,
                description: selectedInterview.aiAnalysis,
                status: 'Backlog',
                priority: selectedInterview.sentiment === 'Negative' ? 'High' : 'Medium',
                tags: ['Customer Insight'],
            });
            toast.success("Task added to Roadmap", {
                description: "Go to Product Hub > Roadmap to view/edit."
            });
        } catch (error) {
            toast.error("Failed to create task");
        }
    };

    // --- Video Interview Handlers ---
    const handleAddVideoInterview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVideoName || !newVideoEmail) return;
        setIsUploading(true);

        try {
            let waiverId: string | undefined = undefined;
            let videoId: string | undefined = undefined;

            if (waiverFile) {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": waiverFile.type },
                    body: waiverFile,
                });
                const { storageId } = await result.json();
                waiverId = storageId;
            }

            if (videoFile) {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": videoFile.type },
                    body: videoFile,
                });
                const { storageId } = await result.json();
                videoId = storageId;
            }

            await saveVideoInterview({
                projectId: data.id,
                name: newVideoName,
                email: newVideoEmail,
                waiverFileId: waiverId,
                videoFileId: videoId,
                linkedInterviewId: newVideoLinkedId || undefined
            });

            setShowAddVideoModal(false);
            setNewVideoName('');
            setNewVideoEmail('');
            setNewVideoLinkedId('');
            setWaiverFile(null);
            setVideoFile(null);
            toast.success("Video interview added", { icon: <Video className="w-4 h-4 text-black" /> });
        } catch (error) {
            alert("Failed to upload files. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteVideoInterview = (id: string) => {
        toast("Delete this interview?", {
            action: {
                label: "Delete",
                onClick: async () => {
                    await deleteVideoInterview({ id: id as any });
                    if (selectedVideoInterview?._id === id) setSelectedVideoInterview(null);
                    toast.success("Video interview deleted", { icon: <Trash2 className="w-4 h-4 text-black" /> });
                }
            },
            cancel: {
                label: "Cancel",
                onClick: () => { }
            }
        });
    };


    // Filter Logic
    const filteredInterviews = data.customerInterviews.filter(i =>
        Object.values(i).some(val => typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
    const paginatedInterviews = filteredInterviews.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* Left Sidebar - Vertical Image with Logo and Title */}
            <div className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img
                    src="/images/hero-carousel-3.png"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                    alt="Customer Discovery"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                {/* Logo */}
                <div className="absolute top-8 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>

                {/* Title and Description */}
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                    <div className="space-y-3">
                        <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs block">Customer Development</span>
                        <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                            {data.customerDiscoveryTitle || "Customer Discovery"}
                        </h2>
                        <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed">
                            "Get out of the building." Log interviews and validate hypotheses through target surveys.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="w-[80%] h-full flex flex-col relative z-10">
                {/* Header */}
                <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                        mode="light"
                    />
                    <div className="flex items-center gap-3">
                        <ModelSelect className="w-48" />
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow flex flex-col relative overflow-auto p-8">
                    <div className="max-w-[1600px] mx-auto flex flex-col w-full">
                        {/* Unified Toolbar */}
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-stone-200 pb-6">
                            {/* Left: Tabs */}
                            <div className="flex bg-white border border-stone-200 rounded-lg p-1 shadow-sm overflow-x-auto shrink-0">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <PieChartIcon className="w-3 h-3" /> Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('feedback')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'feedback' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <MessageSquare className="w-3 h-3" /> Interviews
                                </button>
                                <button
                                    onClick={() => setActiveTab('video')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'video' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <Video className="w-3 h-3" /> Video Interviews
                                </button>
                                <button
                                    onClick={() => setActiveTab('fit')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'fit' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <Target className="w-3 h-3" /> Fit Analysis
                                </button>
                                <button
                                    onClick={() => setActiveTab('questions')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'questions' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <BookOpen className="w-3 h-3" /> Question Gen
                                </button>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3">
                                {activeTab === 'feedback' ? (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or organization..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-full text-xs focus:outline-none focus:border-nobel-gold w-64 transition-all shadow-sm"
                                            />
                                        </div>
                                        {canEdit && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setNewEntryData({});
                                                        setShowAddEntryModal(true);
                                                    }}
                                                    title="Add Interview"
                                                    className="w-9 h-9 flex items-center justify-center bg-stone-900 text-white rounded-full hover:bg-nobel-gold transition-colors shadow-sm"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleExportCSV}
                                                    title="Export CSV"
                                                    className="w-9 h-9 flex items-center justify-center bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors shadow-sm"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    title="Import CSV"
                                                    className="w-9 h-9 flex items-center justify-center bg-white border border-stone-200 text-stone-600 rounded-full hover:border-nobel-gold hover:text-nobel-gold transition-colors shadow-sm"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileUpload}
                                                    accept=".csv"
                                                    className="hidden"
                                                />
                                            </>
                                        )}
                                    </>
                                ) : activeTab === 'video' ? (
                                    canEdit && (
                                        <button
                                            onClick={() => setShowAddVideoModal(true)}
                                            className="bg-stone-900 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" /> Add Video Interview
                                        </button>
                                    )
                                ) : (null
                                )}
                                {selectedIds.size > 0 && activeTab === 'feedback' && canEdit && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="ml-2 bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-200 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeTab === 'overview' && (
                            <OverviewTab
                                interviews={data.customerInterviews}
                                sentimentCounts={sentimentCounts}
                                avgWTP={avgWTP}
                            />
                        )}

                        {activeTab === 'feedback' && (
                            paginatedInterviews.length === 0 ? (
                                <EmptyState
                                    type="interviews"
                                    canEdit={canEdit}
                                    onAction={() => {
                                        setNewEntryData({});
                                        setShowAddEntryModal(true);
                                    }}
                                />
                            ) : (
                                <InterviewsTable
                                    interviews={paginatedInterviews}
                                    headers={headers}
                                    selectedId={selectedInterviewId}
                                    selectedIds={selectedIds}
                                    canEdit={canEdit}
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={filteredInterviews.length}
                                    itemsPerPage={itemsPerPage}
                                    linkedVideosMap={linkedVideosMap}
                                    onSelect={setSelectedInterviewId}
                                    onSelectAll={toggleSelectAll}
                                    onToggleSelect={toggleSelect}
                                    onUpdateStatus={handleUpdateStatus}
                                    onUpdateCell={handleUpdateCell}
                                    onDelete={handleDelete}
                                    onDuplicate={handleDuplicateInterview}
                                    onAddColumn={handleAddColumn}
                                    onPageChange={handlePageChange}
                                />
                            )
                        )}

                        {activeTab === 'video' && (
                            <VideoInterviewsTab
                                interviews={videoInterviews}
                                linkedInterviews={data.customerInterviews}
                                selectedId={selectedVideoInterview?._id}
                                canEdit={canEdit}
                                onSelect={setSelectedVideoInterview}
                                onDelete={handleDeleteVideoInterview}
                                onUpdateLink={(id, linkedId) => updateVideoInterview({ id, linkedInterviewId: linkedId })}
                                onUploadClick={() => setShowAddVideoModal(true)}
                            />
                        )}

                        {activeTab === 'fit' && (
                            <FitAnalysisTab
                                interviews={data.customerInterviews}
                                selectedIds={selectedIds}
                                isAnalyzing={isAnalyzingFit}
                                analysis={fitAnalysis}
                                onToggleSelect={toggleSelect}
                                onSelectAll={toggleSelectAll}
                                onAnalyze={handleAnalyzeFit}
                                onSave={() => openSaveDialog(fitAnalysis, 'Save Fit Analysis', `Customer Fit Analysis - ${selectedInterview?.Name || 'Candidate'}.md`)}
                                customPrompt={fitAnalysisPrompt}
                                onCustomPromptChange={setFitAnalysisPrompt}
                            />
                        )}

                        {activeTab === 'questions' && (
                            <div className="flex-grow flex flex-col items-center justify-start p-4 md:p-8 w-full gap-6">
                                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden w-full max-w-4xl p-8 md:p-12 min-h-[500px] flex flex-col mx-auto shrink-0">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center shrink-0">
                                            <BookOpen className="w-6 h-6 text-stone-900" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-2xl md:text-3xl text-stone-900">Interview Question Generator</h3>
                                            <p className="text-stone-500 text-sm md:text-base mt-1">Generate Lean Startup aligned questions to validate your problem hypothesis.</p>
                                        </div>
                                    </div>

                                    <div className="mb-6 p-6 bg-stone-50 rounded-xl border border-stone-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Target Customer (CRM)</label>
                                                <CustomSelect
                                                    value={selectedQuestionCustomerId}
                                                    onChange={setSelectedQuestionCustomerId}
                                                    options={[
                                                        { label: '--- Create New Prospect ---', value: 'new', color: 'bg-stone-50 text-stone-500 border-stone-200' },
                                                        ...data.customerInterviews.map(ci => ({
                                                            label: `${ci.Name || 'Unnamed'} ${ci.Organization ? `(${ci.Organization})` : ''}`,
                                                            value: ci.id,
                                                            color: 'bg-white text-stone-900 border-stone-200'
                                                        }))
                                                    ]}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Customer Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Jane Doe"
                                                    value={targetName}
                                                    onChange={e => setTargetName(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Role / Title</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Sales Manager"
                                                    value={targetRole}
                                                    onChange={e => setTargetRole(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Organization</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. B2B Enterprise"
                                                    value={targetDomain}
                                                    onChange={e => setTargetDomain(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Industry</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Healthcare"
                                                    value={targetIndustry}
                                                    onChange={e => setTargetIndustry(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end mb-8">
                                        <button
                                            onClick={handleGenerateQuestions}
                                            disabled={isGeneratingQuestions}
                                            className="px-6 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isGeneratingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            Generate Questions
                                        </button>
                                    </div>
                                    {/* Questions are now rendered in the side sheet */}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Question Generator Sheet */}
                    {
                        generatedQuestions && activeTab === 'questions' && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
                                    onClick={() => setGeneratedQuestions(null)}
                                />

                                <div className="fixed inset-y-0 right-0 w-[800px] bg-stone-950 shadow-2xl border-l border-stone-800 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-50 overflow-hidden flex flex-col">
                                    <div className="px-8 py-8 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                                <Sparkles className="w-6 h-6 text-nobel-gold" />
                                                Generated Questions
                                            </h3>
                                            <p className="text-xs text-stone-400 mt-2 uppercase tracking-widest">{targetName || targetRole || 'Target Customer'}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openSaveDialog(generatedQuestions || '', 'Save Interview Questions', `Interview Questions - ${targetName || targetRole || 'Target Customer'}.md`)}
                                                className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                                title="Save to Documents"
                                            >
                                                <FolderPlus className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setGeneratedQuestions(null)} className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-grow flex flex-col bg-stone-950 p-8 pb-0 overflow-y-auto w-full">
                                        <MiniEditor
                                            content={generatedQuestions}
                                            onUpdate={setGeneratedQuestions}
                                            placeholder="Edit generated questions here..."
                                            variant="dark"
                                            className="!bg-stone-950 !border-none focus-within:ring-0 [&_.ProseMirror]:text-stone-300 [&_.ProseMirror_p]:text-stone-300 min-h-full"
                                        />
                                    </div>
                                    {/* Footer */}
                                    <div className="px-8 py-6 border-t border-stone-800 bg-stone-900/50 flex justify-center gap-3 z-10 w-full mt-auto">
                                        <button
                                            onClick={() => openSaveDialog(generatedQuestions || '', 'Save Interview Questions', `Interview Questions - ${targetName || targetRole || 'Target Customer'}.md`)}
                                            className="flex-1 px-4 py-3 bg-stone-800 text-stone-300 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FolderPlus className="w-4 h-4" />
                                            Save to Documents
                                        </button>
                                        <button
                                            onClick={() => setGeneratedQuestions(null)}
                                            className="flex-1 px-4 py-3 bg-white text-stone-900 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-stone-200 transition-colors shadow-lg"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* Feedback Detail Sheet */}
                    {
                        selectedInterviewId && activeTab === 'feedback' && (
                            <>
                                <div
                                    className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
                                    onClick={() => setSelectedInterviewId(null)}
                                />
                                <div className="fixed inset-y-0 right-0 w-[40%] min-w-[420px] max-w-[640px] bg-white shadow-2xl border-l border-stone-200 z-50 flex flex-col">
                                    {/* Header */}
                                    <div className="px-8 py-6 border-b border-stone-200 flex justify-between items-start bg-[#F9F8F4] shrink-0">
                                        <div>
                                            <h3 className="font-serif text-2xl font-bold text-stone-900">{selectedInterview?.Name || 'Interview Details'}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {selectedInterview?.Role && <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{selectedInterview.Role}</span>}
                                                {selectedInterview?.Organization && (
                                                    <>
                                                        <span className="text-stone-300">•</span>
                                                        <span className="text-xs text-stone-400">{selectedInterview.Organization}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedInterviewId(null)} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-full transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="flex-grow overflow-y-auto">
                                        {/* Fields Accordion */}
                                        <div className="border-b border-stone-100">
                                            <button
                                                onClick={() => setFieldsAccordionOpen(!fieldsAccordionOpen)}
                                                className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-stone-500" />
                                                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Customer Details</span>
                                                </div>
                                                {fieldsAccordionOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                                            </button>
                                            {fieldsAccordionOpen && (
                                                <div className="px-8 pb-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {headers.filter(h => h !== 'Status' && h !== 'Name' && h !== 'Role' && h !== 'Notes' && h !== 'Video' && h !== 'Waiver').map(header => (
                                                            <div key={header} className={header === 'Pain Points' || header === 'Survey Feedback' ? 'col-span-2' : ''}>
                                                                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-1.5">
                                                                    {header}
                                                                </label>
                                                                <div className="text-sm text-stone-800 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-100 min-h-[2.5rem]">
                                                                    {selectedInterview?.[header] || <span className="text-stone-300">—</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Add Video Button (when no video linked) */}
                                        {selectedInterview && !linkedVideosMap.get(selectedInterview.id) && (
                                            <div className="px-8 py-4 border-b border-stone-100">
                                                <button
                                                    onClick={() => {
                                                        setNewVideoLinkedId(selectedInterview.id);
                                                        setNewVideoName(selectedInterview.Name || '');
                                                        setShowAddVideoModal(true);
                                                    }}
                                                    className="w-full py-3 bg-stone-900 text-white rounded-lg font-bold text-sm hover:bg-nobel-gold transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Video className="w-4 h-4" /> Add Video Interview
                                                </button>
                                            </div>
                                        )}

                                        {/* Notes & Questions Accordion */}
                                        {selectedInterview && (
                                            <div className="border-b border-stone-100">
                                                <button
                                                    onClick={() => setNotesAccordionOpen(!notesAccordionOpen)}
                                                    className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-stone-500" />
                                                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Interview Notes & Questions</span>
                                                        {selectedInterview.Notes && (
                                                            <span className="text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-medium">Has Content</span>
                                                        )}
                                                    </div>
                                                    {notesAccordionOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                                                </button>
                                                {notesAccordionOpen && (
                                                    <div className="px-8 pb-6">
                                                        <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:p-4 [&_.ProseMirror_h1]:text-lg [&_.ProseMirror_h1]:font-serif [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:border-b [&_.ProseMirror_h2]:border-stone-200 [&_.ProseMirror_h2]:pb-2 [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-nobel-gold [&_.ProseMirror_blockquote]:bg-amber-50 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:px-3 [&_.ProseMirror_blockquote]:rounded-r-lg [&_.ProseMirror_blockquote]:text-xs [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-2 min-h-[400px] overflow-y-auto">
                                                            <MiniEditor
                                                                content={selectedInterview.Notes || ''}
                                                                onUpdate={(newContent) => {
                                                                    if (canEdit && selectedInterview._id) {
                                                                        updateInterview({
                                                                            id: selectedInterview._id,
                                                                            updates: { Notes: newContent }
                                                                        });
                                                                    }
                                                                }}
                                                                placeholder="Write interview notes or generate questions..."
                                                                disabled={!canEdit}
                                                                className="!border-none !bg-transparent"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Video & Waiver Accordion */}
                                        {selectedInterview && linkedVideosMap.get(selectedInterview.id) && (
                                            <div className="border-b border-stone-100">
                                                <button
                                                    onClick={() => setMediaAccordionOpen(!mediaAccordionOpen)}
                                                    className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Video className="w-4 h-4 text-stone-500" />
                                                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Video & Waiver</span>
                                                        {(linkedVideosMap.get(selectedInterview.id)?.videoUrl || linkedVideosMap.get(selectedInterview.id)?.waiverUrl) && (
                                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Uploaded</span>
                                                        )}
                                                    </div>
                                                    {mediaAccordionOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                                                </button>
                                                {mediaAccordionOpen && (
                                                    <div className="px-8 pb-6 space-y-6">
                                                        <input type="file" ref={replaceVideoRef} className="hidden" accept="video/*" onChange={(e) => handleReplaceUpload(e, 'video')} />
                                                        <input type="file" ref={replaceWaiverRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleReplaceUpload(e, 'waiver')} />
                                                        {/* Video */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Video Recording</span>
                                                                <button disabled={isUploading} onClick={() => replaceVideoRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold hover:underline disabled:opacity-50">
                                                                    {linkedVideosMap.get(selectedInterview.id)?.videoUrl ? 'Replace' : 'Upload'}
                                                                </button>
                                                            </div>
                                                            {linkedVideosMap.get(selectedInterview.id)?.videoUrl ? (
                                                                <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video"><video src={linkedVideosMap.get(selectedInterview.id).videoUrl} controls className="w-full h-full object-cover" /></div>
                                                            ) : (
                                                                <div className="bg-stone-50 rounded-xl h-24 flex items-center justify-center border border-stone-200 border-dashed text-stone-400 text-sm">No video uploaded</div>
                                                            )}
                                                        </div>
                                                        {/* Waiver */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Signed Waiver</span>
                                                                <button disabled={isUploading} onClick={() => replaceWaiverRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold hover:underline disabled:opacity-50">
                                                                    {linkedVideosMap.get(selectedInterview.id)?.waiverUrl ? 'Replace' : 'Upload'}
                                                                </button>
                                                            </div>
                                                            {linkedVideosMap.get(selectedInterview.id)?.waiverUrl ? (
                                                                <>
                                                                    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden h-48 shadow-inner">
                                                                        <iframe src={linkedVideosMap.get(selectedInterview.id).waiverUrl} className="w-full h-full" title="Waiver Preview" />
                                                                    </div>
                                                                    <a href={linkedVideosMap.get(selectedInterview.id).waiverUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs font-bold text-nobel-gold hover:underline flex items-center gap-1">
                                                                        <Eye className="w-3 h-3" /> Open in new tab
                                                                    </a>
                                                                </>
                                                            ) : (
                                                                <div className="bg-stone-50 rounded-xl h-20 flex items-center justify-center border border-stone-200 border-dashed text-stone-400 text-sm">No waiver uploaded</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* AI Insights Accordion */}
                                        <div className="border-b border-stone-100">
                                            <button
                                                onClick={() => setInsightsAccordionOpen(!insightsAccordionOpen)}
                                                className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Brain className="w-4 h-4 text-nobel-gold" />
                                                    <span className="text-xs font-bold uppercase tracking-widest text-stone-900">Research Insights</span>
                                                    {selectedInterview && <SentimentBadge sentiment={selectedInterview.sentiment} />}
                                                </div>
                                                {insightsAccordionOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                                            </button>
                                            {insightsAccordionOpen && (
                                                <div className="px-8 pb-6">
                                                    {!selectedInterview?.aiAnalysis ? (
                                                        <div className="bg-stone-50 rounded-xl p-6 border border-stone-100 text-center">
                                                            <p className="text-xs text-stone-500 mb-4 italic">No analysis performed on this interview yet.</p>
                                                            <button
                                                                onClick={handleRunAnalysis}
                                                                disabled={isAnalyzing}
                                                                className="flex items-center gap-2 mx-auto px-4 py-2 bg-stone-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-sm disabled:opacity-50"
                                                            >
                                                                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                                {isAnalyzing ? 'Analyzing...' : 'Generate AI Insights'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="bg-nobel-gold/5 rounded-xl p-4 border border-nobel-gold/10">
                                                                <p className="text-sm text-stone-800 leading-relaxed italic">
                                                                    "{selectedInterview.aiAnalysis}"
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={handleCreateRoadmapTask}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-sm"
                                                                >
                                                                    <LayoutGrid className="w-4 h-4" /> Convert to Roadmap Task
                                                                </button>
                                                                <button
                                                                    onClick={handleRunAnalysis}
                                                                    disabled={isAnalyzing}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
                                                                >
                                                                    <Sparkles className="w-3.5 h-3.5" /> Regenerate Analysis
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* Video Interview Detail Sheet */}
                    {
                        selectedVideoInterview && activeTab === 'video' && (
                            <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-stone-200 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-40 overflow-y-auto flex flex-col">
                                <div className="p-6 border-b border-stone-100 flex justify-between items-start bg-[#F9F8F4]">
                                    <div>
                                        <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">{selectedVideoInterview.name}</h3>
                                        <p className="text-xs text-stone-500 uppercase tracking-widest">{selectedVideoInterview.email}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {canEdit && (
                                            <button
                                                onClick={() => handleDeleteVideoInterview(selectedVideoInterview._id)}
                                                className="text-stone-400 hover:text-red-500 transition-colors p-1"
                                                title="Delete Interview"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={() => setSelectedVideoInterview(null)} className="text-stone-400 hover:text-stone-900 p-1">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                                    {/* Video Player */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Video className="w-4 h-4 text-stone-900" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Interview Recording</span>
                                        </div>
                                        {selectedVideoInterview.videoUrl ? (
                                            <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video flex items-center justify-center relative group">
                                                <video
                                                    src={selectedVideoInterview.videoUrl}
                                                    controls
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="bg-stone-100 rounded-xl aspect-video flex items-center justify-center text-stone-400 text-sm italic border border-stone-200 border-dashed">
                                                No video uploaded
                                            </div>
                                        )}
                                    </div>

                                    {/* Waiver Preview */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText className="w-4 h-4 text-stone-900" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Signed Waiver</span>
                                        </div>
                                        {selectedVideoInterview.waiverUrl ? (
                                            <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden h-96 shadow-inner">
                                                <iframe
                                                    src={selectedVideoInterview.waiverUrl}
                                                    className="w-full h-full"
                                                    title="Waiver Preview"
                                                />
                                            </div>
                                        ) : (
                                            <div className="bg-stone-100 rounded-xl h-32 flex items-center justify-center text-stone-400 text-sm italic border border-stone-200 border-dashed">
                                                No waiver uploaded
                                            </div>
                                        )}
                                        {selectedVideoInterview.waiverUrl && (
                                            <a
                                                href={selectedVideoInterview.waiverUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-xs font-bold text-nobel-gold hover:underline flex items-center gap-1"
                                            >
                                                <Eye className="w-3 h-3" /> Open in new tab
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Add Video Interview Modal */}
                    {
                        showAddVideoModal && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100]"
                                    onClick={() => { setShowAddVideoModal(false); setNewVideoLinkedId(''); }}
                                />

                                {/* Sheet */}
                                <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-stone-900 border-l border-stone-800 overflow-hidden flex flex-col z-[110] shadow-2xl animate-in slide-in-from-right duration-300">
                                    <div className="px-8 py-6 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 backdrop-blur-md">
                                        <h3 className="text-2xl font-serif font-bold text-white">Add Video Interview</h3>
                                        <button onClick={() => { setShowAddVideoModal(false); setNewVideoLinkedId(''); }} className="text-stone-400 hover:text-white transition-colors bg-stone-800/50 hover:bg-stone-800 p-2 rounded-full">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <form id="add-video-form" onSubmit={handleAddVideoInterview} className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newVideoName}
                                                    onChange={(e) => setNewVideoName(e.target.value)}
                                                    className="w-full pl-4 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner"
                                                    placeholder="Interviewee Name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={newVideoEmail}
                                                    onChange={(e) => setNewVideoEmail(e.target.value)}
                                                    className="w-full pl-4 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner"
                                                    placeholder="interviewee@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Link to Interviewee (Optional)</label>
                                                <div className="relative">
                                                    <select
                                                        value={newVideoLinkedId}
                                                        onChange={(e) => setNewVideoLinkedId(e.target.value)}
                                                        className="w-full pl-4 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner appearance-none cursor-pointer"
                                                    >
                                                        <option value="" className="bg-stone-800">Select Interviewee...</option>
                                                        {data.customerInterviews.map(ci => (
                                                            <option key={ci.id} value={ci.id} className="bg-stone-800">{ci.Name || 'Unnamed'} ({ci.Role || 'No Role'})</option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-400">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Signed Waiver (PDF)</label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => setWaiverFile(e.target.files?.[0] || null)}
                                                    className="w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Video Recording</label>
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                                                    className="w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer"
                                                />
                                            </div>
                                        </form>
                                    </div>
                                    <div className="p-6 border-t border-stone-800 bg-stone-900/50 backdrop-blur-md flex justify-end gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => { setShowAddVideoModal(false); setNewVideoLinkedId(''); }}
                                            className="px-6 py-3 text-stone-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-lg hover:bg-stone-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            form="add-video-form"
                                            disabled={isUploading}
                                            className="px-8 py-3 bg-nobel-gold text-stone-900 hover:bg-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {isUploading ? 'Uploading...' : 'Save Interview'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    }
                    {/* Add Entry Modal */}
                    {
                        showAddEntryModal && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100]"
                                    onClick={() => setShowAddEntryModal(false)}
                                />

                                {/* Sheet */}
                                <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-stone-900 border-l border-stone-800 overflow-hidden flex flex-col z-[110] shadow-2xl animate-in slide-in-from-right duration-300">
                                    <div className="px-8 py-6 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 backdrop-blur-md">
                                        <h3 className="text-2xl font-serif font-bold text-white">Add New Entry</h3>
                                        <button onClick={() => setShowAddEntryModal(false)} className="text-stone-400 hover:text-white transition-colors bg-stone-800/50 hover:bg-stone-800 p-2 rounded-full">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <form id="add-entry-form" onSubmit={handleAddEntry} className="grid grid-cols-2 gap-6">
                                            {headers.filter(h => h !== 'Status').map(header => {
                                                const isTextArea = header === 'Notes' || header === 'Pain Points' || header === 'Survey Feedback';

                                                // Special Logic for Specific Headers
                                                if (header === 'Video') {
                                                    return (
                                                        <div key={header} className="col-span-1">
                                                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Linked Video</label>
                                                            <CustomSelect
                                                                value={newEntryData[header] || ''}
                                                                onChange={(val) => setNewEntryData(prev => ({ ...prev, [header]: val }))}
                                                                options={[
                                                                    { label: 'None', value: '' },
                                                                    ...videoFiles.map(f => ({ label: f.name, value: f.name }))
                                                                ]}
                                                                placeholder="Select Video..."
                                                                variant="dark"
                                                            />
                                                        </div>
                                                    );
                                                }

                                                if (header === 'Waiver') {
                                                    return (
                                                        <div key={header} className="col-span-1">
                                                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Signed Waiver</label>
                                                            <CustomSelect
                                                                value={newEntryData[header] || ''}
                                                                onChange={(val) => setNewEntryData(prev => ({ ...prev, [header]: val }))}
                                                                options={[
                                                                    { label: 'None', value: '' },
                                                                    ...documentFiles.map(f => ({ label: f.name, value: f.name }))
                                                                ]}
                                                                placeholder="Select Waiver..."
                                                                variant="dark"
                                                            />
                                                        </div>
                                                    );
                                                }

                                                if (header === 'Willingness to Pay ($)') {
                                                    return (
                                                        <div key={header} className="col-span-1 grid grid-cols-2 gap-2">
                                                            <div className={interestStatus === 'No' ? 'col-span-2' : 'col-span-1'}>
                                                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Willing to Pay?</label>
                                                                <CustomSelect
                                                                    value={interestStatus}
                                                                    onChange={(val) => {
                                                                        const newStatus = val;
                                                                        let newValue = newStatus;
                                                                        if (newStatus === 'Yes' && priceValue) newValue = `$${priceValue}`;
                                                                        setNewEntryData(prev => ({ ...prev, [header]: newValue }));
                                                                    }}
                                                                    options={[
                                                                        { label: 'Yes', value: 'Yes', color: 'bg-green-100 text-green-700' },
                                                                        { label: 'Maybe', value: 'Maybe', color: 'bg-yellow-100 text-yellow-700' },
                                                                        { label: 'No', value: 'No', color: 'bg-red-100 text-red-700' }
                                                                    ]}
                                                                    variant="dark"
                                                                />
                                                            </div>
                                                            {interestStatus !== 'No' && (
                                                                <div className="col-span-1 animate-in slide-in-from-left-2 duration-200">
                                                                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Target Price</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">$</span>
                                                                        <input
                                                                            type="number"
                                                                            value={priceValue}
                                                                            onChange={(e) => {
                                                                                const price = e.target.value;
                                                                                setNewEntryData(prev => ({ ...prev, [header]: `$${price}` }));
                                                                            }}
                                                                            className="w-full pl-7 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner"
                                                                            placeholder="0.00"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={header} className={isTextArea ? "col-span-2" : "col-span-1"}>
                                                        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">{header}</label>
                                                        {isTextArea ? (
                                                            <textarea
                                                                value={newEntryData[header] || ''}
                                                                onChange={(e) => setNewEntryData(prev => ({ ...prev, [header]: e.target.value }))}
                                                                className="w-full px-4 py-3 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 min-h-[100px] resize-none transition-all placeholder-stone-600 shadow-inner"
                                                                placeholder={`Enter ${header}...`}
                                                            />
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={newEntryData[header] || ''}
                                                                onChange={(e) => setNewEntryData(prev => ({ ...prev, [header]: e.target.value }))}
                                                                className="w-full px-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all placeholder-stone-600 shadow-inner"
                                                                placeholder={`Enter ${header}...`}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </form>
                                    </div>
                                    <div className="p-6 border-t border-stone-800 bg-stone-900/50 backdrop-blur-md flex justify-end gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddEntryModal(false)}
                                            className="px-6 py-3 text-stone-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-lg hover:bg-stone-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            form="add-entry-form"
                                            className="px-8 py-3 bg-nobel-gold text-stone-900 hover:bg-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl transition-all"
                                        >
                                            Save Entry
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    }
                </main>
            </div >
            {/* Save to Files Dialog */}
            < SaveToFilesDialog
                isOpen={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
                projectId={data.id as string}
                onSave={handleSaveToDocs}
                title={saveDialogTitle}
                defaultFilename={saveDialogFilename}
            />
        </div >
    );
};

export default CustomerDev;