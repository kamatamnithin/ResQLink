// Push Notification Service
export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.permission = Notification.permission;
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  async sendNotification(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    const notification = new Notification(title, {
      icon: '/icon.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  }

  // Emergency notifications
  sendEmergencyAlert(message: string, priority: 'critical' | 'urgent' | 'standard' = 'urgent') {
    const priorityConfig = {
      critical: {
        tag: 'emergency-critical',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        badge: '🚨',
      },
      urgent: {
        tag: 'emergency-urgent',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        badge: '⚠️',
      },
      standard: {
        tag: 'emergency-standard',
        requireInteraction: false,
        vibrate: [200],
        badge: 'ℹ️',
      },
    };

    return this.sendNotification('ResQLink Emergency Alert', {
      body: message,
      ...priorityConfig[priority],
    });
  }

  // Status update notifications
  sendStatusUpdate(status: string, details: string) {
    return this.sendNotification(`Emergency Status: ${status}`, {
      body: details,
      tag: 'status-update',
      icon: '/icon.png',
    });
  }

  // Ambulance arrival notifications
  sendArrivalNotification(eta: number) {
    return this.sendNotification('Ambulance Approaching! 🚑', {
      body: `Your ambulance will arrive in approximately ${eta} minutes`,
      tag: 'arrival-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    });
  }

  // Assignment notifications for ambulance drivers
  sendAssignmentNotification(patientName: string, distance: string) {
    return this.sendNotification('New Emergency Assignment! 🚨', {
      body: `Emergency from ${patientName} - Distance: ${distance}`,
      tag: 'assignment-notification',
      requireInteraction: true,
      vibrate: [300, 100, 300],
    });
  }

  // Confirmation request notifications
  sendConfirmationRequest(type: 'arrival' | 'completion') {
    const messages = {
      arrival: {
        title: '🚑 Ambulance Has Arrived!',
        body: 'Please confirm that the ambulance has reached you. Tap to verify.',
      },
      completion: {
        title: '🏥 Safe at Hospital!',
        body: 'Please confirm you have been safely delivered to the hospital.',
      },
    };

    return this.sendNotification(messages[type].title, {
      body: messages[type].body,
      tag: `confirmation-${type}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200, 100, 200],
    });
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }
}

export const notificationService = NotificationService.getInstance();