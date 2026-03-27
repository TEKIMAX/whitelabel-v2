
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { ChartData } from '../../../../types';

const COLORS = ['#C5A059', '#1a1a1a', '#4a4a4a', '#8b7d6b', '#d4af37'];

const PlotlyChart: React.FC<ChartData> = ({ type, data, title, xAxis, yAxis }) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey={xAxis || 'name'} />
            <YAxis />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Bar dataKey={yAxis || 'value'} fill="#C5A059" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey={xAxis || 'name'} />
            <YAxis />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={yAxis || 'value'}
              stroke="#C5A059"
              strokeWidth={3}
              dot={{ r: 6, fill: '#C5A059', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={yAxis || 'value'}
              nameKey={xAxis || 'name'}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="my-6 p-6 bg-white rounded-2xl border border-nobel-gold/20 shadow-sm">
      <h3 className="font-serif text-lg mb-6 text-nobel-dark">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
          {renderChart() || <div>Unsupported chart type</div>}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlotlyChart;
