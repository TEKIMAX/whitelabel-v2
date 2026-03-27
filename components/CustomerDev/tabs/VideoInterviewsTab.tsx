import React from 'react';
import { Video, FileText, Trash2 } from 'lucide-react';
import CustomSelect from '../../CustomSelect';

interface VideoInterview {
    _id: string;
    name: string;
    email: string;
    linkedInterviewId?: string;
    videoUrl?: string;
    waiverUrl?: string;
}

interface LinkedInterview {
    id: string;
    Name?: string;
    Role?: string;
}

interface VideoInterviewsTabProps {
    interviews: VideoInterview[];
    linkedInterviews: LinkedInterview[];
    selectedId?: string;
    canEdit: boolean;
    onSelect: (interview: VideoInterview) => void;
    onDelete: (id: string) => void;
    onUpdateLink: (id: string, linkedId: string) => void;
    onUploadClick: () => void;
}

export const VideoInterviewsTab: React.FC<VideoInterviewsTabProps> = ({
    interviews,
    linkedInterviews,
    selectedId,
    canEdit,
    onSelect,
    onDelete,
    onUpdateLink,
    onUploadClick
}) => {
    if (interviews.length === 0) {
        return (
            <div className="flex-grow flex flex-col lg:flex-row items-center justify-center gap-0 p-8 min-h-[600px] w-full max-w-6xl mx-auto">
                <img
                    src="/images/hero-carousel-1.png"
                    alt="Video Interview Session"
                    className="w-full lg:w-[480px] h-[500px] rounded-l-2xl border-8 border-white shadow-xl object-cover shrink-0"
                />
                <div className="bg-white rounded-r-2xl p-10 lg:p-12 shadow-sm border border-stone-100 flex-1 min-w-[320px] max-w-md flex flex-col items-center text-center h-[500px] justify-center">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-6">
                        <Video className="w-8 h-8 text-stone-900" />
                    </div>
                    <h3 className="font-serif text-3xl text-stone-900 mb-4">Capture Deep Insights</h3>
                    <p className="text-stone-500 leading-relaxed mb-8 text-lg">
                        <span className="font-bold text-stone-900 block mb-2">Why Video?</span>
                        Communication is 90% non-verbal. Recording customer interviews captures tone, hesitation, and excitement that text notes miss.
                    </p>
                    {canEdit && (
                        <button
                            onClick={onUploadClick}
                            className="bg-stone-900 text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-lg flex items-center gap-3"
                        >
                            <Video className="w-4 h-4" />
                            Upload Video Interview
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex-grow">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#F5F4F0]">
                    <tr>
                        <th className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500">Name</th>
                        <th className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500">Email</th>
                        <th className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500">Linked Interview</th>
                        <th className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500 text-center">Waiver</th>
                        <th className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500 text-center">Video</th>
                        <th className="px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                    {interviews.map((interview) => (
                        <tr
                            key={interview._id}
                            className={`hover:bg-[#F9F8F4] transition-colors cursor-pointer group ${selectedId === interview._id ? 'bg-[#F5F4F0]' : ''}`}
                        >
                            <td className="px-6 py-4 font-bold text-stone-900" onClick={() => onSelect(interview)}>{interview.name}</td>
                            <td className="px-6 py-4 text-stone-600" onClick={() => onSelect(interview)}>{interview.email}</td>
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                {canEdit ? (
                                    <CustomSelect
                                        value={interview.linkedInterviewId || ''}
                                        onChange={(val) => onUpdateLink(interview._id, val)}
                                        options={[
                                            { label: 'Unlinked', value: '', color: 'bg-stone-50 text-stone-500 border-stone-200' },
                                            ...linkedInterviews.map(ci => ({
                                                label: ci.Name || 'Unnamed',
                                                value: ci.id,
                                                color: 'bg-white text-stone-900 border-stone-200'
                                            }))
                                        ]}
                                        className="w-40"
                                    />
                                ) : (
                                    <span className="text-stone-600 text-sm">
                                        {linkedInterviews.find(ci => ci.id === interview.linkedInterviewId)?.Name || '-'}
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center" onClick={() => onSelect(interview)}>
                                {interview.waiverUrl ? (
                                    <div className="flex justify-center">
                                        <FileText className="w-5 h-5 text-nobel-gold" />
                                    </div>
                                ) : (
                                    <span className="text-stone-300">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center" onClick={() => onSelect(interview)}>
                                {interview.videoUrl ? (
                                    <div className="flex justify-center">
                                        <Video className="w-5 h-5 text-stone-900" />
                                    </div>
                                ) : (
                                    <span className="text-stone-300">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {canEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(interview._id);
                                        }}
                                        className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    >
                                        <Trash2 className="w-4 h-4 pointer-events-none" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
