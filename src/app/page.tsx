'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import BottomNav from '@/components/layout/bottom-nav';
import Sidebar from '@/components/layout/sidebar';
import DashboardView from '@/components/dashboard/dashboard-view';
import PaymentsView from '@/components/clients/clients-view';
import HistoryView from '@/components/admins/admins-view';
import SettingsView from '@/components/settings/settings-view';
import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export type View = 'dashboard' | 'payments' | 'history' | 'settings';
export type Market = 'INDIAN' | 'FOREX' | 'BROKER';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [redirectToMarket, setRedirectToMarket] = useState<Market | null>(null);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isLiveOn, setIsLiveOn] = useState(true);

  // Initialize and synchronize state from localStorage
  useEffect(() => {
    const syncLiveStatus = () => {
      const storedStatus = localStorage.getItem('liveStatus');
      setIsLiveOn(storedStatus !== 'off');
    };

    // Sync on initial mount
    syncLiveStatus();

    // Add listeners for cross-tab changes and window focus
    window.addEventListener('storage', syncLiveStatus);
    window.addEventListener('focus', syncLiveStatus);

    // Cleanup listeners
    return () => {
      window.removeEventListener('storage', syncLiveStatus);
      window.removeEventListener('focus', syncLiveStatus);
    };
  }, []); // Only runs once on mount to set up listeners

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'payments':
        return <PaymentsView redirectToMarket={redirectToMarket} setRedirectToMarket={setRedirectToMarket} />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  const handleClientCreate = () => {
    setIsClientFormOpen(false);
  };

  if (!isLiveOn) {
    const whatsappUrl = `https://wa.me/919745275297?text=${encodeURIComponent('validity expired')}`;
    return (
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-background">
            <p className="text-2xl font-bold text-destructive">validity expired</p>
            <Button asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2 h-5 w-5" />
                Contact on WhatsApp
              </a>
            </Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="md:pl-60">
        <Header 
          onAddMemberClick={() => setIsClientFormOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
             {renderView()}
            </div>
        </main>
      </div>
      <BottomNav activeView={activeView} setActiveView={setActiveView} />
      <ClientForm
        isOpen={isClientFormOpen}
        setIsOpen={setIsClientFormOpen}
        client={null}
        onSave={handleClientCreate}
      />
    </div>
  );
}
