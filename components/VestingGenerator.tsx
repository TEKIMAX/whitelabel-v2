
import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useCreateDocument } from '../hooks/useCreate';
import { StartupData, AISettings, VestingSettings, TeamMember } from '../types';
import { Info, AlertTriangle, FileText, Check, Download, ExternalLink } from 'lucide-react';
import TabNavigation from './TabNavigation';
import CustomSelect from './CustomSelect';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

interface VestingGeneratorProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
}

const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1.5 align-middle z-10">
        <Info className="w-3.5 h-3.5 text-stone-400 cursor-help hover:text-nobel-gold transition-colors" />
        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-stone-900 text-white text-[10px] leading-relaxed rounded p-3 shadow-xl text-center pointer-events-none font-sans">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-stone-900"></div>
        </div>
    </div>
);

const VestingGenerator: React.FC<VestingGeneratorProps> = ({
    data,
    allProjects, // Added
    onUpdateProject,
    onSwitchProject, // Added
    onNewProject, // Added
    onNavigate,
    currentView,
    allowedPages
}) => {
    // Check if vesting settings exist, parse if string, use default if missing
    const initialSettings: VestingSettings = data.vestingSettings
        ? (typeof data.vestingSettings === 'string' ? JSON.parse(data.vestingSettings) : data.vestingSettings)
        : { cliffMonths: 12, vestingMonths: 48, acceleration: 'Double Trigger' };

    const [vestingSettings, setVestingSettings] = useState<VestingSettings>(initialSettings);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [shareAmount, setShareAmount] = useState<number>(data.totalShares || 0); // Default to project total shares if set
    const [activeSubTab, setActiveSubTab] = useState<'configure' | 'document'>('configure');

    const updateProject = useMutation(api.projects.update);
    const createDocument = useCreateDocument();

    const handleSaveSettings = async () => {
        const settingsStr = JSON.stringify(vestingSettings);
        await updateProject({
            id: data.id as any,
            updates: { vestingSettings: settingsStr as any }
        });
        onUpdateProject(p => ({ ...p, vestingSettings: settingsStr as any }));
        alert("Vesting settings saved.");
    };

    const handleGenerate = async () => {
        if (!selectedMemberId) {
            alert("Please select a team member.");
            return;
        }
        if (!shareAmount || shareAmount <= 0) {
            alert("Please enter a valid number of shares.");
            return;
        }

        const member = data.teamMembers.find(m => m.id === selectedMemberId);
        if (!member) return;

        // Generate content
        const content = generateAgreementText(member, vestingSettings, data.name, shareAmount);

        // Save to Legal Documents
        await createDocument({
            projectId: data.id as any,
            type: "Vesting Agreement",
            title: `${member.name} - Vesting Agreement`,
            content: content,
            tags: [{ name: "Draft", color: "#6b7280" }]
        });

        alert(`Vesting Agreement generated for ${member.name} in Legal Documents.`);
        onNavigate('LEGAL');
    };

    const generateAgreementText = (member: TeamMember, settings: VestingSettings, companyName: string, shares: number) => {
        const startDate = settings.commencementDate ? new Date(settings.commencementDate).toLocaleDateString() : "__________";
        const cliffDate = settings.commencementDate ? new Date(settings.commencementDate + (settings.cliffMonths * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString() : "__________";

        return `
# FOUNDER STOCK RESTRICTION AGREEMENT (VESTING)

**THIS AGREEMENT** is made as of ${new Date().toLocaleDateString()}, by and between **${companyName}** (the "Company"), and **${member.name}** ("Founder").

## 1. VESTING PROVISIONS
The Shares issued to the Founder shall be subject to vesting as follows:

*   **Total Shares:** ${shares.toLocaleString()}
*   **Vesting Start Date:** ${startDate}
*   **Total Vesting Period:** ${settings.vestingMonths} months
*   **Cliff Period:** ${settings.cliffMonths} months

**Schedule:** 
Subject to the Founder's continued service with the Company, ${((1 / settings.vestingMonths) * settings.cliffMonths * 100).toFixed(2)}% of the Shares (${Math.floor(shares * (settings.cliffMonths / settings.vestingMonths)).toLocaleString()} shares) shall vest on ${cliffDate} (the "Cliff Date"). Thereafter, the remaining unvested Shares shall vest in equal monthly installments over the following ${(settings.vestingMonths - settings.cliffMonths)} months.

## 2. ACCELERATION
${settings.acceleration === 'Single Trigger'
                ? "In the event of a Change of Control, 100% of the unvested Shares shall immediately vest."
                : settings.acceleration === 'Double Trigger'
                    ? "In the event of a Change of Control followed by Involuntary Termination within 12 months, 100% of the unvested Shares shall immediately vest."
                    : "No acceleration provisions apply."}

## 3. UNVESTED SHARE REPURCHASE
Upon termination of the Founder's service for any reason, the Company shall have the right to repurchase any Unvested Shares at the original purchase price paid per share (or $0.0001 per share if no price effectively paid).

## 4. 83(b) ELECTION

**THE COMPANY**

__________________________________________________
By: ${settings.repName || '________________'}
Title: ${settings.repTitle || 'President'}


**THE PURCHASER**

__________________________________________________
${member.name}

    `;
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#F9F8F4]/80 backdrop-blur-md border-b border-stone-200">
                <div className="w-full px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <div className="h-6 w-px bg-stone-300 mx-2"></div>
                        <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} />
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 opacity-80 hover:opacity-100 transition-opacity">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Legal Disclaimer: For educational purposes only. Consult an attorney.</span>
                    </div>
                </div>
            </div>

            <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12">
                {/* Disclaimer */}


                <div className="space-y-4">
                    <h1 className="font-serif text-5xl text-stone-900">Founder Vesting</h1>
                    <p className="text-lg text-stone-500 max-w-2xl">
                        Configure standard vesting terms to protect the company and incentivize long-term commitment.
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
                            <h3 className="font-serif text-xl border-b border-stone-100 pb-3 mb-4">Terms Configuration</h3>

                            <div>
                                <label className="flex items-center text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                    Vesting Commencement Date <Tooltip text="The date when vesting officially begins. Usually the start date of employment or incorporation." />
                                </label>
                                <input
                                    type="date"
                                    value={vestingSettings.commencementDate ? new Date(vestingSettings.commencementDate).toISOString().substr(0, 10) : ''}
                                    onChange={(e) => setVestingSettings({ ...vestingSettings, commencementDate: e.target.valueAsNumber })}
                                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-sm font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                        Total Period <Tooltip text="Standard is 48 months (4 years)." />
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={vestingSettings.vestingMonths}
                                            onChange={(e) => setVestingSettings({ ...vestingSettings, vestingMonths: parseInt(e.target.value) })}
                                            className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-sm font-mono"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-stone-400">Mo</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                        Cliff Period <Tooltip text="A period (usually 12 months) before any shares vest. If you leave before the cliff, you get nothing." />
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={vestingSettings.cliffMonths}
                                            onChange={(e) => setVestingSettings({ ...vestingSettings, cliffMonths: parseInt(e.target.value) })}
                                            className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-sm font-mono"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-stone-400">Mo</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                    Acceleration <Tooltip text="Single Trigger: Vests on sale. Double Trigger: Vests on sale AND termination. Double trigger is industry standard." />
                                </label>
                                <div className="space-y-2">
                                    {['None', 'Single Trigger', 'Double Trigger'].map((opt) => (
                                        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-stone-50 rounded">
                                            <input
                                                type="radio"
                                                name="acceleration"
                                                checked={vestingSettings.acceleration === opt}
                                                onChange={() => setVestingSettings({ ...vestingSettings, acceleration: opt as any })}
                                                className="accent-stone-900"
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded text-xs uppercase tracking-wider transition-colors"
                            >
                                Save Default Settings
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
                            <h3 className="font-serif text-xl border-b border-stone-100 pb-3 mb-4">Generate Agreement</h3>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Select Team Member</label>
                                <CustomSelect
                                    options={data.teamMembers.map(m => ({ label: m.name + (m.role ? ' (' + m.role + ')' : ''), value: m.id }))}
                                    value={selectedMemberId}
                                    onChange={setSelectedMemberId}
                                    placeholder="Select a founder..."
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Company Representative</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        value={vestingSettings.repName || ''}
                                        onChange={(e) => setVestingSettings({ ...vestingSettings, repName: e.target.value })}
                                        placeholder="Name (e.g. CEO Name)"
                                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-sm font-mono"
                                    />
                                    <input
                                        value={vestingSettings.repTitle || ''}
                                        onChange={(e) => setVestingSettings({ ...vestingSettings, repTitle: e.target.value })}
                                        placeholder="Title (e.g. President)"
                                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-sm font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Number of Shares</label>
                                <input
                                    type="number"
                                    value={shareAmount || ''}
                                    onChange={(e) => setShareAmount(parseInt(e.target.value))}
                                    placeholder="e.g. 1,000,000"
                                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-sm font-mono"
                                />
                                <p className="text-[10px] text-stone-400 mt-1">
                                    Correlates to SAFE capitalization if applicable.
                                </p>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!selectedMemberId || !shareAmount}
                                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${selectedMemberId && shareAmount > 0
                                    ? 'bg-stone-900 text-white hover:bg-nobel-gold hover:translate-y-px shadow-lg hover:shadow-xl'
                                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    } `}
                            >
                                <FileText className="w-4 h-4" />
                                Generate Agreement
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Preview */}
                    <div className="lg:col-span-2">
                        <div className="bg-white shadow-xl min-h-[800px] p-16 relative">
                            <div className="absolute top-0 right-0 p-4 bg-stone-50 border-b border-l border-stone-100 text-[10px] text-stone-400 font-mono uppercase tracking-widest">
                                Preview Mode
                            </div>

                            <div className="prose prose-stone max-w-none font-serif">
                                <h1 className="text-center font-bold uppercase tracking-widest text-2xl mb-12">Stock Restriction Agreement</h1>

                                <p className="leading-relaxed mb-6">
                                    <strong>THIS AGREEMENT</strong> is made generally effective as of <strong>{vestingSettings.commencementDate ? new Date(vestingSettings.commencementDate).toLocaleDateString() : '________'}</strong> (the "Effective Date"), by and between <strong>{data.name || 'The Company'}</strong>, (the "Company"), and <strong>{data.teamMembers.find(m => m.id === selectedMemberId)?.name || '________'}</strong> (the "Purchaser").
                                </p>

                                <h3 className="font-bold uppercase text-sm mt-8 mb-4">1. Purchase of Shares</h3>
                                <p className="leading-relaxed mb-6">
                                    Purchaser hereby agrees to purchase from the Company, and the Company hereby agrees to sell to Purchaser, an aggregate of <strong>{shareAmount ? shareAmount.toLocaleString() : '________'}</strong> shares of Common Stock of the Company (the "Shares") at a price of $0.0001 per share.
                                </p>

                                <h3 className="font-bold uppercase text-sm mt-8 mb-4">2. Vesting</h3>
                                <p className="leading-relaxed mb-6">
                                    The Shares shall initially be Unvested Shares. Defined conceptually as follows:
                                </p>
                                <ul className="list-disc pl-5 space-y-2 mb-6 text-sm">
                                    <li><strong>Vesting Schedule:</strong> The Unvested Shares shall vest over a period of <strong>{vestingSettings.vestingMonths} months</strong>.</li>
                                    <li><strong>Cliff:</strong> No shares shall vest until the completion of <strong>{vestingSettings.cliffMonths} months</strong> of continuous service (the "Cliff"). On the Cliff Date, <strong>{((vestingSettings.cliffMonths / vestingSettings.vestingMonths) * 100).toFixed(2)}%</strong> of the Shares shall vest.</li>
                                    <li><strong>Monthly Vesting:</strong> Thereafter, <strong>1/{vestingSettings.vestingMonths}th</strong> of the total Shares shall vest on a monthly basis.</li>
                                </ul>

                                <h3 className="font-bold uppercase text-sm mt-8 mb-4">3. Acceleration</h3>
                                <p className="leading-relaxed mb-6">
                                    {vestingSettings.acceleration === 'Single Trigger'
                                        ? "In the event of a Change of Control, 100% of the Unvested Shares shall immediately become Vested Shares."
                                        : vestingSettings.acceleration === 'Double Trigger'
                                            ? "In the event of a Change of Control, if the Purchaser is subject to an Involuntary Termination within 12 months following such event, 100% of the Unvested Shares shall immediately become Vested Shares."
                                            : "There shall be no acceleration of vesting upon a Change of Control."}
                                </p>

                                <div className="mt-16 pt-8 border-t-2 border-stone-900 grid grid-cols-2 gap-12">
                                    <div>
                                        <p className="font-bold uppercase text-xs mb-8">The Company</p>
                                        <div className="border-b border-stone-400 h-8 mb-2"></div>
                                        <p className="text-xs">By: {vestingSettings.repName || '________________'}</p>
                                        <p className="text-xs">Title: {vestingSettings.repTitle || 'President'}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold uppercase text-xs mb-8">The Purchaser</p>
                                        <div className="border-b border-stone-400 h-8 mb-2"></div>
                                        <p className="text-xs">Name: {data.teamMembers.find(m => m.id === selectedMemberId)?.name || '________'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </main>
        </div>
    );
};

export default VestingGenerator;
