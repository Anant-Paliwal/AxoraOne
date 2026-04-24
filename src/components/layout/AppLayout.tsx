import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { SyncStatus } from '@/components/SyncStatus';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-auto md:overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto relative">
        {children}
        {/* Sync status indicator - bottom right corner */}
        <SyncStatus />
      </main>
    </div>
  );
}
