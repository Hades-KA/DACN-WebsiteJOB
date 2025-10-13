import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, DollarSign, Building, Star } from 'lucide-react';
import api from '../services/api';

// Simple in-memory cache for saved job IDs to avoid many network calls and keep state across cards
let savedIdsCache = null; // Set<string> | null
let savedIdsLoading = null; // Promise<Set<string>> | null

const loadSavedIds = async () => {
  if (savedIdsCache) return savedIdsCache;
  if (savedIdsLoading) return savedIdsLoading;
  const token = localStorage.getItem('token');
  if (!token) {
    savedIdsCache = new Set();
    return savedIdsCache;
  }
  savedIdsLoading = api.get('/saved-jobs')
    .then(res => {
      const ids = new Set((res.data?.data || []).map(j => j.id));
      savedIdsCache = ids;
      return ids;
    })
    .catch(() => {
      savedIdsCache = new Set();
      return savedIdsCache;
    })
    .finally(() => {
      savedIdsLoading = null;
    });
  return savedIdsLoading;
};

const JobCard = ({ job }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const userRaw = localStorage.getItem('user');
  const user = userRaw && userRaw !== 'undefined' && userRaw !== 'null' ? JSON.parse(userRaw) : null;
  const userType = user?.userType;
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
  };

  // On mount, preload saved state so it persists across reloads
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!localStorage.getItem('token')) return;
      const ids = await loadSavedIds();
      if (mounted) setIsSaved(ids.has(job.id));
    })();
    return () => { mounted = false; };
  }, [job.id]);

  const getJobTypeColor = (type) => {
    const colors = {
      'full-time': 'bg-green-100 text-green-800',
      'part-time': 'bg-blue-100 text-blue-800',
      'contract': 'bg-purple-100 text-purple-800',
      'intern': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getJobTypeLabel = (type) => {
    const labels = {
      'full-time': 'Toàn thời gian',
      'part-time': 'Bán thời gian',
      'contract': 'Hợp đồng',
      'intern': 'Thực tập'
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {job.title}
          </h3>
          <div className="flex items-center text-gray-600 mb-2">
            <Building className="w-4 h-4 mr-2" />
            <span className="text-sm">{job.company}</span>
          </div>
        </div>
        {job.featured && (
          <div className="flex items-center text-yellow-600">
            <Star className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="text-sm">{job.location}</span>
        </div>
        {job.salary && (
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            <span className="text-sm">{job.salary}</span>
          </div>
        )}
        <div className="flex items-center text-gray-600">
          <Clock className="w-4 h-4 mr-2" />
          <span className="text-sm">{getJobTypeLabel(job.type)}</span>
        </div>
      </div>

      {job.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {job.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(() => {
          let skills = [];
          if (Array.isArray(job.skills)) skills = job.skills;
          else if (typeof job.skills === 'string') {
            try {
              const parsed = JSON.parse(job.skills);
              if (Array.isArray(parsed)) skills = parsed;
              else skills = job.skills.split(',').map(s => s.trim()).filter(Boolean);
            } catch (_) {
              skills = job.skills.split(',').map(s => s.trim()).filter(Boolean);
            }
          }
          const top = skills.slice(0, 3);
          return top.map((skill, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
          >
            {skill}
          </span>
          ));
        })()}
        {(() => {
          let len = 0;
          if (Array.isArray(job.skills)) len = job.skills.length;
          else if (typeof job.skills === 'string') {
            try {
              const parsed = JSON.parse(job.skills);
              len = Array.isArray(parsed) ? parsed.length : 0;
            } catch (_) { len = job.skills ? job.skills.split(',').filter(Boolean).length : 0; }
          }
          return len > 3 ? (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            +{len - 3} khác
          </span>
          ) : null;
        })()}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.type)}`}>
            {getJobTypeLabel(job.type)}
          </span>
          {job.experience && (
            <span className="text-xs text-gray-500">
              {job.experience} năm KN
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(job.createdAt)}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <span>{job.applications || 0} ứng viên</span>
          </div>
          <div className="flex space-x-2">
            <button
              disabled={saving}
              onClick={async () => {
                if (!localStorage.getItem('token')) return navigate('/login');
                if (userType && userType !== 'candidate' && userType !== 'admin') return;
                try {
                  setSaving(true);
                  if (isSaved) {
                    await api.delete(`/saved-jobs/${job.id}`);
                    setIsSaved(false);
                    if (savedIdsCache) savedIdsCache.delete(job.id);
                  } else {
                    await api.post('/saved-jobs', { jobId: job.id });
                    setIsSaved(true);
                    if (savedIdsCache) savedIdsCache.add(job.id);
                  }
                } catch (_) {
                  // ignore for now
                } finally {
                  setSaving(false);
                }
              }}
              className={`px-3 py-1 text-sm rounded ${isSaved ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:text-blue-600'}`}
            >
              {isSaved ? 'Đã lưu' : 'Lưu'}
            </button>
            <Link
              to={`/job/${job.id}`}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
