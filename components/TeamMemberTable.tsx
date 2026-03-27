
import React from 'react';
import { TeamMember, RoleDefinition } from '../types';
import { Edit2, Trash2, Mail, Check, X, MoreHorizontal, Shield, Clock } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface TeamMemberTableProps {
    members: TeamMember[];
    roles: RoleDefinition[];
    currentUserRole: string;
    onUpdateRole: (memberId: string, newRole: string) => void;
    onRemoveMember: (memberId: string) => void;
    onInvite: () => void;
    onResendInvite: (member: TeamMember) => void;
    isResending?: string | null;
    userMap?: Record<string, any>;
}

export const TeamMemberTable: React.FC<TeamMemberTableProps> = ({
    members,
    roles,
    currentUserRole,
    onUpdateRole,
    onRemoveMember,
    onInvite,
    onResendInvite,
    isResending,
    userMap = {}
}) => {

    // Determine if current user can manage team
    const canManage = currentUserRole === 'Founder' || currentUserRole === 'Admin';

    return (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-visible">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div>
                    <h3 className="font-bold text-stone-900">Team Members</h3>
                    <p className="text-xs text-stone-500">{members.length} active members</p>
                </div>
            </div>

            <div className="overflow-x-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-stone-100 text-xs text-stone-500 uppercase tracking-wider">
                            <th className="px-6 py-3 font-medium">User</th>
                            <th className="px-6 py-3 font-medium">Role</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {members.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-stone-400 text-sm">
                                    No team members found. Invite someone to get started!
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => {
                                const user = userMap[member.email];
                                const subStatus = user?.subscriptionStatus || 'free';
                                const subTier = user?.subscriptionTier || 'Free';
                                const isPending = ((member as any).status === 'Pending' || !(member.acceptedRole)) && member.role !== 'Founder';

                                return (
                                    <tr key={member.id} className="group hover:bg-stone-50/50 transition-colors">
                                        {/* User Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold border border-stone-200 overflow-hidden shrink-0">
                                                    {member.pictureUrl ? (
                                                        <img src={member.pictureUrl} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.name?.charAt(0).toUpperCase() || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-serif text-stone-900 font-medium">{member.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-stone-500">{member.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role Column */}
                                        <td className="px-6 py-4">
                                            {canManage && member.role !== 'Founder' ? (
                                                <div className="max-w-[160px] relative z-10">
                                                    <CustomSelect
                                                        value={member.role}
                                                        onChange={(val) => onUpdateRole(member.id, val)}
                                                        options={roles.map(r => ({ label: r.name, value: r.name }))}
                                                        className="w-full"
                                                    />
                                                </div>
                                            ) : (
                                                <span className={`px-2.5 py-1 text-stone-600 rounded-md text-xs font-bold uppercase tracking-wider border ${member.role === 'Founder'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                    : 'bg-stone-100 border-stone-200'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status Column */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {member.role === 'Founder' || (!isPending && (member as any).status === 'Active') ? (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700/80 rounded-full text-xs font-medium border border-green-100">
                                                        <Check className="w-3.5 h-3.5" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700/80 rounded-full text-xs font-medium border border-amber-100">
                                                        <Clock className="w-3.5 h-3.5" /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions Column */}
                                        <td className="px-6 py-4 text-right">
                                            {canManage && (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {((member as any).status === 'Pending' || !(member.acceptedRole)) && (
                                                        <button
                                                            onClick={() => onResendInvite(member)}
                                                            disabled={isResending === member.id}
                                                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                                                            title="Resend Invitation"
                                                        >
                                                            <Mail className={`w-4 h-4 ${isResending === member.id ? 'animate-pulse' : ''}`} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => onRemoveMember(member.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400"
                                                        title="Remove Member"
                                                        disabled={member.role === 'Founder'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
