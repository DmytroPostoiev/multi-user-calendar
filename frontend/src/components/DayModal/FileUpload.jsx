import React, { useState, useRef } from 'react';
import api from '../../utils/api';
import './FileUpload.css';

const FileUpload = ({ eventId, onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('eventId', eventId);

    try {
      const response = await api.post('/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      setFiles([]);
      onUploadComplete(response.data);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="file-upload">
      <div className="file-upload-header">
        <h4>📎 Attachments</h4>
        <button 
          className="file-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Add Files
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
      />

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <span className="file-icon">
                {file.type.startsWith('image/') ? '🖼️' :
                 file.type === 'application/pdf' ? '📄' :
                 file.type.includes('word') ? '📝' :
                 file.type.includes('excel') ? '📊' :
                 file.type.includes('powerpoint') ? '📽️' :
                 '📎'}
              </span>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button 
                className="file-remove"
                onClick={() => handleRemoveFile(index)}
                disabled={uploading}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {files.length > 0 && !uploading && (
        <button 
          className="upload-submit"
          onClick={handleUpload}
        >
          Upload {files.length} file{files.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
};

export default FileUpload;