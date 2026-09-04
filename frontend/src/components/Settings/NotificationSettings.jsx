import React, { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import Button from '../common/Button';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const { 
    permission, 
    isSupported, 
    subscribeToPush, 
    unsubscribeFromPush, 
    sendTestNotification 
  } = usePushNotifications();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage('');
    try {
      await subscribeToPush();
      setMessage('✅ Push notifications enabled successfully!');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setMessage('✅ Push notifications disabled');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendTestNotification();
      setMessage('✅ Test notification sent!');
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="notification-settings">
        <p className="not-supported">
          🔔 Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <h3>Push Notifications</h3>
      
      <div className="notification-status">
        <span className="status-label">Status:</span>
        <span className={`status-badge status-${permission}`}>
          {permission === 'granted' ? '✅ Enabled' : 
           permission === 'denied' ? '❌ Blocked' : 
           '⏳ Not requested'}
        </span>
      </div>

      {message && (
        <div className="notification-message">{message}</div>
      )}

      <div className="notification-actions">
        {permission === 'granted' ? (
          <>
            <Button 
              variant="primary" 
              onClick={handleTestNotification}
              loading={loading}
            >
              📨 Send Test
            </Button>
            <Button 
              variant="danger" 
              onClick={handleUnsubscribe}
              loading={loading}
            >
              🔕 Disable
            </Button>
          </>
        ) : (
          <Button 
            variant="primary" 
            onClick={handleSubscribe}
            loading={loading}
          >
            🔔 Enable Notifications
          </Button>
        )}
      </div>

      <div className="notification-info">
        <p>💡 You'll receive notifications for:</p>
        <ul>
          <li>Upcoming events (15 min before)</li>
          <li>Shared events with you</li>
          <li>Event reminders</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationSettings;