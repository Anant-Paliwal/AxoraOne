import { useState, useEffect, useCallback } from 'react';
import { notificationManager, scheduleTaskNotifications } from '@/lib/notifications';
import { api } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useBrowserNotifications() {
  const { currentWorkspace } = useWorkspace();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');
  const [settings, setSettings] = useState<any>(null);

  // Check permission state
  useEffect(() => {
    const state = notificationManager.getPermissionState();
    setPermissionGranted(state.granted);
    if (state.granted) setPermissionState('granted');
    else if (state.denied) setPermissionState('denied');
    else setPermissionState('default');
  }, []);

  // Load user notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await api.getUserSettings();
        setSettings(userSettings);
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    const granted = await notificationManager.requestPermission();
    setPermissionGranted(granted);
    setPermissionState(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  // Check tasks and send notifications
  const checkTaskNotifications = useCallback(async () => {
    if (!permissionGranted || !settings?.task_reminders || !currentWorkspace) return;

    try {
      const tasks = await api.getTasks(currentWorkspace.id);
      await scheduleTaskNotifications(tasks);
    } catch (error) {
      console.error('Failed to check task notifications:', error);
    }
  }, [permissionGranted, settings, currentWorkspace]);

  // Set up periodic task checking (every 30 minutes)
  useEffect(() => {
    if (!permissionGranted || !settings?.task_reminders) return;

    checkTaskNotifications();
    const interval = setInterval(checkTaskNotifications, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [permissionGranted, settings, checkTaskNotifications]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    await notificationManager.notify(
      '🔔 Test Notification',
      'Notifications are working! You\'ll receive updates based on your settings.'
    );
    return true;
  }, [permissionGranted, requestPermission]);

  return {
    permissionGranted,
    permissionState,
    requestPermission,
    sendTestNotification,
    checkTaskNotifications,
    isSupported: notificationManager.isSupported()
  };
}
