import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './AuditLog.css';

const AuditLog = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit', { params: filters });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const badges = {
      create: 'badge-create',
      update: 'badge-update',
      delete: 'badge-delete',
      view: 'badge-view',
      share: 'badge-share'
    };
    return badges[action] || 'badge-default';
  };

  const getEntityIcon = (type) => {
    const icons = {
      event: '📅',
      user: '👤',
      settings: '⚙️',
      attachment: '📎',
      share: '🔗'
    };
    return icons[type] || '📌';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="audit-log">
      <h3>📋 Activity Log</h3>
      
      <div className="audit-filters">
        <div className="filter-group">
          <label>Action</label>
          <select 
            value={filters.action} 
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          >
            <option value="">All</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="view">View</option>
            <option value="share">Share</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Entity</label>
          <select 
            value={filters.entityType} 
            onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
          >
            <option value="">All</option>
            <option value="event">Events</option>
            <option value="user">Users</option>
            <option value="settings">Settings</option>
            <option value="attachment">Attachments</option>
            <option value="share">Shares</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>From</label>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        
        <div className="filter-group">
          <label>To</label>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="audit-loading">Loading activity log...</div>
      ) : logs.length === 0 ? (
        <div className="audit-empty">No activity found</div>
      ) : (
        <div className="audit-list">
          {logs.map(log => (
            <div key={log.id} className="audit-item">
              <div className="audit-icon">
                {getEntityIcon(log.entity_type)}
              </div>
              <div className="audit-content">
                <div className="audit-header">
                  <span className="audit-user">{log.user_name}</span>
                  <span className={`audit-action ${getActionBadge(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="audit-entity">{log.entity_type}</span>
                </div>
                <div className="audit-details">
                  <span className="audit-time">{formatDate(log.created_at)}</span>
                  {log.entity_id && (
                    <span className="audit-id">ID: {log.entity_id}</span>
                  )}
                </div>
                {log.changes && (
                  <div className="audit-changes">
                    <details>
                      <summary>View changes</summary>
                      <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLog;