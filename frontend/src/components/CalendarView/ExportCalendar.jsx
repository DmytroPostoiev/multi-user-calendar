import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCalendar } from '../../context/CalendarContext';
import Button from '../common/Button';
import api from '../../utils/api';
import './ExportCalendar.css';

const ExportCalendar = () => {
  const { user } = useAuth();
  const { currentDate } = useCalendar();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState('ical');
  const [dateRange, setDateRange] = useState('month');

  const getDateRange = () => {
    const now = new Date();
    let start, end;

    switch (dateRange) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterMonth, 1);
        end = new Date(now.getFullYear(), quarterMonth + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { start, end };
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      if (format === 'ical') {
        const response = await api.get('/export/ical', {
          params: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          responseType: 'blob'
        });

        // Download .ics file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `calendar-${start.toISOString().split('T')[0]}.ics`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

      } else if (format === 'google') {
        // Redirect to Google Calendar
        const response = await api.get('/export/google', {
          params: {
            start: start.toISOString(),
            end: end.toISOString()
          }
        });
        window.open(response.data.url, '_blank');

      } else if (format === 'outlook') {
        const response = await api.get('/export/outlook', {
          params: {
            start: start.toISOString(),
            end: end.toISOString()
          }
        });
        window.open(response.data.url, '_blank');
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-calendar">
      <h3>📤 Export Calendar</h3>
      
      <div className="export-options">
        <div className="export-group">
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="ical">iCal (.ics)</option>
            <option value="google">Google Calendar</option>
            <option value="outlook">Outlook Calendar</option>
          </select>
        </div>

        <div className="export-group">
          <label>Date Range</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      <Button 
        variant="primary" 
        onClick={handleExport}
        loading={loading}
        fullWidth
      >
        {format === 'ical' ? '📥 Download' : '🔗 Open in Calendar'}
      </Button>

      <div className="export-info">
        <p>💡 Export your events to your favorite calendar app.</p>
        <p className="export-note">
          {format === 'ical' 
            ? 'Download an .ics file that you can import into any calendar app.'
            : format === 'google'
            ? 'Open your events directly in Google Calendar.'
            : 'Open your events directly in Outlook Calendar.'}
        </p>
      </div>
    </div>
  );
};

export default ExportCalendar;