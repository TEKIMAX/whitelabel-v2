
import React from 'react';
import { useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { X } from 'lucide-react';

interface CompetitorDebugProps {
    orgId: string;
    onClose: () => void;
}

const CompetitorDebug: React.FC<CompetitorDebugProps> = ({ orgId, onClose }) => {
    const debugData = useQuery(api.competitors.getDebugDataByOrg, { orgId });

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div>
                        <h2 className="text-xl font-bold text-stone-900 font-serif">Database Inspector (Org: {orgId})</h2>
                        <p className="text-sm text-stone-500">Live view of raw competitor data in Convex</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-stone-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 px-1">competitor_config</h3>
                        <div className="bg-stone-900 rounded-xl p-4 overflow-auto max-h-[60vh]">
                            <pre className="text-[10px] text-green-400 font-mono">
                                {debugData ? JSON.stringify(debugData.config, null, 2) : 'Loading...'}
                            </pre>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 px-1">competitors</h3>
                        <div className="bg-stone-900 rounded-xl p-4 overflow-auto max-h-[60vh]">
                            <pre className="text-[10px] text-blue-300 font-mono">
                                {debugData ? JSON.stringify(debugData.competitors, null, 2) : 'Loading...'}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
                    <p className="text-[10px] text-stone-400 uppercase tracking-tighter self-center mr-auto">Total Configs: {debugData?.config?.length || 0} | Total Competitors: {debugData?.competitors?.length || 0}</p>
                    <button onClick={onClose} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-stone-800 transition-all">
                        Close Inspector
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompetitorDebug;
