'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, writeBatch, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Trash, Undo } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

type RecycleBinProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export function RecycleBinView({ isOpen, setIsOpen }: RecycleBinProps) {
    const [deletedClients, setDeletedClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore || !isOpen) return;

        setLoading(true);
        const q = query(collection(firestore, 'clients'), where('deleted', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
            
            clientsData.sort((a, b) => {
                if (a.deletedAt && b.deletedAt) {
                    return b.deletedAt.toMillis() - a.deletedAt.toMillis();
                }
                return 0;
            });

            setDeletedClients(clientsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching deleted clients: ", error);
            toast({ title: 'Error', description: 'Could not fetch deleted clients.', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, isOpen, toast]);

    const handleRestore = (clientId: string) => {
        if (!firestore) return;
        setActionLoading(`restore-${clientId}`);
        const clientRef = doc(firestore, 'clients', clientId);

        updateDoc(clientRef, {
            deleted: false,
            deletedAt: null,
        })
        .then(() => {
            toast({ title: 'Success', description: 'Client has been restored.' });
        })
        .catch((error) => {
            console.error("Error restoring client: ", error);
            toast({ title: 'Error', description: 'Could not restore client.', variant: 'destructive' });
        })
        .finally(() => {
            setActionLoading(null);
        });
    };

    const handlePermanentDelete = (clientId: string) => {
        if (!firestore) return;
        setActionLoading(`delete-${clientId}`);
        
        const clientRef = doc(firestore, 'clients', clientId);
        const paymentsRef = collection(firestore, 'clients', clientId, 'payments');

        getDocs(paymentsRef)
            .then(paymentsSnapshot => {
                const batch = writeBatch(firestore);
                paymentsSnapshot.forEach(paymentDoc => {
                    batch.delete(paymentDoc.ref);
                });
                batch.delete(clientRef);
                return batch.commit();
            })
            .then(() => {
                toast({ title: 'Success', description: 'Client permanently deleted.' });
            })
            .catch(error => {
                console.error("Error permanently deleting client: ", error);
                toast({ title: 'Error', description: 'Could not permanently delete client.', variant: 'destructive' });
            })
            .finally(() => {
                setActionLoading(null);
            });
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-full sm:max-w-lg flex flex-col">
                <SheetHeader>
                    <SheetTitle>Recycle Bin</SheetTitle>
                    <SheetDescription>
                        Here you can find clients that have been deleted. You can restore them or delete them permanently.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <LoaderCircle className="animate-spin" />
                        </div>
                    ) : deletedClients.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                            <p>Recycle bin is empty.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {deletedClients.map(client => (
                                    <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground">
                                        <div>
                                            <p className="font-semibold">{client.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Deleted {client.deletedAt ? formatDistanceToNow(client.deletedAt.toDate(), { addSuffix: true }) : 'a while ago'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRestore(client.id)}
                                                disabled={actionLoading === `restore-${client.id}`}
                                            >
                                                {actionLoading === `restore-${client.id}` ? <LoaderCircle className="animate-spin h-4 w-4" /> : <Undo className="h-4 w-4" />}
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        disabled={actionLoading === `delete-${client.id}`}
                                                    >
                                                        {actionLoading === `delete-${client.id}` ? <LoaderCircle className="animate-spin h-4 w-4" /> : <Trash className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the client and all their associated data, including payment history.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => handlePermanentDelete(client.id)}
                                                            disabled={actionLoading === `delete-${client.id}`}
                                                        >
                                                            {actionLoading === `delete-${client.id}` ? 'Deleting...' : 'Delete'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
                <SheetFooter className="mt-auto pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full">
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
