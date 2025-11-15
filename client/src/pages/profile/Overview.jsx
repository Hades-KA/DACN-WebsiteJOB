import React, { useState } from 'react';
import { Briefcase, Bookmark, TrendingUp } from 'lucide-react';

export default function Overview() {
  const userRaw = localStorage.getItem('user');
  const user = userRaw && userRaw !== 'undefined' && userRaw !== 'null' ? JSON.parse(userRaw) : {};

  const [stats] = useState({
    appliedJobs: 0,
    savedJobs: 0,
    interviewInvites: 0,
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-base font-semibold text-gray-900">Hoạt động của bạn</h2>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="w-4 h-4" /> <span>Ứng tuyển</span>
            </div>
            <div className="mt-1 text-2xl font-semibold text-blue-700">{stats.appliedJobs}</div>
          </div>

          <div className="rounded-lg p-4 bg-emerald-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bookmark className="w-4 h-4" /> <span>Việc làm đã lưu</span>
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700">{stats.savedJobs}</div>
          </div>

          <div className="rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" /> <span>Lời mời công việc</span>
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-800">{stats.interviewInvites}</div>
          </div>
        </div>
      </div>
    </div>
  );
}