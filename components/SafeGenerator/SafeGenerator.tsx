
import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { useAIExplainScenario } from '../../hooks/useAI';
import { api } from "../../convex/_generated/api";
import { useCreateSafeTeamMember } from '../../hooks/useCreate';
import { StartupData, AISettings, SafeData, Role, TeamMember, EquityContribution, CapTableScenario } from '../../types';
import { Trash2, TrendingUp, Settings, FileText, Download, Printer, AlertTriangle, Play, Save, Plus, Scale, Building2, ShieldAlert, PieChart, Info, DollarSign, Calculator, BarChart3, Link, Check, LayoutGrid, BookOpen, Shield, UserPlus, X, Table as TableIcon, Maximize2, ChevronRight, Loader2 } from 'lucide-react';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import CustomSelect from '../CustomSelect';
import ScenarioExplanationModal from '../ScenarioExplanationModal';
import { Logo } from '../Logo';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface SafeGeneratorProps {
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

const SafeGenerator: React.FC<SafeGeneratorProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    settings,
    allowedPages
}) => {
    // --- HOOKS ---
    const explainScenario = useAIExplainScenario();
    const updateProject = useMutation(api.projects.update);
    const addTeamMember = useCreateSafeTeamMember();
    const deleteTeamMember = useMutation(api.safe.deleteTeamMember);

    // --- STATE ---
    const [activeSubTab, setActiveSubTab] = useState<'configure' | 'captable' | 'document' | 'proforma' | 'simulation' | 'guide' | 'vesting'>('configure');
    const [selectedTemplate, setSelectedTemplate] = useState('custom');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);

    // Simulation / Fundraising States
    const [totalPreMoneyShares, setTotalPreMoneyShares] = useState<number>(data.totalShares || 10000000);
    const [exitValuation, setExitValuation] = useState<number>(10000000);

    const [scenarios, setScenarios] = useState<CapTableScenario[]>(() => {
        if ((data as any).capTableScenarios) {
            try { return JSON.parse((data as any).capTableScenarios); } catch (e) { return []; }
        }
        return [];
    });

    // Vesting States
    const SAMPLE_NAMES = ['Alex Johnson', 'Sam Rivera', 'Jordan Chen', 'Casey Kim', 'Morgan Lee'];
    const initialVesting = data.vestingSettings ? (typeof data.vestingSettings === 'string' ? JSON.parse(data.vestingSettings) : data.vestingSettings) : { cliffMonth: 12, vestingMonths: 48 };
    const [vestingPeriod, setVestingPeriod] = useState(initialVesting.vestingMonths || 48);
    const [cliffPeriod, setCliffPeriod] = useState(initialVesting.cliffMonth || 12);
    const [acceleration, setAcceleration] = useState('double');
    const [vestingRecipientName, setVestingRecipientName] = useState(() => SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]);
    const [vestingShares, setVestingShares] = useState(data.totalShares ? Math.floor(data.totalShares * 0.25) : 2500000);

    // UI States
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<Role>('Founder');
    const [explanationModalOpen, setExplanationModalOpen] = useState(false);
    const [selectedScenarioForExplanation, setSelectedScenarioForExplanation] = useState<any>(null);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(true);
    const [aiExplanation, setAiExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);

    // --- DERIVED DATA ---
    const safeData: SafeData = data.safeAgreement ? (typeof data.safeAgreement === 'string' ? JSON.parse(data.safeAgreement) : data.safeAgreement) : {
        amountRaising: 0,
        valuationCap: 0,
        discountRate: 0,
        postMoney: true,
        proRataRights: false,
        companyAddress: '',
        stateOfIncorporation: 'Delaware',
        repName: '',
        investorName: '',
        isSigned: false,
        signedTimestamp: 0
    };

    const OPTION_POOL_SHARES = 1500000;
    const FOUNDER_SHARES = totalPreMoneyShares - OPTION_POOL_SHARES;

    // --- HELPERS ---
    const calculateCapTable = () => {
        const investment = safeData.amountRaising || 0;
        const cap = safeData.valuationCap || 0;
        if (cap === 0 || investment === 0) return null;

        if (safeData.postMoney) {
            const investorPct = (investment / cap) * 100;
            const founderAndPoolPct = 100 - investorPct;
            const founderRatio = FOUNDER_SHARES / totalPreMoneyShares;
            const poolRatio = OPTION_POOL_SHARES / totalPreMoneyShares;
            const founderPct = founderAndPoolPct * founderRatio;
            const poolPct = founderAndPoolPct * poolRatio;
            const pricePerShare = cap / totalPreMoneyShares;
            const investorShares = investment / pricePerShare;
            const totalPostMoneyShares = totalPreMoneyShares + investorShares;

            return { pricePerShare, investorShares, totalPostMoneyShares, founderPct, poolPct, investorPct };
        } else {
            const pricePerShare = cap / totalPreMoneyShares;
            const investorShares = investment / pricePerShare;
            const totalPostMoneyShares = totalPreMoneyShares + investorShares;
            const founderPct = (FOUNDER_SHARES / totalPostMoneyShares) * 100;
            const poolPct = (OPTION_POOL_SHARES / totalPostMoneyShares) * 100;
            const investorPct = (investorShares / totalPostMoneyShares) * 100;

            return { pricePerShare, investorShares, totalPostMoneyShares, founderPct, poolPct, investorPct };
        }
    };

    const updateSafeData = (field: keyof SafeData, value: any) => {
        const currentSafe = data.safeAgreement ? (typeof data.safeAgreement === 'string' ? JSON.parse(data.safeAgreement) : data.safeAgreement) : safeData;
        const newData = { ...currentSafe, [field]: value };
        updateProject({
            id: data.id as any,
            updates: { safeAgreement: JSON.stringify(newData) }
        });
        onUpdateProject(p => ({ ...p, safeAgreement: newData }));
    };

    const handleUpdateTotalShares = (val: number) => {
        setTotalPreMoneyShares(val);
        updateProject({ id: data.id as any, updates: { totalShares: val } });
        onUpdateProject(p => ({ ...p, totalShares: val }));
    };

    // --- TEMPLATE LOGIC ---
    const SIM_TEMPLATES = [
        { label: 'Custom', value: 'custom' },
        {
            label: 'YC Standard ($500K @ $5M Cap)',
            value: 'yc_standard',
            data: {
                safe: { valuationCap: 5000000, amountRaising: 500000, discountRate: 0, postMoney: true, investorName: 'Y Combinator', repName: 'Founder Rep', stateOfIncorporation: 'Delaware' },
                totalShares: 10000000,
                vesting: { recipient: 'Lead Developer', shares: 2000000, period: 48, cliff: 12 },
                scenarios: [
                    { id: '1', name: 'Seed Extension', amountRaising: 500000, valuationCap: 7000000 },
                    { id: '2', name: 'Series A Target', amountRaising: 2000000, valuationCap: 15000000 }
                ],
                exitValuation: 25000000
            }
        },
        {
            label: 'Seed Round ($1M @ $10M Cap)',
            value: 'seed_round',
            data: {
                safe: { valuationCap: 10000000, amountRaising: 1000000, discountRate: 20, postMoney: true, investorName: 'Venture Syndicate', repName: 'CEO', stateOfIncorporation: 'Delaware' },
                totalShares: 8000000,
                vesting: { recipient: 'Founding Team Member', shares: 1500000, period: 48, cliff: 12 },
                scenarios: [
                    { id: '1', name: 'Upside Exit', amountRaising: 1000000, valuationCap: 15000000 },
                    { id: '2', name: 'Market Standard', amountRaising: 1000000, valuationCap: 10000000 }
                ],
                exitValuation: 50000000
            }
        },
        {
            label: 'Friends & Family ($100K @ $2M)',
            value: 'friends_family',
            data: {
                safe: { valuationCap: 2000000, amountRaising: 100000, discountRate: 20, postMoney: false, investorName: 'Family Holding', repName: 'Founder', stateOfIncorporation: 'California' },
                totalShares: 10000000,
                vesting: { recipient: 'Family Member', shares: 500000, period: 24, cliff: 6 },
                scenarios: [
                    { id: '1', name: 'Early Exit', amountRaising: 100000, valuationCap: 2000000 }
                ],
                exitValuation: 5000000
            }
        },
    ];

    const applyTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
        const template = SIM_TEMPLATES.find(t => t.value === templateId);

        if (template && template.data) {
            const { safe, totalShares: tShares, vesting, scenarios: tScenarios, exitValuation: tExit } = template.data;

            setTotalPreMoneyShares(tShares);
            setVestingRecipientName(vesting.recipient);
            setVestingShares(vesting.shares);
            setVestingPeriod(vesting.period);
            setCliffPeriod(vesting.cliff);
            setScenarios(tScenarios);
            setExitValuation(tExit);

            updateProject({
                id: data.id as any,
                updates: {
                    safeAgreement: JSON.stringify(safe),
                    totalShares: tShares,
                    capTableScenarios: JSON.stringify(tScenarios),
                    vestingSettings: JSON.stringify({ cliffMonth: vesting.cliff, vestingMonths: vesting.period })
                }
            });

            onUpdateProject(p => ({
                ...p,
                safeAgreement: JSON.stringify(safe),
                totalShares: tShares,
                capTableScenarios: JSON.stringify(tScenarios),
                vestingSettings: JSON.stringify({ cliffMonth: vesting.cliff, vestingMonths: vesting.period })
            }));
        }
    };

    const handleExplainTerms = async () => {
        setIsExplaining(true);
        if (isLeftCollapsed) setIsLeftCollapsed(false);

        let currentScenario: any = {
            type: activeSubTab === 'vesting' ? 'vesting' :
                activeSubTab === 'simulation' ? 'simulation' :
                    activeSubTab === 'captable' ? 'captable' : 'terms',
            valuationCap: safeData.valuationCap,
            discountRate: safeData.discountRate,
            amountRaising: safeData.amountRaising,
            postMoney: safeData.postMoney,
            exitValuation: exitValuation,
        };

        if (activeSubTab === 'vesting') {
            currentScenario.vestingDetails = {
                recipient: vestingRecipientName,
                shares: vestingShares,
                period: vestingPeriod,
                cliff: cliffPeriod
            };
        } else if (activeSubTab === 'captable') {
            currentScenario.capTable = calculateCapTable();
        } else if (activeSubTab === 'simulation') {
            currentScenario.scenarios = scenarios;
        }

        try {
            const explanation = await explainScenario({
                scenario: currentScenario,
                style: "Professional",
                modelName: settings.modelName,
                useOllama: (settings as any).useOllama
            });
            setAiExplanation(explanation);
        } catch (e) {
            setAiExplanation("Failed to generate explanation. Please try again.");
        } finally {
            setIsExplaining(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
    };

    // --- TEAM MANAGEMENT ---
    const handleAddTeamMember = async () => {
        if (!newMemberName) return;

        // Save to Backend
        const id = await addTeamMember({
            projectId: data.id,
            name: newMemberName,
            email: '',
            role: newMemberRole
        });

        const newMember: TeamMember = {
            id: id as string, // Use ID from backend
            name: newMemberName,
            email: '',
            role: newMemberRole,
            equity: 0
        };

        onUpdateProject(p => ({
            ...p,
            teamMembers: [...p.teamMembers, newMember]
        }));
        setNewMemberName('');
        setShowAddMember(false);
    };

    const handleDeleteMember = async (id: string) => {
        if (confirm("Remove this person from the team?")) {
            // Save to Backend
            await deleteTeamMember({ id: id as any });

            onUpdateProject(p => ({
                ...p,
                teamMembers: p.teamMembers.filter(m => m.id !== id),
                // Also clean up contributions
                equityContributions: p.equityContributions.filter(c => c.memberId !== id)
            }));

            // Also update contributions in backend to remove orphaned ones
            const newContributions = data.equityContributions.filter(c => c.memberId !== id);
            updateProject({
                id: data.id as any,
                updates: { equityContributions: JSON.stringify(newContributions) }
            });
        }
    };

    // --- SCENARIO PLANNER ---
    const handleAddScenario = () => {
        const newScenario: CapTableScenario = {
            id: Date.now().toString(),
            name: `Scenario ${scenarios.length + 1} `,
            amountRaising: 100000,
            valuationCap: 5000000
        };
        const newScenarios = [...scenarios, newScenario];
        setScenarios(newScenarios);
        updateProject({
            id: data.id as any,
            updates: { capTableScenarios: JSON.stringify(newScenarios) }
        });
        onUpdateProject(p => ({ ...p, capTableScenarios: JSON.stringify(newScenarios) }));
    };

    const updateScenario = (id: string, updates: Partial<CapTableScenario>) => {
        const newScenarios = scenarios.map(s => s.id === id ? { ...s, ...updates } : s);
        setScenarios(newScenarios);
        updateProject({
            id: data.id as any,
            updates: { capTableScenarios: JSON.stringify(newScenarios) }
        });
        onUpdateProject(p => ({ ...p, capTableScenarios: JSON.stringify(newScenarios) }));
    };

    const deleteScenario = (id: string) => {
        const newScenarios = scenarios.filter(s => s.id !== id);
        setScenarios(newScenarios);
        updateProject({
            id: data.id as any,
            updates: { capTableScenarios: JSON.stringify(newScenarios) }
        });
        onUpdateProject(p => ({ ...p, capTableScenarios: JSON.stringify(newScenarios) }));
    };

    // --- SCENARIO ANALYSIS HELPERS ---
    const getScenarioResults = (scenario: CapTableScenario) => {
        const pricePerShare = scenario.valuationCap / totalPreMoneyShares;
        const investorShares = scenario.amountRaising / pricePerShare;
        const totalPostMoneyShares = totalPreMoneyShares + investorShares;

        const founderPct = (FOUNDER_SHARES / totalPostMoneyShares) * 100;
        const investorPct = (investorShares / totalPostMoneyShares) * 100;

        // Dilution is the percentage of the company sold (or the reduction in founder ownership relative to 100%, but typically just new shares / total shares)
        const dilutionPct = (investorShares / totalPostMoneyShares) * 100;

        const founderPayout = (founderPct / 100) * exitValuation;
        const investorPayout = (investorPct / 100) * exitValuation;

        return {
            ...scenario,
            exitValuation,
            investorOwnership: investorPct,
            founderOwnership: founderPct,
            investorPayout,
            founderPayout,
            dilution: dilutionPct
        };
    };

    const capTable = calculateCapTable();

    const renderCapTable = () => {
        if (!capTable) {
            return (
                <div className="text-center py-20 text-stone-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Please configure Valuation Cap and Raise Amount to view Cap Table.</p>
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-10 text-center">
                    <h1 className="font-serif text-4xl text-stone-900 mb-4">Post-Money Cap Table</h1>
                    <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                        Projected ownership after this SAFE round converts.
                    </p>
                </div>

                {/* Removed overflow-hidden to allow potential tooltips/dropdowns in future, though standard table here is fine */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-50 border-b border-stone-200 text-xs font-bold uppercase tracking-widest text-stone-500">
                            <tr>
                                <th className="px-6 py-4">Shareholder</th>
                                <th className="px-6 py-4 text-right">Shares</th>
                                <th className="px-6 py-4 text-right">Ownership</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            <tr className="hover:bg-stone-50">
                                <td className="px-6 py-4 font-bold text-stone-900">Founders</td>
                                <td className="px-6 py-4 text-right font-mono text-stone-600">{formatNumber(FOUNDER_SHARES)}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">{capTable.founderPct.toFixed(2)}%</td>
                            </tr>
                            <tr className="hover:bg-stone-50">
                                <td className="px-6 py-4 font-bold text-stone-900">Option Pool (Reserved)</td>
                                <td className="px-6 py-4 text-right font-mono text-stone-600">{formatNumber(OPTION_POOL_SHARES)}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">{capTable.poolPct.toFixed(2)}%</td>
                            </tr>
                            <tr className="bg-amber-50 hover:bg-amber-100">
                                <td className="px-6 py-4 font-bold text-amber-900 flex items-center gap-2">
                                    SAFE Investors
                                    <span className="text-[10px] bg-amber-200 px-2 rounded-full text-amber-800">New</span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-amber-800">{formatNumber(capTable.investorShares)}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-amber-900">{capTable.investorPct.toFixed(2)}%</td>
                            </tr>
                            <tr className="bg-stone-900 text-white">
                                <td className="px-6 py-4 font-bold uppercase tracking-wider">Total</td>
                                <td className="px-6 py-4 text-right font-mono text-stone-300">{formatNumber(capTable.totalPostMoneyShares)}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">100.00%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Effective Price / Share</div>
                        <div className="text-2xl font-serif font-bold text-stone-900">${capTable.pricePerShare.toFixed(4)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Dilution Impact</div>
                        <div className="text-2xl font-serif font-bold text-red-500">{(100 - capTable.founderPct - capTable.poolPct).toFixed(2)}%</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Post-Money Val</div>
                        <div className="text-2xl font-serif font-bold text-emerald-600">{formatCurrency(safeData.valuationCap)}</div>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-8 flex items-start gap-3 rounded-r-lg shadow-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Disclaimer: Not Legal Advice</h3>
                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                            This tool is for educational purposes only. Always consult an attorney before making financial or legal decisions.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // --- EQUITY SLICING PIE LOGIC ---
    const calculateSlicingPie = () => {
        const contributions = data.equityContributions || [];
        const memberTotals: Record<string, number> = {};
        let totalValue = 0;

        contributions.forEach(c => {
            const adjustedValue = c.value * c.multiplier;
            memberTotals[c.memberId] = (memberTotals[c.memberId] || 0) + adjustedValue;
            totalValue += adjustedValue;
        });

        return { memberTotals, totalValue };
    };

    const handleAddContribution = (memberId: string) => {
        // Default: 1 hour of time at $50/hr * 2x multiplier
        const newContrib: EquityContribution = {
            id: Date.now().toString(),
            memberId,
            type: 'Time',
            description: 'Work Contribution',
            value: 50,
            multiplier: 2,
            date: Date.now()
        };

        const newContributions = [...(data.equityContributions || []), newContrib];

        // Save to Backend
        updateProject({
            id: data.id as any,
            updates: { equityContributions: JSON.stringify(newContributions) }
        });

        onUpdateProject(p => ({
            ...p,
            equityContributions: newContributions
        }));
    };

    const deleteContribution = (id: string) => {
        const newContributions = data.equityContributions.filter(c => c.id !== id);

        // Save to Backend
        updateProject({
            id: data.id as any,
            updates: { equityContributions: JSON.stringify(newContributions) }
        });

        onUpdateProject(p => ({
            ...p,
            equityContributions: newContributions
        }));
    };

    const updateContribution = (id: string, updates: Partial<EquityContribution>) => {
        const newContributions = data.equityContributions.map(c => c.id === id ? { ...c, ...updates } : c);

        // Save to Backend
        updateProject({
            id: data.id as any,
            updates: { equityContributions: JSON.stringify(newContributions) }
        });

        onUpdateProject(p => ({
            ...p,
            equityContributions: newContributions
        }));
    };

    const renderEquitySplit = () => {
        const { memberTotals, totalValue } = calculateSlicingPie();

        // Use all team members for the chart
        const pieData = data.teamMembers.map(f => {
            const val = memberTotals[f.id] || 0;
            const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
            return { ...f, val, pct };
        }).sort((a, b) => b.pct - a.pct);

        let accumulatedPercent = 0;
        const getCoordinatesForPercent = (percent: number) => {
            const x = Math.cos(2 * Math.PI * percent);
            const y = Math.sin(2 * Math.PI * percent);
            return [x, y];
        };

        return (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-10 text-center">
                    <h1 className="font-serif text-4xl text-stone-900 mb-4">Dynamic Equity Split</h1>
                    <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                        Calculate fair equity based on actual contributions (Slicing Pie model).
                        Cash is weighted higher (4x) than Time (2x).
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Charts & Team Management */}
                    <div className="space-y-6">
                        {/* Pie Chart Card */}
                        <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center">
                            <div className="relative w-56 h-56 mb-8">
                                <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
                                    {pieData.map((slice, i) => {
                                        if (slice.pct === 0) return null;
                                        const start = accumulatedPercent;
                                        accumulatedPercent += slice.pct / 100;
                                        const end = accumulatedPercent;

                                        const [startX, startY] = getCoordinatesForPercent(start);
                                        const [endX, endY] = getCoordinatesForPercent(end);

                                        const largeArcFlag = slice.pct > 50 ? 1 : 0;
                                        const pathData = slice.pct >= 99.9
                                            ? `M 1 0 A 1 1 0 1 1 - 1 0 A 1 1 0 1 1 1 0`
                                            : `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

                                        const colors = ['#1c1917', '#C5A059', '#a8a29e', '#f5f5f4', '#78716c'];
                                        return <path key={slice.id} d={pathData} fill={colors[i % colors.length]} stroke="white" strokeWidth="0.02" />;
                                    })}
                                    {totalValue === 0 && <circle cx="0" cy="0" r="1" fill="#f5f5f4" />}
                                </svg>
                            </div>
                            <div className="w-full space-y-3">
                                {pieData.map((f, i) => {
                                    const colors = ['bg-stone-900', 'bg-nobel-gold', 'bg-stone-400', 'bg-stone-100', 'bg-stone-500'];
                                    return (
                                        <div key={f.id} className="flex items-center justify-between p-2 rounded">
                                            <div className="flex items-center gap-2">
                                                <div className={`w - 3 h - 3 rounded - full ${colors[i % colors.length]} `}></div>
                                                <span className="font-bold text-sm text-stone-900">{f.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-bold">{f.pct.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Team Management Card */}
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-serif text-lg text-stone-900">Project Team</h3>
                                <button onClick={() => setShowAddMember(true)} className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-900"><UserPlus className="w-4 h-4" /></button>
                            </div>

                            {showAddMember && (
                                <div className="bg-stone-50 p-3 rounded-lg mb-4 border border-stone-200 animate-in fade-in zoom-in-95">
                                    <input
                                        autoFocus
                                        value={newMemberName}
                                        onChange={e => setNewMemberName(e.target.value)}
                                        placeholder="Name"
                                        className="w-full mb-2 p-1 text-sm border rounded"
                                    />
                                    <div className="flex justify-between items-center">
                                        <CustomSelect
                                            value={newMemberRole}
                                            onChange={setNewMemberRole}
                                            options={[{ label: 'Founder', value: 'Founder' }, { label: 'Employee', value: 'Employee' }, { label: 'Advisor', value: 'Advisor' }, { label: 'Investor', value: 'Investor' }]}
                                            className="w-28 text-xs"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowAddMember(false)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                                            <button onClick={handleAddTeamMember} className="text-xs font-bold bg-stone-900 text-white px-2 py-1 rounded hover:bg-nobel-gold">Add</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {data.teamMembers.map(m => (
                                    <div key={m.id} className="flex justify-between items-center text-sm p-2 hover:bg-stone-50 rounded group">
                                        <div>
                                            <span className="font-bold">{m.name}</span>
                                            <span className="text-[10px] ml-2 text-stone-400 uppercase">{m.role}</span>
                                        </div>
                                        <button onClick={() => handleDeleteMember(m.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Contribution Log */}
                    {/* Removed overflow-hidden from the card container to prevent clipping of dropdowns */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col">
                        <div className="p-6 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                            <h3 className="font-serif text-xl text-stone-900">Contribution Ledger</h3>
                        </div>

                        {/* Quick Add Bar */}
                        <div className="p-4 border-b border-stone-100 flex gap-2 overflow-x-auto">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex items-center mr-2">Quick Add:</span>
                            {data.teamMembers.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => handleAddContribution(m.id)}
                                    className="text-[10px] font-bold bg-white border border-stone-200 hover:border-nobel-gold hover:text-nobel-gold px-3 py-1 rounded-full whitespace-nowrap transition-all"
                                >
                                    + {m.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex-grow p-6 min-h-[400px]">
                            {/* NOTE: We removed overflow-x-auto to allow dropdowns to be visible. 
                                Layout might break on very small screens, but prioritized dropdown usability. */}
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-stone-100">
                                    <tr>
                                        <th className="px-4 py-3">Member</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3 w-24">Value ($)</th>
                                        <th className="px-4 py-3 w-20">Mult.</th>
                                        <th className="px-4 py-3 text-right">Adj. Value</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {(data.equityContributions || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-stone-400 italic">
                                                No contributions logged. Add contributions to calculate equity.
                                            </td>
                                        </tr>
                                    ) : (
                                        (data.equityContributions || []).map(c => {
                                            const member = data.teamMembers.find(m => m.id === c.memberId);
                                            return (
                                                <tr key={c.id} className="hover:bg-stone-50 group">
                                                    <td className="px-4 py-3 font-bold text-stone-900">
                                                        <CustomSelect
                                                            value={c.memberId}
                                                            onChange={(val) => updateContribution(c.id, { memberId: val })}
                                                            options={data.teamMembers.map(m => ({ label: m.name, value: m.id }))}
                                                            className="w-32 text-xs"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <CustomSelect
                                                            value={c.type}
                                                            onChange={(val) => updateContribution(c.id, { type: val })}
                                                            options={['Time', 'Cash', 'IP', 'Equipment', 'Relationships'].map(t => ({ label: t, value: t }))}
                                                            className="w-28 text-xs"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            value={c.description}
                                                            onChange={(e) => updateContribution(c.id, { description: e.target.value })}
                                                            className="bg-transparent outline-none w-full border-b border-transparent focus:border-stone-200"
                                                            placeholder="Details..."
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={c.value}
                                                            onChange={(e) => updateContribution(c.id, { value: parseFloat(e.target.value) })}
                                                            className="bg-transparent outline-none w-full font-mono border-b border-transparent focus:border-stone-200"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={c.multiplier}
                                                            onChange={(e) => updateContribution(c.id, { multiplier: parseFloat(e.target.value) })}
                                                            className="bg-stone-100 rounded px-1 py-1 outline-none w-12 text-center font-bold text-stone-600 focus:bg-white focus:ring-1 focus:ring-nobel-gold"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-stone-900">
                                                        {formatCurrency(c.value * c.multiplier)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => deleteContribution(c.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const renderDocument = () => {
        const companyName = data.name || "____________________";
        const state = safeData.stateOfIncorporation || "__________";
        const purchaseAmount = safeData.amountRaising > 0 ? formatCurrency(safeData.amountRaising) : "____________________";
        const valCap = safeData.valuationCap > 0 ? formatCurrency(safeData.valuationCap) : "____________________";
        const discount = safeData.discountRate > 0 ? `${safeData.discountRate}% ` : "____________________";
        const investor = safeData.investorName || "____________________";
        const date = new Date().toLocaleDateString();

        return (
            <div
                className="max-w-[850px] mx-auto bg-white shadow-xl p-16 md:p-20 min-h-[1100px] text-stone-900 leading-relaxed text-sm print:shadow-none print:w-full print:max-w-none print:p-0"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
                <div className="text-center mb-12">
                    <h1 className="text-2xl font-bold uppercase tracking-widest mb-2">SAFE</h1>
                    <p className="text-xs uppercase tracking-widest text-stone-500">(Simple Agreement for Future Equity)</p>
                </div>

                <div className="space-y-6 mb-12 border-b-2 border-stone-900 pb-8 text-justify">
                    <p>
                        <strong>THIS CERTIFIES THAT</strong> in exchange for the payment by <span className="font-bold">{investor}</span> (the "<strong>Investor</strong>") of <span className="font-bold">{purchaseAmount}</span> (the "<strong>Purchase Amount</strong>") on or about {date}, <span className="font-bold">{companyName}</span>, a <span className="font-bold">{state}</span> corporation (the "<strong>Company</strong>"), hereby issues to the Investor the right to certain shares of the Company's Capital Stock, subject to the terms set forth below.
                    </p>

                    <div className="grid grid-cols-2 gap-8 my-8 bg-stone-50 p-6 border border-stone-100">
                        <div>
                            <p className="text-xs font-bold uppercase text-stone-400 mb-1">Valuation Cap</p>
                            <p className="text-xl font-bold">{valCap}</p>
                            <p className="text-[10px] text-stone-500 italic">See Section 2 for definitions.</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase text-stone-400 mb-1">Discount Rate</p>
                            <p className="text-xl font-bold">{discount}</p>
                            <p className="text-[10px] text-stone-500 italic">See Section 2 for definitions.</p>
                        </div>
                    </div>

                    <p>The "<strong>Post-Money Valuation Cap</strong>" is {valCap}.</p>
                    <p>The "<strong>Discount Rate</strong>" is {discount}.</p>
                </div>

                <div className="space-y-6 text-justify text-xs leading-relaxed">
                    <h3 className="font-bold uppercase text-sm tracking-widest mb-2">1. Events</h3>

                    <div className="pl-4 border-l-2 border-stone-100">
                        <p className="mb-4">
                            (a) <u>Equity Financing</u>. If there is an Equity Financing before the termination of this Safe, on the initial closing of such Equity Financing, this Safe will automatically convert into the number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Conversion Price.
                        </p>
                        <p className="mb-4">
                            (b) <u>Liquidity Event</u>. If there is a Liquidity Event before the termination of this Safe, this Safe will automatically be entitled (subject to the liquidation priority set forth in Section 1(d) below) to receive a portion of Proceeds, due and payable to the Investor immediately prior to, or concurrent with, the consummation of such Liquidity Event, equal to the greater of (i) the Purchase Amount (the "Cash-Out Amount") or (ii) the amount payable on the number of shares of Common Stock equal to the Purchase Amount divided by the Liquidity Price (the "Conversion Amount").
                        </p>
                        <p>
                            (c) <u>Dissolution Event</u>. If there is a Dissolution Event before the termination of this Safe, the Investor will automatically be entitled (subject to the liquidation priority set forth in Section 1(d) below) to receive a portion of Proceeds equal to the Cash-Out Amount, due and payable to the Investor immediately prior to the consummation of the Dissolution Event.
                        </p>
                    </div>

                    <h3 className="font-bold uppercase text-sm tracking-widest mb-2 mt-6">2. Definitions</h3>
                    <div className="pl-4 border-l-2 border-stone-100 grid grid-cols-1 gap-4">
                        <p>
                            "<strong>Company Capitalization</strong>" is calculated as of immediately prior to the Equity Financing and includes all shares of Capital Stock (on an as-converted basis) issued and outstanding, assuming exercise or conversion of all outstanding vested and unvested options, warrants and other convertible securities, but excluding this Safe and other Safes.
                        </p>
                        <p>
                            "<strong>Conversion Price</strong>" means either: (1) the Safe Price or (2) the Discount Price, whichever calculation results in a greater number of shares of Safe Preferred Stock.
                        </p>
                        <p>
                            "<strong>Safe Price</strong>" means the price per share equal to the Post-Money Valuation Cap divided by the Company Capitalization.
                        </p>
                    </div>

                    <div className="mt-12 pt-8 border-t-2 border-stone-900 grid grid-cols-2 gap-12">
                        <div>
                            <p className="font-bold uppercase text-xs mb-8">Company</p>
                            <div className="border-b border-stone-400 h-8 mb-2"></div>
                            <p className="text-xs">By: {safeData.repName || "________________"}</p>
                            <p className="text-xs">Title: CEO</p>
                        </div>
                        <div>
                            <p className="font-bold uppercase text-xs mb-8">Investor</p>
                            <div className="border-b border-stone-400 h-8 mb-2"></div>
                            <p className="text-xs">By: {investor}</p>
                        </div>
                    </div>

                    <div className="mt-16 pt-8 border-t border-stone-200 text-center">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Disclaimer: Not Legal Advice</p>
                        <p className="text-[10px] text-stone-400 italic">
                            This tool generates standard documents based on the YC SAFE template. It is a calculator and drafting aid, not a substitute for professional legal counsel. Always consult an attorney before signing binding agreements.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderScenarioPlanner = () => {
        return (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-12 text-center">
                    <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Analysis</div>
                    <h1 className="font-serif text-5xl text-stone-900 mb-6">Scenario Planner</h1>
                    <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                        Compare different fundraising terms and exit outcomes to see the impact on your equity.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Inputs */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <h3 className="font-serif text-lg text-stone-900 mb-4 flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Configuration
                            </h3>
                            <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-100">
                                <label className="text-[10px] uppercase font-bold text-stone-400 block mb-2">Total Authorized Shares (Pre-Money)</label>
                                <input
                                    type="number"
                                    value={totalPreMoneyShares}
                                    onChange={(e) => handleUpdateTotalShares(parseFloat(e.target.value))}
                                    className="w-full bg-white border border-stone-200 rounded px-3 py-2 text-sm font-mono"
                                />
                                <p className="text-[10px] text-stone-400 mt-2">Example: 10,000,000. Used to calculate price per share.</p>
                            </div>
                            <div className="space-y-4">
                                {scenarios.map((scenario, index) => (
                                    <div key={scenario.id} className="p-4 bg-stone-50 rounded-lg border border-stone-100 relative group">
                                        <button
                                            onClick={() => deleteScenario(scenario.id)}
                                            className="absolute top-2 right-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <div className="mb-3">
                                            <input
                                                value={scenario.name}
                                                onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                                                className="bg-transparent font-bold text-sm w-full outline-none border-b border-transparent focus:border-stone-300"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Raise Amount</label>
                                                <input
                                                    type="number"
                                                    value={scenario.amountRaising}
                                                    onChange={(e) => updateScenario(scenario.id, { amountRaising: parseFloat(e.target.value) })}
                                                    className="w-full bg-white border border-stone-200 rounded px-2 py-1 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Valuation Cap</label>
                                                <input
                                                    type="number"
                                                    value={scenario.valuationCap}
                                                    onChange={(e) => updateScenario(scenario.id, { valuationCap: parseFloat(e.target.value) })}
                                                    className="w-full bg-white border border-stone-200 rounded px-2 py-1 text-xs font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddScenario}
                                    className="w-full py-3 border-2 border-dashed border-stone-200 rounded-lg text-stone-400 text-xs font-bold uppercase tracking-wider hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Scenario
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                            <h3 className="font-serif text-lg text-stone-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Exit Simulation
                            </h3>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                    Projected Exit Valuation
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                                    <input
                                        type="number"
                                        value={exitValuation}
                                        onChange={(e) => setExitValuation(parseFloat(e.target.value))}
                                        className="w-full pl-8 p-3 bg-stone-50 border rounded-lg font-serif text-lg outline-none focus:border-nobel-gold"
                                    />
                                </div>
                                <input
                                    type="range"
                                    min="1000000"
                                    max="100000000"
                                    step="1000000"
                                    value={exitValuation}
                                    onChange={(e) => setExitValuation(parseFloat(e.target.value))}
                                    className="w-full mt-4 accent-stone-900"
                                />
                                <div className="flex justify-between text-[10px] text-stone-400 mt-1 uppercase font-bold">
                                    <span>$1M</span>
                                    <span>$100M+</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Analysis */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                                <h3 className="font-serif text-xl text-stone-900">Waterfall Analysis</h3>
                                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                    Exit at {formatCurrency(exitValuation)}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-stone-100 bg-white">
                                        <tr>
                                            <th className="px-6 py-4">Scenario</th>
                                            <th className="px-6 py-4 text-right">Dilution</th>
                                            <th className="px-6 py-4 text-right">Founder Ownership</th>
                                            <th className="px-6 py-4 text-right">Founder Payout</th>
                                            <th className="px-6 py-4 text-right">Investor Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {scenarios.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">
                                                    Add scenarios to compare outcomes.
                                                </td>
                                            </tr>
                                        ) : (
                                            scenarios.map(scenario => {
                                                const effectivePricePerShare = scenario.valuationCap / totalPreMoneyShares;
                                                const pricePerShare = scenario.valuationCap / totalPreMoneyShares;
                                                const investorShares = scenario.amountRaising / pricePerShare;
                                                const totalPostMoneyShares = totalPreMoneyShares + investorShares;

                                                const founderPct = (FOUNDER_SHARES / totalPostMoneyShares);
                                                const investorPct = (investorShares / totalPostMoneyShares);
                                                const dilution = 1 - (totalPreMoneyShares / totalPostMoneyShares);

                                                const founderPayout = founderPct * exitValuation;
                                                const investorPayout = investorPct * exitValuation;

                                                return (
                                                    <tr key={scenario.id} className="hover:bg-stone-50 transition-colors group">
                                                        <td className="px-6 py-4 font-bold text-stone-900">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    {scenario.name}
                                                                    <div className="text-[10px] font-normal text-stone-400 uppercase mt-1">
                                                                        Raise {formatCurrency(scenario.amountRaising)} @ {formatCurrency(scenario.valuationCap)} Cap
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedScenarioForExplanation(getScenarioResults(scenario));
                                                                        setExplanationModalOpen(true);
                                                                    }}
                                                                    className="text-[10px] font-bold uppercase tracking-wider text-white bg-stone-900 hover:bg-nobel-gold flex items-center gap-1 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all"
                                                                >
                                                                    <Settings className="w-3 h-3" /> Explain
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-red-400">
                                                            -{((1 - (founderPct / (FOUNDER_SHARES / totalPreMoneyShares))) * 100).toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold text-stone-700">
                                                            {(founderPct * 100).toFixed(2)}%
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 text-lg">
                                                            {formatCurrency(founderPayout)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-stone-500">
                                                            {formatCurrency(investorPayout)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-8 flex items-start gap-3 rounded-r-lg shadow-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Disclaimer: Not Legal Advice</h3>
                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                            This tool is for educational purposes only. Always consult an attorney before making financial or legal decisions.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-nobel-cream canvas-pattern text-stone-900 font-sans overflow-hidden" style={{ backgroundSize: '24px 24px' }}>
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 no-print">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} />
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExplainTerms}
                        disabled={isExplaining}
                        className="bg-white text-stone-500 border border-stone-200 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-stone-50 hover:text-nobel-gold transition-all flex items-center gap-2 shadow-sm"
                    >
                        {isExplaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                        {aiExplanation ? 'Refresh Explanation' : 'Explain Terms'}
                    </button>
                </div>
            </header>

            <main className="flex-grow flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)]">
                {/* Left Panel: AI Explanation */}
                <div className={`${isLeftCollapsed ? 'hidden' : 'w-full lg:w-2/5'} bg-white border-r border-stone-200 overflow-y-auto transition-all duration-300 relative`}>
                    <div className="p-12 max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-8 border-b border-stone-100 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-nobel-gold/10 rounded-full text-nobel-gold">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-3xl text-stone-900">Expert Explanation</h2>
                                    <p className="text-xs text-stone-400 uppercase tracking-widest mt-1">AI-Powered Analysis</p>
                                </div>
                            </div>
                        </div>

                        {isExplaining ? (
                            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-nobel-gold" />
                                <p className="text-sm font-light">Analyzing your terms and generating a cheat sheet...</p>
                            </div>
                        ) : aiExplanation ? (
                            <MarkdownRenderer content={aiExplanation} />
                        ) : (
                            <div className="text-center py-20 text-stone-400">
                                <div className="mb-4 flex justify-center"><BookOpen className="w-12 h-12 opacity-20" /></div>
                                <p className="font-serif text-xl italic mb-2">No explanation generated.</p>
                                <p className="text-sm">Click "Explain Terms" to get an AI breakdown of your SAFE configuration.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Content */}
                <div className={`${isLeftCollapsed ? 'w-full' : 'w-full lg:w-3/5'} flex flex-col relative transition-all duration-300 overflow-visible`}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                        className={`absolute top-1/2 -translate-y-1/2 ${isLeftCollapsed ? 'left-4' : '-left-5'} p-2.5 ${isLeftCollapsed ? 'bg-emerald-500' : 'bg-nobel-gold'} text-white rounded-full hover:brightness-110 transition-all z-50 shadow-lg group`}
                        title={isLeftCollapsed ? "Show Explanation" : "Full Screen"}
                    >
                        {isLeftCollapsed ? <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" /> : <Maximize2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />}
                    </button>

                    <div className="overflow-y-auto h-full p-8 md:p-12">
                        <div className="flex justify-center mb-8">
                            <div className="flex bg-white border border-stone-200 rounded-full p-1 shadow-sm overflow-x-auto max-w-full">
                                <button
                                    onClick={() => setActiveSubTab('configure')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'configure' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <Settings className="w-3 h-3" /> <span className="hidden md:inline">Configure</span>
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('captable')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'captable' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <TableIcon className="w-3 h-3" /> <span className="hidden md:inline">Cap Table</span>
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('document')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'document' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <FileText className="w-3 h-3" /> <span className="hidden md:inline">Doc Preview</span>
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('vesting')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'vesting' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <UserPlus className="w-3 h-3" /> <span className="hidden md:inline">Vesting</span>
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('proforma')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'proforma' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <Calculator className="w-3 h-3" /> <span className="hidden md:inline">Pro-Forma</span>
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('simulation')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'simulation' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <BarChart3 className="w-3 h-3" /> <span className="hidden md:inline">Simulation</span>
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('guide')}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all flex-shrink-0 ${activeSubTab === 'guide' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                                >
                                    <BookOpen className="w-3 h-3" /> <span className="hidden md:inline">Learning Guide</span>
                                </button>
                            </div>
                        </div>

                        {activeSubTab === 'proforma' ? (
                            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-12 text-center">
                                    <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Projections</div>
                                    <h1 className="font-serif text-5xl text-stone-900 mb-6">Pro-Forma Cap Table</h1>
                                    <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                                        Projected ownership structure after the SAFE investment converts.
                                    </p>
                                </div>

                                <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm relative mb-8">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-nobel-gold rounded-t-xl"></div>
                                    <h2 className="font-serif text-xl mb-6 flex items-center gap-2">
                                        <PieChart className="w-5 h-5 text-nobel-gold" /> Post-Money Ownership
                                    </h2>

                                    {safeData.valuationCap > 0 && safeData.amountRaising > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-stone-200">
                                                        <th className="py-3 px-4 font-bold uppercase text-xs text-stone-500 tracking-wider">Stakeholder</th>
                                                        <th className="py-3 px-4 font-bold uppercase text-xs text-stone-500 tracking-wider text-right">Valuation / Investment</th>
                                                        <th className="py-3 px-4 font-bold uppercase text-xs text-stone-500 tracking-wider text-right">Ownership</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    <tr>
                                                        <td className="py-4 px-4 font-serif font-medium">Founders & Existing</td>
                                                        <td className="py-4 px-4 text-right font-mono text-stone-600">{formatCurrency(safeData.valuationCap)}</td>
                                                        <td className="py-4 px-4 text-right font-mono font-bold">
                                                            {((safeData.valuationCap / (safeData.valuationCap + safeData.amountRaising)) * 100).toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-4 px-4 font-serif font-medium">SAFE Investors</td>
                                                        <td className="py-4 px-4 text-right font-mono text-stone-600">{formatCurrency(safeData.amountRaising)}</td>
                                                        <td className="py-4 px-4 text-right font-mono font-bold text-nobel-gold">
                                                            {((safeData.amountRaising / (safeData.valuationCap + safeData.amountRaising)) * 100).toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-stone-50 font-bold">
                                                        <td className="py-4 px-4 font-serif">Total (Post-Money)</td>
                                                        <td className="py-4 px-4 text-right font-mono">{formatCurrency(safeData.valuationCap + safeData.amountRaising)}</td>
                                                        <td className="py-4 px-4 text-right font-mono">100.00%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-stone-400">
                                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p>Please configure Valuation Cap and Target Raise in the "Configure" tab to see projections.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Disclaimer */}
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-8 flex items-start gap-3 rounded-r-lg shadow-sm">
                                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Disclaimer: Not Legal Advice</h3>
                                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                                            This tool is for educational purposes only. Always consult an attorney before making financial or legal decisions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : activeSubTab === 'configure' ? (
                            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-12 text-center">
                                    <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Fundraising Simulator</div>
                                    <h1 className="font-serif text-5xl text-stone-900 mb-6">Simulation Terms</h1>
                                    <div className="flex flex-col items-center gap-4">
                                        <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                                            Configure and simulate your fundraising investment. Run scenarios to see dilution impact.
                                        </p>
                                        <div className="w-full max-w-xs">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 text-left">Quick Template</label>
                                            <CustomSelect
                                                value={selectedTemplate}
                                                onChange={applyTemplate}
                                                options={SIM_TEMPLATES}
                                                placeholder="Select a simulation template..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

                                    {/* Investment Terms */}
                                    <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-nobel-gold rounded-t-xl"></div>
                                        <h2 className="font-serif text-xl mb-6 flex items-center gap-2">
                                            <Scale className="w-5 h-5 text-nobel-gold" /> Economics
                                        </h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                    Valuation Cap <Tooltip text="The maximum valuation at which the investment converts to equity. Protects the investor from dilution in a high-value future round." />
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                                                    <input type="number" value={safeData.valuationCap || ''} onChange={(e) => updateSafeData('valuationCap', parseFloat(e.target.value))} className="w-full pl-8 p-3 bg-stone-50 border rounded-lg font-serif text-lg outline-none focus:border-nobel-gold" placeholder="e.g. 5000000" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                    Discount Rate (%) <Tooltip text="A percentage discount on the share price of the next equity round. Typically 20%." />
                                                </label>
                                                <div className="relative">
                                                    <input type="number" value={safeData.discountRate || ''} onChange={(e) => updateSafeData('discountRate', parseFloat(e.target.value))} className="w-full p-3 bg-stone-50 border rounded-lg font-serif text-lg outline-none focus:border-nobel-gold" placeholder="e.g. 20" />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                    Target Raise <Tooltip text="The total amount of money you are aiming to raise in this round." />
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                                                    <input type="number" value={safeData.amountRaising || ''} onChange={(e) => updateSafeData('amountRaising', parseFloat(e.target.value))} className="w-full pl-8 p-3 bg-stone-50 border rounded-lg font-serif text-lg outline-none focus:border-nobel-gold" placeholder="e.g. 100000" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                    Type <Tooltip text="Post-Money is the modern standard, fixing the investor's ownership percentage immediately." />
                                                </label>
                                                <CustomSelect value={safeData.postMoney ? 'Post' : 'Pre'} onChange={(val) => updateSafeData('postMoney', val === 'Post')} options={[{ label: 'Post-Money Valuation Cap', value: 'Post' }, { label: 'Pre-Money Valuation Cap', value: 'Pre' }]} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Company & Investor Info */}
                                    <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-stone-900 rounded-t-xl"></div>
                                        <h2 className="font-serif text-xl mb-6 flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-stone-900" /> Entities
                                        </h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">State of Incorporation</label>
                                                <input type="text" value={safeData.stateOfIncorporation} onChange={(e) => updateSafeData('stateOfIncorporation', e.target.value)} className="w-full p-3 bg-stone-50 border rounded-lg text-sm" placeholder="e.g. Delaware" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Company Representative</label>
                                                <input type="text" value={safeData.repName} onChange={(e) => updateSafeData('repName', e.target.value)} className="w-full p-3 bg-stone-50 border rounded-lg text-sm" placeholder="Full Name (CEO)" />
                                            </div>
                                            <div className="pt-4 border-t border-stone-100">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Investor Name</label>
                                                <input type="text" value={safeData.investorName} onChange={(e) => updateSafeData('investorName', e.target.value)} className="w-full p-3 bg-stone-50 border rounded-lg text-sm" placeholder="Fund or Angel Name" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Legal Disclaimer Moved Here */}
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-8 flex items-start gap-3 rounded-r-lg shadow-sm">
                                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Disclaimer: Not Legal Advice</h3>
                                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                                            This tool generates standard documents based on the YC SAFE template. It is a calculator and drafting aid, not a substitute for professional legal counsel. Always consult an attorney before signing binding agreements.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : activeSubTab === 'captable' ? (
                            renderCapTable()
                        ) : activeSubTab === 'simulation' ? (
                            renderScenarioPlanner()
                        ) : activeSubTab === 'guide' ? (
                            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-12 text-center">
                                    <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Education</div>
                                    <h1 className="font-serif text-5xl text-stone-900 mb-6">Fundraising Guide</h1>
                                    <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                                        Master concepts behind SAFE agreements and startup equity.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
                                        <h2 className="font-serif text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-stone-900" /> What is a SAFE?
                                        </h2>
                                        <p className="text-stone-600 leading-relaxed mb-4 text-sm">
                                            A <strong>Simple Agreement for Future Equity (SAFE)</strong> is an investment contract used by early-stage startups to raise capital.
                                            Unlike a loan (debt) or standard stock (equity), a SAFE gives investors the right to buy shares in a future "priced" round (like Series A), usually at a discount or valuation cap.
                                        </p>
                                        <div className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Why use it?</h4>
                                            <ul className="text-sm text-stone-700 space-y-2 list-disc pl-4">
                                                <li><strong>Speed:</strong> Can be closed in days, not weeks.</li>
                                                <li><strong>Simplicity:</strong> Minimal legal costs compared to a detailed equity round.</li>
                                                <li><strong>Flexibility:</strong> No need to set a strict valuation immediately (useful when pre-revenue).</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
                                        <h2 className="font-serif text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
                                            <Scale className="w-5 h-5 text-stone-900" /> Key Terms
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-sm font-bold text-stone-900">Valuation Cap</h3>
                                                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                                    The maximum "effective" valuation an investor pays. Even if your startup explodes to a $100M valuation in the next round, Early Investor's shares convert as if the company was worth the Cap (e.g., $5M). This rewards them for early risk.
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-stone-900">Discount Rate</h3>
                                                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                                    A percentage off the next round's share price. If the Discount is 20%, the investor buys shares at 80% of the price VCs pay.
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-stone-900">Pro-Rata Rights</h3>
                                                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                                    The right (but not obligation) for an investor to participate in future rounds to maintain their percentage ownership, preventing dilution.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 bg-stone-900 text-white p-8 rounded-xl shadow-lg relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                                                <PieChart className="w-5 h-5 text-nobel-gold" /> Pre-Money vs. Post-Money
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <h3 className="text-sm font-bold text-nobel-gold uppercase tracking-wider mb-2">Pre-Money (Old School)</h3>
                                                    <p className="text-sm text-stone-300 leading-relaxed mb-4">
                                                        Ownership is calculated <strong>excluding</strong> the new money. As you raise more SAFEs, existing SAFE holders dilute each other in ways that are hard to predict until the priced round.
                                                    </p>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-nobel-gold uppercase tracking-wider mb-2">Post-Money (Standard)</h3>
                                                    <p className="text-sm text-stone-300 leading-relaxed mb-4">
                                                        Ownership is calculated <strong>after</strong> the new money is counted. This "locks in" the investor's percentage immediately (e.g., $1M on $10M Post = exactly 10%), making cap tables much cleaner. YC switched to this standard in 2018.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-nobel-gold/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                    </div>
                                </div>

                                {/* Disclaimer */}
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-8 flex items-start gap-3 rounded-r-lg shadow-sm">
                                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Disclaimer: Not Legal Advice</h3>
                                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                                            This tool is for educational purposes only. Always consult an attorney before making legal decisions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : activeSubTab === 'vesting' ? (
                            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-12 text-center">
                                    <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Equity</div>
                                    <h1 className="font-serif text-5xl text-stone-900 mb-6">Vesting Configuration</h1>
                                    <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                                        Standard vesting terms to protect the company and incentivize long-term commitment.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Configuration */}
                                    <div className="lg:col-span-1 space-y-6">
                                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm relative">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-nobel-gold rounded-t-xl"></div>
                                            <h2 className="font-serif text-xl mb-6 flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-nobel-gold" /> Terms
                                            </h2>
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                        Recipient Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={vestingRecipientName}
                                                        onChange={(e) => {
                                                            const name = e.target.value;
                                                            setVestingRecipientName(name);
                                                        }}
                                                        className="w-full p-3 bg-stone-50 border rounded-lg text-sm"
                                                        placeholder="e.g. Founding Engineer"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Vested Shares</label>
                                                    <input
                                                        type="number"
                                                        value={vestingShares}
                                                        onChange={(e) => setVestingShares(parseFloat(e.target.value))}
                                                        className="w-full p-3 bg-stone-50 border rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                            Vesting Period (Months) <Tooltip text="Standard is 48 months (4 years)." />
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={vestingPeriod}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    setVestingPeriod(val);
                                                                    updateProject({
                                                                        id: data.id as any,
                                                                        updates: { vestingSettings: JSON.stringify({ cliffMonth: cliffPeriod, vestingMonths: val }) }
                                                                    });
                                                                }}
                                                                className="w-full p-3 bg-stone-50 border rounded-lg text-sm"
                                                                placeholder="48"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">Mo</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                            Cliff <Tooltip text="Period before any shares vest." />
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={cliffPeriod}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    setCliffPeriod(val);
                                                                    updateProject({
                                                                        id: data.id as any,
                                                                        updates: { vestingSettings: JSON.stringify({ cliffMonth: val, vestingMonths: vestingPeriod }) }
                                                                    });
                                                                }}
                                                                className="w-full p-3 bg-stone-50 border rounded-lg font-mono text-lg outline-none focus:border-nobel-gold"
                                                                placeholder="12"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">Mo</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                                                        Acceleration <Tooltip text="Single Trigger: Vests on sale. Double Trigger: Vests on sale AND termination." />
                                                    </label>
                                                    <CustomSelect
                                                        value={acceleration}
                                                        onChange={setAcceleration}
                                                        options={[
                                                            { label: 'None', value: 'none' },
                                                            { label: 'Single Trigger', value: 'single' },
                                                            { label: 'Double Trigger (Recommended)', value: 'double' },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Document Preview */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-white shadow-xl min-h-[700px] p-12 relative" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                            <div className="absolute top-0 right-0 p-3 bg-stone-50 border-b border-l border-stone-100 text-[10px] text-stone-400 font-mono uppercase tracking-widest">
                                                Preview
                                            </div>

                                            <div className="text-center mb-10">
                                                <h1 className="text-xl font-bold uppercase tracking-widest mb-2">Founder Stock Restriction Agreement</h1>
                                                <p className="text-xs uppercase tracking-widest text-stone-500">(Vesting)</p>
                                            </div>

                                            <div className="space-y-6 text-sm leading-relaxed text-justify">
                                                <p>
                                                    <strong>THIS AGREEMENT</strong> is made as of {new Date().toLocaleDateString()}, by and between <strong>{data.name || 'The Company'}</strong>, a Delaware corporation (the "Company"), and <strong>{vestingRecipientName}</strong> ("Purchaser").
                                                </p>

                                                <h3 className="font-bold uppercase text-xs mt-8 mb-3">1. Vesting Provisions</h3>
                                                <p>The Shares issued to the Purchaser shall be subject to vesting as follows:</p>
                                                <ul className="list-disc pl-5 space-y-2 mt-3">
                                                    <li><strong>Total Shares:</strong> {vestingShares.toLocaleString()}</li>
                                                    <li><strong>Total Vesting Period:</strong> {vestingPeriod} months</li>
                                                    <li><strong>Cliff Period:</strong> {cliffPeriod} months</li>
                                                </ul>
                                                <p className="mt-3">
                                                    Subject to continuous service, {((cliffPeriod / vestingPeriod) * 100).toFixed(1)}% of the Shares ({Math.floor(vestingShares * (cliffPeriod / vestingPeriod)).toLocaleString()} shares) shall vest on the Cliff Date. Thereafter, the remaining shares shall vest in equal monthly installments over the following {vestingPeriod - cliffPeriod} months.
                                                </p>

                                                <h3 className="font-bold uppercase text-xs mt-8 mb-3">2. Acceleration</h3>
                                                <p>
                                                    {acceleration === 'single'
                                                        ? "In the event of a Change of Control, 100% of the unvested Shares shall immediately vest."
                                                        : acceleration === 'double'
                                                            ? "In the event of a Change of Control followed by Involuntary Termination within 12 months, 100% of the unvested Shares shall immediately vest."
                                                            : "No acceleration provisions apply to this Agreement."}
                                                </p>

                                                <h3 className="font-bold uppercase text-xs mt-8 mb-3">3. Repurchase Right</h3>
                                                <p>
                                                    Upon termination of service for any reason, the Company shall have the right to repurchase any Unvested Shares at $0.0001 per share.
                                                </p>

                                                <div className="mt-12 pt-8 border-t-2 border-stone-900 grid grid-cols-2 gap-12">
                                                    <div>
                                                        <p className="font-bold uppercase text-xs mb-8">The Company</p>
                                                        <div className="border-b border-stone-400 h-8 mb-2"></div>
                                                        <p className="text-xs">By: {safeData.repName || '________________'}</p>
                                                        <p className="text-xs">Title: President</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold uppercase text-xs mb-8">The Purchaser</p>
                                                        <div className="border-b border-stone-400 h-8 mb-2"></div>
                                                        <p className="text-xs">Name: {vestingRecipientName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Disclaimer */}
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-8 flex items-start gap-3 rounded-r-lg shadow-sm">
                                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Disclaimer: Not Legal Advice</h3>
                                        <p className="text-xs text-amber-700 leading-relaxed mt-1">
                                            This tool is for educational purposes only. Always consult an attorney before making legal decisions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* DOCUMENT VIEW */
                            /* DOCUMENT VIEW */
                            <div className="flex flex-col items-center">
                                <style>{`
@media print {
    body * {
        visibility: hidden;
    }
    #safe - document - container, #safe - document - container * {
        visibility: visible;
    }
    #safe - document - container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100 %;
        margin: 0;
        padding: 20mm; /* Add some padding for print */
        background: white;
    }
                                .no - print {
        display: none!important;
    }
    /* Hide header/sidebar if they are not body children but fixed */
    header, nav, aside {
        display: none!important;
    }
}
`}</style>
                                <div className="mb-6 flex gap-4 no-print sticky top-20 z-20">
                                    <button onClick={() => window.print()} className="bg-stone-900 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-nobel-gold transition-colors">
                                        <Printer className="w-4 h-4" /> Print / PDF
                                    </button>
                                </div>
                                <div id="safe-document-container" className="w-full">
                                    {renderDocument()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ScenarioExplanationModal
                isOpen={explanationModalOpen}
                onClose={() => setExplanationModalOpen(false)}
                scenario={selectedScenarioForExplanation}
            />
        </div>
    );
};

export default SafeGenerator;
