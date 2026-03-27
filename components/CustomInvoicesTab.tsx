import React, { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from "../convex/_generated/api";
import { Loader2, Plus, FileText, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomInvoicesTabProps {
    stripeAccountId: string;
}

export const CustomInvoicesTab: React.FC<CustomInvoicesTabProps> = ({ stripeAccountId }) => {
    const listInvoices = useAction(api.stripeActions.listConnectedInvoices);
    const createInvoice = useAction(api.stripeActions.createConnectedInvoice);
    const deleteInvoice = useAction(api.stripeActions.deleteConnectedInvoice);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    // Form State
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    // Delete State
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const data = await listInvoices({ stripeAccountId });
            setInvoices(data);
        } catch (e) {
            toast.error("Failed to load invoices");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (stripeAccountId) {
            fetchInvoices();
        }
    }, [stripeAccountId]);

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            await deleteInvoice({ stripeAccountId, invoiceId: invoiceToDelete });
            toast.success("Invoice deleted/voided");
            fetchInvoices();
        } catch (e) {
            toast.error("Failed to delete invoice");
        } finally {
            setInvoiceToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await createInvoice({
                stripeAccountId,
                customerName,
                customerEmail,
                amount: Math.round(parseFloat(amount) * 100),
                description
            });
            toast.success("Draft invoice created!");
            setOpenModal(false);
            // Reset
            setCustomerName("");
            setCustomerEmail("");
            setAmount("");
            setDescription("");
            // Refresh
            fetchInvoices();
        } catch (e) {
            toast.error("Failed to create invoice");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-stone-900 font-serif">Invoices</h2>
                    <p className="text-stone-500 text-sm">Convert customers with professional invoices.</p>
                </div>
                <button
                    onClick={() => setOpenModal(true)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-full flex items-center gap-2 hover:bg-stone-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Invoice
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
                </div>
            ) : invoices.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <FileText className="w-12 h-12 mx-auto text-stone-300 mb-4" />
                    <h3 className="text-stone-900 font-medium">No invoices yet</h3>
                    <p className="text-stone-500 text-sm mt-1">Create your first invoice to bill a customer.</p>
                </div>
            ) : (
                <div className="bg-white border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-stone-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium text-stone-500">Amount</th>
                                <th className="px-6 py-3 font-medium text-stone-500">Customer</th>
                                <th className="px-6 py-3 font-medium text-stone-500">Status</th>
                                <th className="px-6 py-3 font-medium text-stone-500 text-right">Date</th>
                                <th className="px-6 py-3 font-medium text-stone-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-stone-50/50">
                                    <td className="px-6 py-4 font-mono font-medium">
                                        {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: inv.currency
                                        }).format(inv.amount_due / 100)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-stone-900">{inv.customer_name || inv.customer_email || 'Unknown'}</div>
                                        <div className="text-stone-500 text-xs">{inv.customer_email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                            inv.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-stone-100 text-stone-600 border-stone-200'
                                            }`}>
                                            {inv.status === 'paid' ? <CheckCircle className="w-3 h-3" /> :
                                                inv.status === 'open' ? <Clock className="w-3 h-3" /> : null}
                                            {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-stone-500 text-xs">
                                        {new Date(inv.created * 1000).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(inv.status === 'draft' || inv.status === 'open') && (
                                            <button
                                                onClick={() => setInvoiceToDelete(inv.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors inline-block"
                                                title="Delete/Void Invoice"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {openModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Create Draft Invoice</h3>
                            <button onClick={() => setOpenModal(false)} className="text-stone-400 hover:text-stone-900">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Customer Name</label>
                                <input
                                    required
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Customer Email</label>
                                <input
                                    required
                                    type="email"
                                    value={customerEmail}
                                    onChange={e => setCustomerEmail(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Amount ($)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Memo / Description</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    rows={2}
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpenModal(false)}
                                    className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Draft
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {invoiceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg text-stone-900 mb-2">Delete Invoice?</h3>
                        <p className="text-stone-500 text-sm mb-6">
                            Are you sure you want to delete/void this invoice? This action cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => setInvoiceToDelete(null)}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
