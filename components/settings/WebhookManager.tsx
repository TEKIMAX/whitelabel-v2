
import React, { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { Trash2, Copy, Eye, Plus, Check, Globe, ChevronDown } from 'lucide-react';
import { toast } from "sonner";

interface WebhookManagerProps {
    orgId: string;
}

export const WebhookManager: React.FC<WebhookManagerProps> = ({ orgId }) => {
    const webhooks = useQuery(api.webhooks.listWebhooks, { orgId });
    const createWebhook = useAction(api.webhooks.createWebhookAction);
    const deleteWebhook = useAction(api.webhooks.deleteWebhookAction);

    const [isCreating, setIsCreating] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>(['model_canvas.version_created']);
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const availableEvents = [
        { id: 'model_canvas.version_created', label: 'Model Canvas Version Saved' },
        { id: 'journey.milestone_updated', label: 'Journey Milestone Updated' }
    ];

    const handleCreate = async () => {
        if (!newUrl) return;
        setLoading(true);
        try {
            const secret = await createWebhook({
                orgId,
                url: newUrl,
                eventTypes: selectedEvents
            });
            setNewSecret(secret);
            setNewUrl('');
            setSelectedEvents(['model_canvas.version_created']);
            toast.success("Webhook Created", { description: "Successfully created webhook." });
        } catch (e) {
            toast.error("Error", { description: "Failed to create webhook." });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: any, vaultSecretId: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        try {
            await deleteWebhook({ webhookId: id, vaultSecretId });
            toast.success("Deleted", { description: "Webhook deleted." });
        } catch (e) {
            toast.error("Error", { description: "Failed to delete webhook." });
        }
    };

    const copySecret = () => {
        if (newSecret) {
            navigator.clipboard.writeText(newSecret);
            toast.success("Copied", { description: "Secret copied to clipboard." });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* List of Webhooks */}
            <div className="space-y-4">
                {webhooks?.map((wh: any) => (
                    <div key={wh._id} className="bg-white border border-stone-200 rounded-2xl shadow-sm transition-all hover:shadow-md overflow-hidden">
                        <details className="group/accordion">
                            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-stone-50/80 transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0 mr-4">
                                    <div className="p-2 bg-stone-100 rounded-xl text-stone-500 group-hover/accordion:text-stone-900 transition-colors shrink-0">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div className="font-mono text-sm text-stone-700 truncate font-medium" title={wh.url}>
                                        {wh.url}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="flex items-center justify-center text-[10px] uppercase font-bold tracking-wider text-stone-500 bg-stone-100 px-3 py-1 rounded-full min-w-[5rem] group-open/accordion:hidden">
                                        {wh.eventTypes.length} Event{wh.eventTypes.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className="text-stone-400 transform group-open/accordion:rotate-180 transition-transform duration-200">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </summary>

                            <div className="px-5 pb-5 pt-0 bg-stone-50/30 border-t border-stone-100">
                                <div className="pt-4 space-y-5">
                                    <div>
                                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 block ml-1">Active Events</label>
                                        <div className="flex flex-wrap gap-2">
                                            {wh.eventTypes.map((et: string) => (
                                                <span key={et} className="text-xs bg-white text-stone-600 px-3 py-1.5 rounded-lg border border-stone-200 font-mono shadow-sm">
                                                    {et}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-stone-100/50 mt-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">ID:</span>
                                            <code className="text-xs text-stone-400 font-mono select-all bg-stone-100/50 px-1.5 py-0.5 rounded">
                                                {wh._id}
                                            </code>
                                        </div>
                                        <button
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors"
                                            onClick={() => handleDelete(wh._id, wh.vaultSecretId)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                ))}

                {webhooks?.length === 0 && !isCreating && (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-200/80">
                        <div className="mx-auto w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-200">
                            <Globe className="w-7 h-7 text-stone-300" />
                        </div>
                        <h3 className="text-stone-900 font-bold mb-2">No Webhooks Configured</h3>
                        <p className="text-stone-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">Add a webhook destination to receive real-time updates for your project events.</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Webhook
                        </button>
                    </div>
                )}
            </div>

            {/* Create Form */}
            {isCreating && !newSecret && (
                <div className="bg-white p-6 rounded-2xl border border-stone-200 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Configure New Webhook
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1.5">Endpoint URL</label>
                            <input
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://api.yourservice.com/webhooks"
                                className="w-full text-sm p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 outline-none transition-all placeholder:text-stone-400 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Subscribe to Events</label>
                            <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                                {availableEvents.map(evt => (
                                    <label key={evt.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors group">
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.includes(evt.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedEvents([...selectedEvents, evt.id]);
                                                else setSelectedEvents(selectedEvents.filter(id => id !== evt.id));
                                            }}
                                            className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                                        />
                                        <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">{evt.label}</span>
                                        <span className="text-xs text-stone-400 font-mono ml-auto hidden sm:block group-hover:text-stone-500">{evt.id}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-stone-100">
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading || !newUrl}
                            className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                            {loading ? 'Creating...' : 'Create Webhook'}
                        </button>
                    </div>
                </div>
            )}

            {/* Add Button (when list exists) */}
            {!isCreating && webhooks && webhooks.length > 0 && !newSecret && (
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> Add Another Webhook
                </button>
            )}

            {/* Secret Reveal Modal / Area */}
            {newSecret && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 mt-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-4">
                        <div className="bg-amber-100 p-2.5 rounded-full shrink-0">
                            <Eye className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-amber-900 mb-1 text-lg">Save your Signing Secret</h3>
                            <p className="text-sm text-amber-800/80 mb-4 leading-relaxed">
                                This secret is used to sign webhook requests so you can verify they come from us.
                                <strong className="block mt-1">We will only show this to you once.</strong>
                            </p>

                            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl p-3 mb-6 shadow-sm">
                                <code className="flex-1 font-mono text-sm text-stone-800 break-all">
                                    {newSecret}
                                </code>
                                <button
                                    onClick={copySecret}
                                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-900"
                                    title="Copy to clipboard"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => { setNewSecret(null); setIsCreating(false); }}
                                className="px-6 py-2.5 bg-amber-900/10 text-amber-900 border border-amber-900/20 rounded-xl hover:bg-amber-900/20 transition-colors font-bold text-sm"
                            >
                                I have saved it securely
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
