import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';

interface InterviewRecord {
    Role?: string;
    [key: string]: any;
}

interface OverviewTabProps {
    interviews: InterviewRecord[];
    sentimentCounts: { positive: number; negative: number; neutral: number };
    avgWTP: number;
}

const sentimentColors = {
    'Positive': '#10B981',
    'Negative': '#EF4444',
    'Unknown': '#9CA3AF'
};

const sentimentChartData = [
    { name: 'Positive', count: 0, fill: sentimentColors.Positive },
    { name: 'Negative', count: 0, fill: sentimentColors.Negative },
    { name: 'Neutral', count: 0, fill: sentimentColors.Unknown }
];

const roleChartData = [
    { name: 'CEO', count: 0 },
    { name: 'CTO', count: 0 },
    { name: 'Product', count: 0 },
    { name: 'Engineering', count: 0 },
    { name: 'Sales', count: 0 },
    { name: 'Marketing', count: 0 },
    { name: 'Other', count: 0 }
];

export const OverviewTab: React.FC<OverviewTabProps> = ({
    interviews,
    sentimentCounts,
    avgWTP
}) => {
    const chartData = [
        { name: 'Positive', count: sentimentCounts.positive, fill: '#10B981' },
        { name: 'Negative', count: sentimentCounts.negative, fill: '#EF4444' },
        { name: 'Neutral', count: sentimentCounts.neutral, fill: '#9CA3AF' }
    ];

    const roleCounts = interviews.reduce((acc, interview) => {
        const role = interview.Role || 'Other';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const roleData = Object.entries(roleCounts)
        .map(([name, count]) => ({ name, count: count || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-serif text-stone-900 mb-2">{interviews.length}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500">Total Interviews</div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-serif text-emerald-700 mb-2">{sentimentCounts.positive}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-600/70">Positive Sentiment</div>
                </div>
                <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-serif text-red-700 mb-2">{sentimentCounts.negative}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-red-600/70">Negative Sentiment</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-serif text-nobel-gold mb-2">${avgWTP}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-stone-500">Average WTP</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900 mb-6">Sentiment Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900 mb-6">Top Roles Interviewed</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={roleData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#4B5563' }} width={80} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                                <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
