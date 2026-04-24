import { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { toast } from 'sonner';

export function NotificationPermissionButton() {
  const { 
    permissionGranted, 
    permissionState, 
    requestPermission, 
    sendTestNotification,
    isSupported 
  } = useBrowserNotifications();

  const [requesting, setRequesting] = useState(false);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="w-4 h-4" />
        <span>Browser notifications are not supported on this device</span>
      </div>
    );
  }

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Notifications enabled! Sending test notification...');
        setTimeout(() => sendTestNotification(), 1000);
      } else {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
      }
    } catch (error) {
      toast.error('Failed to request notification permission');
    } finally {
      setRequesting(false);
    }
  };

  const handleTest = async () => {
    const success = await sendTestNotification();
    if (success) {
      toast.success('Test notification sent!');
    }
  };

  if (permissionState === 'granted') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Check className="w-4 h-4" />
          <span className="font-medium">Notifications Enabled</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleTest}
        >
          <Bell className="w-4 h-4 mr-2" />
          Send Test
        </Button>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="w-4 h-4" />
          <span className="font-medium">Notifications Blocked</span>
        </div>
        <p className="text-xs text-muted-foreground">
          You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
        </p>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleRequest}
      disabled={requesting}
      className="gap-2"
    >
      <Bell className="w-4 h-4" />
      {requesting ? 'Requesting...' : 'Enable Notifications'}
    </Button>
  );
}
