import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, Receipt, TrendingUp, Calculator } from 'lucide-react';
import { StartupData, CostItem, ViewState, RolePermissions } from '../types';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import DotPatternBackground from './DotPatternBackground';
import { Logo } from './Logo';
import TabNavigation from './TabNavigation';
import CustomSelect from './CustomSelect';

interface ExpensesPageProps {
    data: StartupData;
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
    data,
    onUpdateProject,
    currentView,
    onNavigate,
    allowedPages,
    // permissions - unused
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Summary Metric Calculations
    const totalExpenses = data.expenseLibrary?.length || 0;
    const monthlyRunRate = (data.expenseLibrary || []).reduce((acc, curr) => {
        if (curr.frequency === 'Monthly') return acc + curr.amount;
        if (curr.frequency === 'Yearly') return acc + (curr.amount / 12);
        return acc;
    }, 0);
    const yearlyRunRate = (data.expenseLibrary || []).reduce((acc, curr) => {
        if (curr.frequency === 'Yearly') return acc + curr.amount;
        if (curr.frequency === 'Monthly') return acc + (curr.amount * 12);
        return acc;
    }, 0);

    // New Item State
    const [newItem, setNewItem] = useState<Partial<CostItem>>({
        name: '',
        amount: 0,
        frequency: 'Monthly',
        category: 'General'
    });

    const [editValues, setEditValues] = useState<Partial<CostItem>>({});

    const expenses = data.expenseLibrary || [];

    const updateProject = useMutation(api.projects.update);

    const getCategoryColor = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('marketing') || cat.includes('ads')) return { bg: 'bg-pink-500', badge: 'bg-pink-50 text-pink-700 border-pink-200' };
        if (cat.includes('server') || cat.includes('infra') || cat.includes('software')) return { bg: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
        if (cat.includes('legal') || cat.includes('accounting') || cat.includes('admin')) return { bg: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
        if (cat.includes('salary') || cat.includes('payroll') || cat.includes('team')) return { bg: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        return { bg: 'bg-stone-500', badge: 'bg-stone-50 text-stone-700 border-stone-200' };
    };

    const filteredExpenses = expenses.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddWrapper = () => {
        if (!newItem.name || !newItem.amount) {
            toast.error("Please enter a name and amount");
            return;
        }

        const item: CostItem = {
            id: Date.now().toString(),
            name: newItem.name,
            amount: Number(newItem.amount),
            frequency: newItem.frequency as 'Monthly' | 'One-time' | 'Yearly' || 'Monthly',
            category: newItem.category || 'General',
            growthRate: 0,
            source: 'Human'
        };

        const updatedLibrary = [...(data.expenseLibrary || []), item];

        onUpdateProject(project => ({
            ...project,
            expenseLibrary: updatedLibrary
        }));

        updateProject({
            id: data.id as any,
            updates: { expenseLibrary: updatedLibrary }
        });

        setNewItem({ name: '', amount: 0, frequency: 'Monthly', category: 'General' });
        setIsAdding(false);
        toast.success("Expense added to library");
    };

    const startEditing = (item: CostItem) => {
        setEditingId(item.id);
        setEditValues({
            name: item.name,
            amount: item.amount,
            category: item.category,
            frequency: item.frequency
        });
    };

    const handleUpdate = (id: string) => {
        const updatedLibrary = (data.expenseLibrary || []).map(item =>
            item.id === id ? { ...item, ...editValues } : item
        );

        onUpdateProject(project => ({
            ...project,
            expenseLibrary: updatedLibrary
        }));

        updateProject({
            id: data.id as any,
            updates: { expenseLibrary: updatedLibrary }
        });

        setEditingId(null);
        setEditValues({});
        toast.success("Expense updated");
    };

    const handleDelete = (id: string) => {
        const updatedLibrary = (data.expenseLibrary || []).filter(item => item.id !== id);

        onUpdateProject(project => ({
            ...project,
            expenseLibrary: updatedLibrary
        }));

        updateProject({
            id: data.id as any,
            updates: { expenseLibrary: updatedLibrary }
        });

        toast.success("Expense removed from library");
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* Left Sidebar - Vertical Image with Logo and Title */}
            <div className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img
                    src="/images/CozyRoom.png"
                    alt="Operating Expenses"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                {/* Logo */}
                <div className="absolute top-8 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>

                {/* Title and Description */}
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                    <div className="space-y-3">
                        <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs block">Finance</span>
                        <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                            Operating Expenses
                        </h2>
                        <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Centralize your recurring costs and overheads.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="w-[80%] h-full flex flex-col relative z-10">
                <DotPatternBackground color="#a8a29e" />

                <header className="px-10 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-stone-200 shrink-0 relative z-50">
                    <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} mode="light" />
                </header>

                {/* Main Content */}
                <main className="flex-grow overflow-auto p-8">
                    <div className="max-w-3xl mx-auto space-y-8">

                        {/* Mobile Header (visible only on small screens) */}
                        <div className="lg:hidden mb-8">
                            <h1 className="text-3xl font-serif text-stone-900 mb-2">Operating Expenses</h1>
                            <p className="text-stone-500">Manage your cost library.</p>
                        </div>

                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white/60 backdrop-blur border border-stone-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 text-stone-500 mb-2">
                                    <div className="p-2 bg-stone-100 rounded-lg">
                                        <TrendingUp className="w-4 h-4 text-stone-700" />
                                    </div>
                                    <span className="text-xs uppercase tracking-wider font-bold">Monthly Run Rate</span>
                                </div>
                                <div className="text-3xl font-serif font-medium text-stone-900">
                                    ${monthlyRunRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                            </div>

                            <div className="bg-white/60 backdrop-blur border border-stone-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 text-stone-500 mb-2">
                                    <div className="p-2 bg-stone-100 rounded-lg">
                                        <Calculator className="w-4 h-4 text-stone-700" />
                                    </div>
                                    <span className="text-xs uppercase tracking-wider font-bold">Yearly Burn</span>
                                </div>
                                <div className="text-3xl font-serif font-medium text-stone-900">
                                    ${yearlyRunRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                            </div>

                            <div className="bg-white/60 backdrop-blur border border-stone-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 text-stone-500 mb-2">
                                    <div className="p-2 bg-stone-100 rounded-lg">
                                        <Receipt className="w-4 h-4 text-stone-700" />
                                    </div>
                                    <span className="text-xs uppercase tracking-wider font-bold">Active Expenses</span>
                                </div>
                                <div className="text-3xl font-serif font-medium text-stone-900">
                                    {totalExpenses}
                                </div>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex justify-between items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search expenses..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none bg-white transition-all shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="px-6 py-3 bg-stone-900 text-white rounded-xl flex items-center gap-2 font-medium hover:bg-stone-800 transition-colors shadow-sm active:translate-y-0.5"
                            >
                                <Plus className="w-5 h-5" />
                                Add Expense
                            </button>
                        </div>

                        {/* Add New Form Modal */}
                        {isAdding && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                                        <div>
                                            <h3 className="text-lg font-serif font-bold text-stone-900">Add New Expense</h3>
                                            <p className="text-xs text-stone-500">Create a reusable cost structure item.</p>
                                        </div>
                                        <button onClick={() => setIsAdding(false)} className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        <div className="grid grid-cols-1 gap-5">
                                            <div>
                                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Expense Name</label>
                                                <input
                                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none transition-all placeholder:text-stone-400"
                                                    placeholder="e.g. AWS Server Hosting"
                                                    value={newItem.name}
                                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Amount ($)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            className="w-full pl-8 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none transition-all placeholder:text-stone-400 text-stone-900 font-mono font-medium"
                                                            placeholder="0.00"
                                                            value={newItem.amount || ''}
                                                            onChange={e => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Frequency</label>
                                                    <select
                                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none transition-all text-stone-900 appearance-none"
                                                        value={newItem.frequency || 'Monthly'}
                                                        onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value as any })}
                                                    >
                                                        <option value="Monthly">Monthly</option>
                                                        <option value="Yearly">Yearly</option>
                                                        <option value="One-time">One-time</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">Category</label>
                                                <input
                                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none transition-all placeholder:text-stone-400"
                                                    placeholder="e.g. Infrastructure, Marketing, Legal"
                                                    value={newItem.category}
                                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-stone-50/80 border-t border-stone-100 flex justify-end gap-3 flex-shrink-0">
                                        <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-colors">Cancel</button>
                                        <button onClick={handleAddWrapper} disabled={!newItem.name || !newItem.amount} className="px-5 py-2.5 text-sm font-bold bg-stone-900 text-white rounded-xl hover:bg-nobel-gold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Add Expense</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden z-20 relative">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-stone-50/80 backdrop-blur-sm border-b border-stone-100 text-xs uppercase tracking-wider font-bold text-stone-500 sticky top-0 z-10">
                                        <tr>
                                            <th className="py-4 px-6 font-semibold">Expense Item</th>
                                            <th className="py-4 px-6 font-semibold">Category</th>
                                            <th className="py-4 px-6 font-semibold text-right">Amount</th>
                                            <th className="py-4 px-6 font-semibold">Frequency</th>
                                            <th className="py-4 px-6 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {filteredExpenses.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center text-stone-300">
                                                        <div className="bg-stone-50 p-4 rounded-full mb-4 inline-flex">
                                                            <Receipt className="w-8 h-8 opacity-40 text-stone-500" />
                                                        </div>
                                                        <h4 className="text-stone-900 font-bold mb-1">No expenses in library</h4>
                                                        <p className="text-stone-500 text-sm max-w-sm">Add one manually using the button above or import from Token Pricing to start building your library.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredExpenses.map(item => {
                                                const categoryColor = getCategoryColor(item.category || '');
                                                return (
                                                    <tr key={item.id} className="group hover:bg-stone-50/60 transition-colors">
                                                        <td className="py-4 px-6">
                                                            {editingId === item.id ? (
                                                                <input
                                                                    className="w-full border-stone-300 rounded-md px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                                    value={editValues.name}
                                                                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full ${categoryColor.bg}`} />
                                                                    <span className="font-semibold text-stone-800">{item.name}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            {editingId === item.id ? (
                                                                <input
                                                                    className="w-full border-stone-300 rounded-md px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                                    value={editValues.category}
                                                                    onChange={(e) => setEditValues({ ...editValues, category: e.target.value })}
                                                                />
                                                            ) : (
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${categoryColor.badge}`}>
                                                                    {item.category || 'General'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            {editingId === item.id ? (
                                                                <input
                                                                    type="number"
                                                                    className="w-24 border-stone-300 rounded-md px-2 py-1 text-right text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                                    value={editValues.amount}
                                                                    onChange={(e) => setEditValues({ ...editValues, amount: parseFloat(e.target.value) })}
                                                                />
                                                            ) : (
                                                                <span className="font-mono text-stone-900 bg-stone-100/50 border border-stone-200/50 px-2 py-1 rounded-md text-sm font-semibold">
                                                                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-stone-500 text-sm">
                                                            {editingId === item.id ? (
                                                                <CustomSelect
                                                                    value={editValues.frequency}
                                                                    onChange={(val) => setEditValues({ ...editValues, frequency: val as any })}
                                                                    options={[
                                                                        { label: "Monthly", value: "Monthly" },
                                                                        { label: "Yearly", value: "Yearly" },
                                                                        { label: "One-time", value: "One-time" }
                                                                    ]}
                                                                />
                                                            ) : (
                                                                <span className="font-medium text-stone-600">{item.frequency}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {editingId === item.id ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleUpdate(item.id)}
                                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                        >
                                                                            <Save className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => setEditingId(null)} className="p-2 text-stone-400 hover:bg-stone-50 rounded-lg transition-colors">
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => startEditing(item)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-white rounded-lg transition-all border border-transparent hover:border-stone-200">
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
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
                </main>
            </div>
        </div>
    );
};
