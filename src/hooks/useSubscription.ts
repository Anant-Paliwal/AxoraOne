import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SubscriptionStatus {
  subscription: any;
  plan: any;
  usage: Record<string, any>;
  status: string;
  billing_cycle: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await api.getCurrentSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has access to a feature (user-level)
   */
  const hasFeature = (featureName: string): boolean => {
    if (!subscription?.plan?.features?.features) return false;
    return subscription.plan.features.features[featureName] === true;
  };

  /**
   * Get current usage stats (user-level)
   */
  const getUsage = () => {
    return subscription?.usage || {};
  };

  /**
   * Check if on specific plan
   */
  const isPlan = (planName: string): boolean => {
    return subscription?.plan?.name === planName;
  };

  /**
   * Check if user can perform action (check limit)
   */
  const canPerform = (metricType: string): boolean => {
    const usage = subscription?.usage?.[metricType];
    if (!usage) return true; // No limit data, allow
    
    if (usage.limit === -1 || usage.limit === 'unlimited') return true;
    
    return usage.current < usage.limit;
  };

  /**
   * Get remaining count for a metric
   */
  const getRemaining = (metricType: string): number => {
    const usage = subscription?.usage?.[metricType];
    if (!usage) return 0;
    
    if (usage.limit === -1 || usage.limit === 'unlimited') return -1; // Unlimited
    
    return Math.max(0, usage.limit - usage.current);
  };

  return {
    subscription,
    loading,
    hasFeature,
    getUsage,
    isPlan,
    canPerform,
    getRemaining,
    refresh: loadSubscription
  };
}
