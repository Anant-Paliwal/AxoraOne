import { Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

export const InstallButton = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  if (isInstalled) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Check className="w-4 h-4" />
        App Installed
      </Button>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      onClick={installApp}
      variant="outline"
      size="sm"
      className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:opacity-90"
    >
      <Download className="w-4 h-4" />
      Install App
    </Button>
  );
};
