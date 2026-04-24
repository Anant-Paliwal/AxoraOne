import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Globe, 
  Lock, 
  Copy, 
  Check, 
  Eye, 
  Edit, 
  MessageSquare,
  Users,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SharePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  pageTitle: string;
  isPublic: boolean;
  onTogglePublic: (isPublic: boolean) => void;
}

type Permission = 'view' | 'edit' | 'comment';

export function SharePageDialog({
  open,
  onOpenChange,
  pageId,
  pageTitle,
  isPublic,
  onTogglePublic
}: SharePageDialogProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission>('view');
  
  const publicUrl = `${window.location.origin}/public/page/${pageId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = (checked: boolean) => {
    onTogglePublic(checked);
  };

  const permissions = [
    {
      value: 'view' as Permission,
      icon: Eye,
      label: 'Can view',
      description: 'Anyone with the link can view'
    },
    {
      value: 'edit' as Permission,
      icon: Edit,
      label: 'Can edit',
      description: 'Anyone with the link can edit'
    },
    {
      value: 'comment' as Permission,
      icon: MessageSquare,
      label: 'Can comment',
      description: 'Anyone with the link can comment'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share "{pageTitle}"
          </DialogTitle>
          <DialogDescription>
            Share this page with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public Access Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm">
                    {isPublic ? 'Public access' : 'Private'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isPublic ? 'Anyone with the link can access' : 'Only you can access'}
                  </div>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
              />
            </div>

            {/* Public Link Section */}
            {isPublic && (
              <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LinkIcon className="w-4 h-4" />
                  <span>Public link</span>
                </div>
                
                {/* Link Input with Copy Button */}
                <div className="flex gap-2">
                  <Input
                    value={publicUrl}
                    readOnly
                    className="flex-1 text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                {/* Permission Options */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Link access level
                  </Label>
                  <div className="space-y-2">
                    {permissions.map((permission) => {
                      const Icon = permission.icon;
                      const isSelected = selectedPermission === permission.value;
                      
                      return (
                        <button
                          key={permission.value}
                          onClick={() => setSelectedPermission(permission.value)}
                          className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30 hover:bg-secondary/30"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary/10" : "bg-secondary"
                          )}>
                            <Icon className={cn(
                              "w-4 h-4",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-medium text-sm",
                              isSelected ? "text-primary" : "text-foreground"
                            )}>
                              {permission.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {permission.description}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Note */}
                <div className="text-xs text-muted-foreground bg-background p-3 rounded-lg">
                  <strong>Note:</strong> Currently only "Can view" is supported. Edit and comment permissions are coming soon!
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            {isPublic && (
              <Button
                onClick={handleCopyLink}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
