import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface LimitWarningProps {
  metric: string;
  metricLabel?: string;
  showProgress?: boolean;
}

/**
 * Display warning when approaching or exceeding subscription limits
 * 
 * Shows:
 * - Warning at 80% usage
 * - Error at 100% usage
 * - Progress bar (optional)
 * - Upgrade button
 */
export function LimitWarning({ 
  metric, 
  metricLabel,
  showProgress = true 
}: LimitWarningProps) {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  
  const usage = subscription?.usage?.[metric];
  
  // Don't show if no usage data or unlimited plan
  if (!usage || usage.limit === -1 || usage.limit === 'unlimited') {
    return null;
  }
  
  const percentage = (usage.current / usage.limit) * 100;
  
  // Only show warning at 80% or above
  if (percentage < 80) {
    return null;
  }
  
  const isAtLimit = percentage >= 100;
  const label = metricLabel || metric.replace('max_', '').replace(/_/g, ' ');
  
  return (
    <Alert variant={isAtLimit ? "destructive" : "default"} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {isAtLimit ? 'Limit Reached' : 'Approaching Limit'}
        </span>
        <span className="text-sm font-normal">
          {usage.current} / {usage.limit}
        </span>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          You've used <strong>{usage.current}</strong> of <strong>{usage.limit}</strong> {label}.
          {isAtLimit && ' Upgrade your plan to continue.'}
        </p>
        
        {showProgress && (
          <Progress 
            value={Math.min(percentage, 100)} 
            className={isAtLimit ? 'bg-destructive/20' : 'bg-warning/20'}
          />
        )}
        
        <Button 
          onClick={() => navigate('/settings?tab=billing')}
          variant={isAtLimit ? "default" : "outline"}
          size="sm"
          className="w-full sm:w-auto"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {isAtLimit ? 'Upgrade Now' : 'View Plans'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact version for inline display
 */
export function LimitBadge({ metric }: { metric: string }) {
  const { subscription } = useSubscription();
  const usage = subscription?.usage?.[metric];
  
  if (!usage || usage.limit === -1) return null;
  
  const percentage = (usage.current / usage.limit) * 100;
  
  if (percentage < 80) return null;
  
  const isAtLimit = percentage >= 100;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isAtLimit 
        ? 'bg-destructive/10 text-destructive' 
        : 'bg-warning/10 text-warning'
    }`}>
      <AlertCircle className="w-3 h-3" />
      {usage.current}/{usage.limit}
    </div>
  );
}
