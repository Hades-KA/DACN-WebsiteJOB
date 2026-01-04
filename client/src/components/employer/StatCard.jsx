import React from 'react';

const StatCard = ({ title, value, icon, change }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-black/5">
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 rounded-md p-3" style={{ background: '#E0E7FF' /* indigo-100 */ }}>
            <div className="h-6 w-6" style={{ color: '#2563EB' /* blue-600 */ }}>{icon}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500">{title}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
          </div>
        </div>
      </div>
      {change && (
        <div className="bg-gray-50 px-5 py-2 rounded-b-lg border-t border-gray-100 text-xs">
          <span className={`font-medium ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
            {change.value}
          </span>{' '}
          {change.type === 'increase' ? 'tăng' : 'giảm'} so với tháng trước
        </div>
      )}
    </div>
  );
};

export default StatCard;