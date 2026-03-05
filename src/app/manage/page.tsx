'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import BottomNav from '@/components/layout/bottom-nav';
import ManageView from '@/components/manage/manage-view';
import type { View as AppView } from '@/app/page';
import { AutoOffDialog } from '@/components/manage/auto-off-dialog';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collectionGroup, getDocs, writeBatch, query, collection, WriteBatch } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import { LoaderCircle } from 'lucide-react';

export default function ManagePage() {
  const router = useRouter();
  const [isLiveOn, setIsLiveOn] = useState(true);
  const [isAutoOffDialogOpen, setIsAutoOffDialogOpen] = useState(false);
  const [autoOffDate, setAutoOffDate] = useState<Date | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // New state for clear history feature
  const [isClearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();


  // Initialize state from localStorage
  useEffect(() => {
    const storedStatus = localStorage.getItem('liveStatus');
    setIsLiveOn(storedStatus !== 'off');

    const storedAutoOff = localStorage.getItem('autoOffDate');
    if (storedAutoOff) {
      setAutoOffDate(new Date(storedAutoOff));
    }
  }, []);
  
  const handleSetLiveStatus = useCallback((isOn: boolean) => {
    localStorage.setItem('liveStatus', isOn ? 'on' : 'off');
    // The browser's 'storage' event will notify other tabs automatically.
    setIsLiveOn(isOn);
  }, []);

  const handleSaveAutoOff = useCallback((date: Date | null) => {
    if (date) {
      localStorage.setItem('autoOffDate', date.toISOString());
    } else {
      localStorage.removeItem('autoOffDate');
    }
    setAutoOffDate(date);
  }, []);

  // Effect to check for auto-off
  useEffect(() => {
    if (!autoOffDate) return;

    const interval = setInterval(() => {
      if (new Date() >= autoOffDate) {
        handleSetLiveStatus(false);
        handleSaveAutoOff(null); // Clear the schedule
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [autoOffDate, handleSaveAutoOff, handleSetLiveStatus]);

  const handleNavRedirect = (view: AppView) => {
    router.push('/');
  };

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsAutoOffDialogOpen(true);
    }, 500); // 500ms for a long press
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const liveToggleHandlers = {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
  };

  const handleClearHistory = async () => {
    if (!firestore) return;
    
    setIsActionLoading(true);
    setClearHistoryDialogOpen(false);

    try {
        const clientsRef = collection(firestore, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const paymentsQuery = query(collectionGroup(firestore, 'payments'));
        const paymentsSnapshot = await getDocs(paymentsQuery);

        if (paymentsSnapshot.empty) {
            toast({ title: 'No History Found', description: 'There is no payment history to clear.' });
            setIsActionLoading(false);
            return;
        }
        
        // Firestore batches have a 500 operation limit.
        const batches: WriteBatch[] = [];
        let currentBatch = writeBatch(firestore);
        let operationCount = 0;

        const commitBatch = () => {
            batches.push(currentBatch);
            currentBatch = writeBatch(firestore);
            operationCount = 0;
        };

        // Delete all payments
        paymentsSnapshot.forEach((doc) => {
            currentBatch.delete(doc.ref);
            operationCount++;
            if (operationCount >= 499) commitBatch();
        });

        // Reset all clients
        clientsSnapshot.forEach((clientDoc) => {
            const clientData = clientDoc.data() as Client;
            // Only update if they have some payment data
            if (clientData.totalPaid > 0) {
                currentBatch.update(clientDoc.ref, {
                    totalPaid: 0,
                    paymentStatus: 'pending',
                    subscriptionStartDate: clientData.createdAt,
                    subscriptionEndDate: clientData.createdAt,
                });
                operationCount++;
                if (operationCount >= 499) commitBatch();
            }
        });

        if (operationCount > 0) {
            batches.push(currentBatch);
        }

        await Promise.all(batches.map(batch => batch.commit()));

        toast({ title: 'Success', description: 'All payment history has been cleared and clients have been reset.' });

    } catch (error) {
        console.error("Error clearing history:", error);
        toast({ title: 'Error', description: 'Could not clear payment history.', variant: 'destructive' });
    } finally {
        setIsActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={null as any} setActiveView={handleNavRedirect} />
      <div className="md:pl-60">
        <Header
          isLiveOn={isLiveOn}
          setIsLiveOn={handleSetLiveStatus}
          showLiveToggle={true}
          liveToggleHandlers={liveToggleHandlers}
          showClearHistoryButton={true}
          onClearHistoryClick={() => setClearHistoryDialogOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <ManageView />
            {autoOffDate && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Live will turn off automatically on: {format(autoOffDate, 'PPP p')}
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNav activeView={null as any} setActiveView={handleNavRedirect} />
      <AutoOffDialog
        isOpen={isAutoOffDialogOpen}
        setIsOpen={setIsAutoOffDialogOpen}
        onSave={handleSaveAutoOff}
        currentAutoOffDate={autoOffDate}
      />
       <AlertDialog open={isClearHistoryDialogOpen} onOpenChange={setClearHistoryDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all payment history for all clients and reset their subscription status.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory} disabled={isActionLoading}>
                    {isActionLoading ? <LoaderCircle className="animate-spin" /> : 'Continue'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
