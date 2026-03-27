
import React from 'react';
import { TableData } from '../../../../types';

const DataTable: React.FC<TableData> = ({ columns = [], rows = [] }) => {
  if (!columns.length && !rows.length) return null;
  return (
    <div className="my-6 overflow-hidden border border-nobel-gold/20 rounded-2xl shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-nobel-dark text-white">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider border-b border-nobel-gold/10">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-nobel-cream transition-colors duration-150 cursor-pointer"
                onClick={() => {}}
              >
                {columns.map((col) => (
                  <td key={col} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                    {row[col]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
