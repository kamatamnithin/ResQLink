import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase/client';

/**
 * Custom hook for real-time updates via Supabase Realtime
 * Simulates real-time updates by polling with smart refresh
 */
export const useRealtime = (
  refreshCallback: () => Promise<void>,
  config: {
    interval?: number; // Refresh interval in milliseconds (default: 5000ms / 5s)
    dependencies?: any[]; // Dependencies to trigger re-subscription
  } = {}
) => {
  const { interval = 5000, dependencies = [] } = config;
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Initial load
    refreshCallback();

    // Setup polling interval for real-time simulation
    intervalRef.current = setInterval(async () => {
      if (mountedRef.current) {
        try {
          await refreshCallback();
          setIsConnected(true);
        } catch (error) {
          console.error('Real-time refresh error:', error);
          setIsConnected(false);
        }
      }
    }, interval);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, dependencies);

  return { isConnected };
};

/**
 * Advanced real-time hook with Supabase Broadcast channels
 * For instant updates when other users make changes
 */
export const useRealtimeBroadcast = (
  channel: string,
  onMessage: (payload: any) => void,
  config: {
    refreshCallback?: () => Promise<void>;
    broadcastEvents?: string[];
  } = {}
) => {
  const { refreshCallback, broadcastEvents = ['update', 'insert', 'delete'] } = config;
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Create channel for real-time broadcasting
    const realtimeChannel = supabase.channel(channel);

    // Subscribe to broadcast events
    broadcastEvents.forEach((event) => {
      realtimeChannel.on('broadcast', { event }, (payload) => {
        console.log(`Received ${event} broadcast:`, payload);
        onMessage(payload);
        if (refreshCallback) {
          refreshCallback();
        }
      });
    });

    // Subscribe and track connection status
    realtimeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        console.log(`✅ Connected to real-time channel: ${channel}`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setIsConnected(false);
        console.error(`❌ Connection error on channel: ${channel}`);
      }
    });

    channelRef.current = realtimeChannel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channel]);

  // Function to broadcast a message
  const broadcast = async (event: string, payload: any) => {
    if (channelRef.current) {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
      console.log(`📡 Broadcast sent (${event}):`, result);
      return result;
    }
  };

  return { isConnected, broadcast };
};

/**
 * Hook for notification-based real-time updates
 * Sends browser notifications when data changes
 */
export const useRealtimeNotifications = (
  refreshCallback: () => Promise<void>,
  notificationConfig: {
    title: string;
    getMessage: (data: any) => string;
    interval?: number;
  }
) => {
  const [prevData, setPrevData] = useState<any>(null);
  const { title, getMessage, interval = 10000 } = notificationConfig;

  const { isConnected } = useRealtime(async () => {
    const newData = await refreshCallback();
    
    // Compare with previous data to detect changes
    if (prevData && newData && JSON.stringify(prevData) !== JSON.stringify(newData)) {
      // Show notification if data changed
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: getMessage(newData),
          icon: '/icon.png',
          badge: '/badge.png',
        });
      }
    }
    
    setPrevData(newData);
  }, { interval });

  return { isConnected };
};
