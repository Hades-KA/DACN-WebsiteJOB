import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cvService } from '../services/api';

const CVUpload = ({ onUploadSuccess, onUploadError }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setError('');
    setUploadStatus(null);
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Chỉ chấp nhận file PDF, Word hoặc TXT');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 10MB');
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('cv', file);
      
      const response = await cvService.uploadCV(formData);
      
      setUploadStatus('success');
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (error) {
      setUploadStatus('error');
      setError(error.response?.data?.message || 'Upload thất bại');
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadStatus(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        {!uploadedFile ? (
          <div>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Kéo thả file CV vào đây
            </p>
            <p className="text-gray-600 mb-4">
              hoặc <span className="text-blue-600">chọn file</span> từ máy tính
            </p>
            <p className="text-sm text-gray-500">
              Hỗ trợ: PDF, Word, TXT (tối đa 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
            
            {uploading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Đang upload...</span>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="flex items-center justify-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Upload thành công!</span>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex items-center justify-center text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">Upload thất bại</span>
              </div>
            )}

            {!uploading && (
              <button
                onClick={removeFile}
                className="flex items-center justify-center text-red-600 hover:text-red-700 transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                <span className="text-sm">Xóa file</span>
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm text-green-600">
              CV đã được upload và đang được phân tích bởi AI...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVUpload;
