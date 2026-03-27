import React, { useState } from 'react';
import { X, Search, Plus, Receipt } from 'lucide-react';
import { CostItem } from '../types';

interface ExpenseSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    expenses: CostItem[];
    onSelect: (item: CostItem) => void;
}

export const ExpenseSelector: React.FC<ExpenseSelectorProps> = ({ isOpen, onClose, expenses, onSelect }) => {
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filtered = expenses.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200/50">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/80 backdrop-blur-sm">
                    <div>
                        <h3 className="text-xl font-serif font-bold text-stone-900">Import Expense</h3>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mt-1">Select an item from your library</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-white transition-all shadow-sm border border-transparent hover:border-stone-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 border-b border-stone-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                        <input
                            className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-nobel-gold focus:border-nobel-gold outline-none transition-all placeholder:text-stone-400"
                            placeholder="Search your library..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-3 bg-stone-50/30">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-stone-400 flex flex-col items-center">
                            <div className="bg-stone-100 p-4 rounded-full mb-4">
                                <Receipt className="w-8 h-8 opacity-40" />
                            </div>
                            <p className="font-bold text-stone-700 mb-1">No matching expenses found</p>
                            <p className="text-sm">Try adjusting your search terms.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { onSelect(item); onClose(); }}
                                    className="w-full p-4 flex items-center justify-between bg-white border border-stone-100 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5 rounded-xl group transition-all text-left"
                                >
                                    <div>
                                        <div className="font-bold text-stone-900 mb-1">{item.name}</div>
                                        <div className="text-xs font-semibold flex items-center gap-2">
                                            <span className="bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-md border border-stone-200">{item.category || 'General'}</span>
                                            <span className="text-stone-500">{item.frequency}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-stone-900 font-bold bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
                                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                        <div className="p-2 rounded-full bg-purple-50 group-hover:bg-purple-600 transition-colors">
                                            <Plus className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-stone-50/80 border-t border-stone-100 text-center backdrop-blur-sm">
                    <p className="text-xs text-stone-500 font-medium">Use the <span className="font-bold text-stone-900 border-b border-stone-300">Operating Expenses</span> page to manage this list.</p>
                </div>
            </div>
        </div>
    );
};
