// Browser Push Notifications System

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

class NotificationManager {
  private static instance: NotificationManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.initializeServiceWorker();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        this.serviceWorkerRegistration = registration;
        console.log('Service Worker registered for notifications');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current permission state
  getPermissionState(): NotificationPermissionState {
    if (!this.isSupported()) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Show a notification
  async showNotification(options: PushNotificationOptions): Promise<void> {
    const permissionState = this.getPermissionState();
    
    if (!permissionState.granted) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if (this.serviceWorkerRegistration) {
        // Use service worker for better reliability
        await this.serviceWorkerRegistration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/axora-logo.png',
          badge: options.badge || '/axora-logo.png',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
          timestamp: options.timestamp || Date.now(),
          vibrate: [200, 100, 200]
        });
      } else {
        // Fallback to basic notification
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/axora-logo.png',
          tag: options.tag,
          data: options.data
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Task reminder notification
  async notifyTaskReminder(task: { id: string; title: string; due_date?: string }) {
    await this.showNotification({
      title: '⏰ Task Reminder',
      body: `"${task.title}" is due soon!`,
      tag: `task-${task.id}`,
      data: { type: 'task', taskId: task.id },
      requireInteraction: true
    });
  }

  // Task overdue notification
  async notifyTaskOverdue(task: { id: string; title: string }) {
    await this.showNotification({
      title: '🚨 Task Overdue',
      body: `"${task.title}" is overdue!`,
      tag: `task-overdue-${task.id}`,
      data: { type: 'task', taskId: task.id },
      requireInteraction: true
    });
  }

  // Skill level up notification
  async notifySkillLevelUp(skill: { id: string; name: string; level: string }) {
    await this.showNotification({
      title: '🎉 Skill Level Up!',
      body: `Your "${skill.name}" skill reached ${skill.level}!`,
      tag: `skill-${skill.id}`,
      data: { type: 'skill', skillId: skill.id }
    });
  }

  // Mention notification
  async notifyMention(mention: { id: string; userName: string; context: string }) {
    await this.showNotification({
      title: '💬 New Mention',
      body: `${mention.userName} mentioned you: "${mention.context}"`,
      tag: `mention-${mention.id}`,
      data: { type: 'mention', mentionId: mention.id },
      requireInteraction: true
    });
  }

  // AI suggestion notification
  async notifyAISuggestion(suggestion: { title: string; description: string }) {
    await this.showNotification({
      title: '✨ AI Suggestion',
      body: suggestion.description,
      tag: 'ai-suggestion',
      data: { type: 'ai-suggestion' }
    });
  }

  // Weekly digest notification
  async notifyWeeklyDigest(stats: { tasksCompleted: number; skillsImproved: number }) {
    await this.showNotification({
      title: '📊 Weekly Digest',
      body: `This week: ${stats.tasksCompleted} tasks completed, ${stats.skillsImproved} skills improved!`,
      tag: 'weekly-digest',
      data: { type: 'weekly-digest' }
    });
  }

  // Generic notification
  async notify(title: string, body: string, data?: any) {
    await this.showNotification({
      title,
      body,
      data
    });
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

// Helper function to check and schedule task notifications
export async function scheduleTaskNotifications(tasks: any[]) {
  const now = new Date();
  
  for (const task of tasks) {
    if (!task.due_date || task.status === 'done') continue;
    
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Notify if task is due within 24 hours
    if (hoursUntilDue > 0 && hoursUntilDue <= 24) {
      await notificationManager.notifyTaskReminder(task);
    }
    
    // Notify if task is overdue
    if (hoursUntilDue < 0) {
      await notificationManager.notifyTaskOverdue(task);
    }
  }
}
