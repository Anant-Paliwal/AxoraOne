import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  currentLimit: number;
  planLimit: number;
  onClose?: () => void;
}

export function UpgradePrompt({ feature, currentLimit, planLimit, onClose }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            <CardTitle className="text-lg">Upgrade Required</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          You've reached your plan limit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2">
              You've used <strong>{currentLimit} of {planLimit}</strong> {feature}
            </p>
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro for unlimited {feature} and more features
            </p>
          </div>
          
          <Button 
            className="w-full"
            onClick={() => navigate('/subscription')}
          >
            View Plans
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpgradeDialog({ 
  open, 
  onClose, 
  feature, 
  description 
}: { 
  open: boolean; 
  onClose: () => void; 
  feature: string; 
  description: string;
}) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-yellow-600" />
            <CardTitle>Upgrade to Pro</CardTitle>
          </div>
          <CardDescription>
            Unlock {feature}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{description}</p>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Maybe Later
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                navigate('/subscription');
                onClose();
              }}
            >
              View Plans
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
