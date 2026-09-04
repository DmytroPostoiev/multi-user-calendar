import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useWebSocket = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const connect = useCallback(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const wsUrl = `${process.env.VITE_WS_URL || 'ws://localhost:5000'}/ws?token=${token}`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        
        switch (data.type) {
          case 'initial':
          case 'events':
            setEvents(data.events);
            break;
          
          case 'event_created':
            setEvents(prev => [...prev, data.event]);
            break;
          
          case 'event_updated':
            setEvents(prev => prev.map(e => 
              e.id === data.event.id ? data.event : e
            ));
            break;
          
          case 'event_deleted':
            setEvents(prev => prev.filter(e => e.id !== data.eventId));
            break;
          
          default:
            console.log('WebSocket message:', data);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Reconnect after 3 seconds
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

  }, [user]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const getEvents = useCallback((start, end) => {
    send({
      type: 'get_events',
      start: start.toISOString(),
      end: end.toISOString()
    });
  }, [send]);

  useEffect(() => {
    if (user) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    isConnected,
    events,
    lastMessage,
    send,
    getEvents,
    connect,
    disconnect
  };
};