import React from 'react';
import { useQuery, useConvexAuth } from 'convex/react';
import { api } from "../convex/_generated/api";
import { TeamMember } from '../types';
import { X, FileText, CheckCircle, Clock } from 'lucide-react';
import { Id } from '../convex/_generated/dataModel';

interface MemberDetailSheetProps {
    member: TeamMember;
    projectId: string;
    onClose: () => void;
}

export const MemberDetailSheet: React.FC<MemberDetailSheetProps> = ({ member, projectId, onClose }) => {
    const { isAuthenticated } = useConvexAuth();
    const documents = useQuery(api.legal.getDocuments, isAuthenticated ? {
        projectId: projectId,
        recipientId: member.id
    } : "skip") || [];

    return (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-stone-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white border border-stone-200 flex items-center justify-center text-xl font-serif text-stone-500 shadow-sm overflow-hidden">
                        {member.pictureUrl ? (
                            <img src={member.pictureUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                            member.name?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-serif text-stone-900">{member.name}</h2>
                        <div className="text-sm text-stone-500">{member.email}</div>
                        <span className="inline-block px-2 py-0.5 mt-1 bg-stone-100 text-stone-600 rounded text-xs font-bold uppercase tracking-wider border border-stone-200">
                            {member.role}
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-6">

                {/* Associated Documents */}
                <section>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Associated Documents
                    </h3>

                    {documents.length === 0 ? (
                        <div className="p-4 rounded-lg bg-stone-50 border border-stone-100 text-center text-sm text-stone-500 italic">
                            No documents associated with this user.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc) => (
                                <div key={doc.id} className="p-3 bg-white border border-stone-200 rounded-lg hover:border-nobel-gold transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-medium text-stone-900 text-sm">{doc.type || "Document"}</div>
                                        {doc.status === 'Signed' || doc.signedAt ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle className="w-3 h-3" /> Signed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                                <Clock className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-stone-500">
                                        Created: {new Date(doc._creationTime).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Additional Info (Placeholder) */}
                <section className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-4">Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-stone-50 rounded-lg">
                            <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Joined</div>
                            <div className="text-sm font-medium text-stone-700">
                                {(member as any).joinedAt ? new Date((member as any).joinedAt).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-lg">
                            <div className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">Status</div>
                            <div className="text-sm font-medium text-stone-700">
                                {(member as any).status || (member.acceptedRole ? 'Active' : 'Pending')}
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
