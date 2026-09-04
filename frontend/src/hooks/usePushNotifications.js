import { useState, useEffect } from 'react';
import api from '../utils/api';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkPermission();
    }
  }, []);

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!isSupported) {
        throw new Error('Push notifications not supported');
      }

      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY
        )
      });

      // Save subscription on server
      await api.post('/notifications/subscribe', subscription.toJSON());
      
      setSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/notifications/unsubscribe');
        setSubscription(null);
      }
    } catch (error) {
      console.error('Unsubscribe failed:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      await api.post('/notifications/test');
    } catch (error) {
      console.error('Test notification failed:', error);
    }
  };

  // Helper: Convert base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return {
    permission,
    subscription,
    isSupported,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    checkPermission
  };
};