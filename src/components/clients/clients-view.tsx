
'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, serverTimestamp, where, updateDoc, orderBy } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Client, Payment } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Search, LoaderCircle, Trash2, MessageSquare, MoreVertical, View, History, Edit, DollarSign } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { WhatsappDialog } from './whatsapp-dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Market } from '@/app/page';
import { ClientForm } from './client-form';
import { RenewSubscriptionForm } from './renew-subscription-form';

type ClientDialogState = {
  open: boolean;
  client: Client | null;
};

export const ClientDetailSheet = ({ client, open, onOpenChange, onShowHistory, onEdit, onRenew }: { 
    client: Client | null, 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    onShowHistory: (client: Client) => void, 
    onEdit: (client: Client) => void,
    onRenew: (client: Client) => void
}) => {
    if (!client) return null;

    const daysRemaining = differenceInDays(client.subscriptionEndDate.toDate(), new Date());

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-auto max-h-[90dvh] rounded-t-lg">
                <SheetHeader>
                    <SheetTitle>{client.name}</SheetTitle>
                    <SheetDescription>{client.phone} - {client.market}</SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="font-semibold">Fee:</p> <p>₹{client.fee}</p></div>
                        <div><p className="font-semibold">Status:</p> <p><Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge></p></div>
                        <div><p className="font-semibold">Subscription End:</p> <p>{format(client.subscriptionEndDate.toDate(), 'PPP')}</p></div>
                        <div><p className="font-semibold">Days Remaining:</p> <p>{daysRemaining > 0 ? daysRemaining : 'Expired'}</p></div>
                    </div>
                    <div className="space-y-2">
                        <Button variant="default" className="w-full" onClick={() => onRenew(client)}>
                            <DollarSign className="mr-2 h-4 w-4" /> Renew Subscription
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" className="w-full" onClick={() => onShowHistory(client)}>
                                <History className="mr-2 h-4 w-4" /> View History
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => onEdit(client)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Client
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};


export default function PaymentsView({ redirectToMarket, setRedirectToMarket }: { redirectToMarket: Market | null, setRedirectToMarket: (market: Market | null) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [whatsappDialogState, setWhatsappDialogState] = useState<ClientDialogState>({ open: false, client: null });
  const [detailSheetState, setDetailSheetState] = useState<ClientDialogState>({ open: false, client: null });
  const [historySheetState, setHistorySheetState] = useState<ClientDialogState>({ open: false, client: null });
  const [editClientState, setEditClientState] = useState<ClientDialogState>({ open: false, client: null });
  const [renewClientState, setRenewClientState] = useState<ClientDialogState>({ open: false, client: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Market | 'ALL'>('INDIAN');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (redirectToMarket) {
      setActiveTab(redirectToMarket);
      setRedirectToMarket(null); // Reset after redirecting
    }
  }, [redirectToMarket, setRedirectToMarket]);

  useEffect(() => {
    if (!firestore || !user) {
        setLoading(false);
        return;
    };
    setLoading(true);
    const q = query(collection(firestore, 'users', user.uid, 'clients'), where('deleted', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      clientsData.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setClients(clientsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching clients: ", error);
      toast({ title: 'Error', description: 'Could not fetch clients.', variant: 'destructive' });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firestore, user, toast]);
  
  const handleSoftDelete = async (clientId: string) => {
    if (!firestore || !user) return;
    setActionLoading(clientId);
    const clientRef = doc(firestore, 'users', user.uid, 'clients', clientId);
    
    try {
        await updateDoc(clientRef, {
            deleted: true,
            deletedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Client moved to Recycle Bin.' });
    } catch (error) {
        console.error("Error soft deleting client:", error);
        toast({
            title: 'Error',
            description: 'Could not move client to recycle bin.',
            variant: 'destructive',
        });
    } finally {
        setActionLoading(null);
    }
  };
  
  const showHistory = (client: Client) => {
    setDetailSheetState({ open: false, client: null });
    setHistorySheetState({ open: true, client });
  };

  const showEditForm = (client: Client) => {
    setDetailSheetState({ open: false, client: null });
    setEditClientState({ open: true, client });
  };

  const showRenewForm = (client: Client) => {
    setDetailSheetState({ open: false, client: null });
    setRenewClientState({ open: true, client });
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      (client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)) &&
      (activeTab === 'ALL' || client.market === activeTab)
    );
  }, [clients, searchTerm, activeTab]);

  const renderClientCards = (list: Client[]) => {
    if (loading) return <div className="flex justify-center mt-8"><LoaderCircle className="animate-spin h-8 w-8 text-primary" /></div>;
    if (list.length === 0) return <p className="text-center text-muted-foreground mt-8">No clients found in this market.</p>;

    return (
      <div className="grid gap-4 mt-4 md:grid-cols-2">
        {list.map(client => (
          <Card key={client.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
            <CardHeader onClick={() => setDetailSheetState({ open: true, client })} className="cursor-pointer">
              <CardTitle className="flex justify-between items-start">
                <span>{client.name}</span>
                <Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge>
              </CardTitle>
              <CardDescription>Expires: {format(client.subscriptionEndDate.toDate(), 'PPP')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={() => setWhatsappDialogState({ open: true, client })}>
                    <MessageSquare className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailSheetState({ open: true, client })}>
                            <View className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => showRenewForm(client)}>
                            <DollarSign className="mr-2 h-4 w-4" /> Renew
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => showEditForm(client)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Move to Recycle Bin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will move the client to the recycle bin. You can recover them from there later.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSoftDelete(client.id)} disabled={actionLoading === client.id}>
                                  {actionLoading === client.id ? <LoaderCircle className="animate-spin" /> : 'Continue'}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  const renderClientTable = (list: Client[]) => {
     if (loading) return <div className="flex justify-center mt-8"><LoaderCircle className="animate-spin h-8 w-8 text-primary" /></div>;
    if (list.length === 0) return <p className="text-center text-muted-foreground mt-8">No clients found in this market.</p>;

    return (
        <Card className="mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Market</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map(client => (
                        <TableRow key={client.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium cursor-pointer" onClick={() => setDetailSheetState({ open: true, client })}>{client.name}</TableCell>
                            <TableCell>{client.market}</TableCell>
                            <TableCell>{format(client.subscriptionEndDate.toDate(), 'PPP')}</TableCell>
                            <TableCell><Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge></TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => setWhatsappDialogState({ open: true, client })}>
                                    <MessageSquare className="h-5 w-5" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setDetailSheetState({ open: true, client })}>
                                            <View className="mr-2 h-4 w-4" /> View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => showRenewForm(client)}>
                                            <DollarSign className="mr-2 h-4 w-4" /> Renew
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => showEditForm(client)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Move to Recycle Bin?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will move the client to the recycle bin. You can recover them from there later.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleSoftDelete(client.id)} disabled={actionLoading === client.id}>
                                                  {actionLoading === client.id ? <LoaderCircle className="animate-spin" /> : 'Continue'}
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Payments</h2>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Tabs value={activeTab as string} onValueChange={(value) => setActiveTab(value as Market)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="INDIAN">Indian</TabsTrigger>
          <TabsTrigger value="FOREX">Forex</TabsTrigger>
          <TabsTrigger value="BROKER">Broker</TabsTrigger>
        </TabsList>
        <div className="lg:hidden">
            <TabsContent value="INDIAN">{renderClientCards(filteredClients)}</TabsContent>
            <TabsContent value="FOREX">{renderClientCards(filteredClients)}</TabsContent>
            <TabsContent value="BROKER">{renderClientCards(filteredClients)}</TabsContent>
        </div>
         <div className="hidden lg:block">
            <TabsContent value="INDIAN">{renderClientTable(filteredClients)}</TabsContent>
            <TabsContent value="FOREX">{renderClientTable(filteredClients)}</TabsContent>
            <TabsContent value="BROKER">{renderClientTable(filteredClients)}</TabsContent>
        </div>
      </Tabs>
      
      {whatsappDialogState.client && (
        <WhatsappDialog
          isOpen={whatsappDialogState.open}
          setIsOpen={(open) => setWhatsappDialogState({ open, client: open ? whatsappDialogState.client : null })}
          client={whatsappDialogState.client}
        />
      )}
      
      <ClientDetailSheet 
        client={detailSheetState.client}
        open={detailSheetState.open}
        onOpenChange={(open) => setDetailSheetState({ open, client: open ? detailSheetState.client : null })}
        onShowHistory={showHistory}
        onEdit={showEditForm}
        onRenew={showRenewForm}
      />
      
      {historySheetState.client && <HistorySheet client={historySheetState.client} open={historySheetState.open} onOpenChange={(open) => setHistorySheetState({ open, client: open ? historySheetState.client : null })} />}

      <ClientForm isOpen={editClientState.open} setIsOpen={(open) => setEditClientState({ open, client: open ? editClientState.client : null })} client={editClientState.client} />

      {renewClientState.client && (
          <RenewSubscriptionForm
            isOpen={renewClientState.open}
            setIsOpen={(open) => setRenewClientState({ open, client: open ? renewClientState.client : null })}
            client={renewClientState.client}
          />
      )}
    </>
  );
}

export const HistorySheet = ({ client, open, onOpenChange }: { client: Client | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    useEffect(() => {
        if (!client || !firestore || !user) return;
        setLoading(true);
        const paymentsQuery = query(collection(firestore, 'users', user.uid, 'clients', client.id, 'payments'), orderBy('paymentDate', 'desc'));

        const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(paymentsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching payments: ", error);
            setLoading(false);
            toast({ title: 'Error', description: 'Could not fetch payments.', variant: 'destructive' });
        });

        return () => unsubscribe();
    }, [client, firestore, user, toast]);

    if (!client) return null;

    const daysRemaining = differenceInDays(client.subscriptionEndDate.toDate(), new Date());

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-4/5 lg:h-3/5 rounded-t-lg">
                <SheetHeader>
                    <SheetTitle>{client.name}'s History</SheetTitle>
                    <SheetDescription>View payment history and subscription summary.</SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 text-sm">
                    <Card>
                        <CardHeader><CardTitle>Subscription Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <p><strong>Total Paid:</strong> ₹{client.totalPaid.toLocaleString()}</p>
                            <p><strong>Days Remaining:</strong> {daysRemaining > 0 ? daysRemaining : 0}</p>
                            <p><strong>Status:</strong> <Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge></p>
                            <p><strong>Expiry:</strong> {format(client.subscriptionEndDate.toDate(), 'PPP')}</p>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                        <CardContent>
                            {loading ? <div className="flex justify-center"><LoaderCircle className="animate-spin" /></div> : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Validity</TableHead>
                                            <TableHead>Period</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{format(p.paymentDate.toDate(), 'PPP')}</TableCell>
                                                <TableCell>₹{p.amount}</TableCell>
                                                <TableCell>{p.validityDays} days</TableCell>
                                                <TableCell>{format(p.startDate.toDate(), 'P')} - {format(p.endDate.toDate(), 'P')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    );
};
