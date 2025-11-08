import React from 'react';
import { Link } from 'react-router-dom';

const JobCard = ({ job }) => {
  const statusText = job.isActive ? 'Đang mở' : 'Đã đóng';
  const apps = job.applicationsCount ?? 0;
  const views = job.viewsCount ?? 0;
  const posted = job.createdAt ? new Date(job.createdAt).toLocaleDateString('vi-VN') : '';

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">
              <Link to={`/job/${job.id}`} className="hover:text-blue-600">
                {job.title}
              </Link>
            </h3>
            <div className="ml-2">
              <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${job.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {statusText}
              </span>
            </div>
          </div>
          <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6 text-sm text-gray-500">
            <div className="mt-2">{job.location}</div>
            {job.salary && <div className="mt-2">{job.salary}</div>}
          </div>
        </div>

        <div className="mt-4 sm:mt-0 text-right">
          <div className="flex justify-end gap-2">
            <Link
              to={`/employer/jobs/${job.id}/applicants`}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
            >
              Xem ứng viên ({apps})
            </Link>
            <Link
              to={`/employer/jobs/${job.id}/edit`}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Chỉnh sửa
            </Link>
          </div>
          <div className="mt-2 text-xs text-gray-500">{views} lượt xem • {posted}</div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;