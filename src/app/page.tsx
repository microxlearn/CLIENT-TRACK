'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

import Header from '@/components/layout/header';
import BottomNav from '@/components/layout/bottom-nav';
import Sidebar from '@/components/layout/sidebar';
import DashboardView from '@/components/dashboard/dashboard-view';
import PaymentsView from '@/components/clients/clients-view';
import SettingsView from '@/components/settings/settings-view';
import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import FullScreenLoader from '@/components/layout/full-screen-loader';

export type View = 'dashboard' | 'payments' | 'settings';
export type Market = 'INDIAN' | 'FOREX' | 'BROKER';

function HomePageContent() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [redirectToMarket, setRedirectToMarket] = useState<Market | null>(null);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Auth Guard and Admin Redirect
  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (userProfile?.isAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);


  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'payments':
        return <PaymentsView redirectToMarket={redirectToMarket} setRedirectToMarket={setRedirectToMarket} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  const handleClientCreate = () => {
    setIsClientFormOpen(false);
  };

  if (isUserLoading || !user || isProfileLoading || userProfile?.isAdmin) {
    return <FullScreenLoader />;
  }

  if (userProfile && userProfile.isLive === false) {
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
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
      />
      <div className="md:pl-60">
        <Header 
          onAddMemberClick={() => setIsClientFormOpen(true)}
          showSignOutButton={activeView === 'settings'}
        />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
             {renderView()}
            </div>
        </main>
      </div>
      <BottomNav 
        activeView={activeView} 
        setActiveView={setActiveView} 
      />
      <ClientForm
        isOpen={isClientFormOpen}
        setIsOpen={setIsClientFormOpen}
        client={null}
        onSave={handleClientCreate}
      />
    </div>
  );
}


export default function Home() {
  // useSearchParams requires a Suspense boundary.
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <HomePageContent />
    </Suspense>
  );
}
