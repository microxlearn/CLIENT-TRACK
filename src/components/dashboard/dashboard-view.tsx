'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  orderBy,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/provider';
import type { Client, Payment } from '@/lib/types';
import KpiCard from './kpi-card';
import { Users, IndianRupee, Globe, AlertTriangle, CalendarClock, MessageSquare, ArrowLeft, History, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '../ui/skeleton';

// Re-using HistorySheet from clients-view for consistency
const HistorySheet = ({ client, open, onOpenChange }: { client: Client | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!client || !firestore) return;
        setLoading(true);
        const paymentsQuery = query(collection(firestore, 'clients', client.id, 'payments'), orderBy('paymentDate', 'desc'));

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
    }, [client, firestore, toast]);

    if (!client) return null;

    const daysRemaining = differenceInDays(client.subscriptionEndDate.toDate(), new Date());

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-4/5 lg:h-3/5 rounded-t-lg">
                <SheetHeader>
                    <SheetTitle>{client.name}'s History</SheetTitle>
                    <SheetDescription>View payment history and subscription summary.</SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 text-sm overflow-y-auto">
                    <Card>
                        <CardHeader><CardTitle>Subscription Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <p><strong>Total Paid:</strong> ₹{client.totalPaid.toLocaleString()}</p>
                            <p><strong>Days Remaining:</strong> {daysRemaining >= 0 ? daysRemaining : 'Expired'}</p>
                            <p><strong>Status:</strong> <Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge></p>
                            <p><strong>Expiry:</strong> {format(client.subscriptionEndDate.toDate(), 'PPP')}</p>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-20 w-full" /> : (
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


const ClientDetailSheet = ({ client, open, onOpenChange, onShowHistory, onWhatsappClick }: { client: Client | null, open: boolean, onOpenChange: (open: boolean) => void, onShowHistory: (client: Client) => void, onWhatsappClick: (client: Client) => void }) => {
    if (!client) return null;

    const daysRemaining = differenceInDays(client.subscriptionEndDate.toDate(), new Date());

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-auto max-h-[90dvh] rounded-t-lg md:max-w-md md:h-auto md:mx-auto">
                <SheetHeader>
                    <SheetTitle>{client.name}</SheetTitle>
                    <SheetDescription>{client.phone} - <Badge variant="outline">{client.market}</Badge></SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="font-semibold text-muted-foreground">Total Paid</p> <p>₹{client.totalPaid.toLocaleString()}</p></div>
                        <div><p className="font-semibold text-muted-foreground">Status</p> <p><Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge></p></div>
                        <div><p className="font-semibold text-muted-foreground">Subscription End</p> <p>{format(client.subscriptionEndDate.toDate(), 'PPP')}</p></div>
                        <div><p className="font-semibold text-muted-foreground">Days Remaining</p> <p>{daysRemaining >= 0 ? daysRemaining : 'Expired'}</p></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="default" className="w-full" onClick={() => onWhatsappClick(client)}>
                            <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => { onOpenChange(false); onShowHistory(client); }}>
                            <History className="mr-2 h-4 w-4" /> View History
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};


type FilterType = 'total' | 'indian' | 'forex' | 'broker' | 'pending' | 'expiring';

const ClientListView = ({
  clients,
  title,
  onBack,
  onClientClick,
  onWhatsappClick
} : {
  clients: Client[],
  title: string,
  onBack: () => void,
  onClientClick: (client: Client) => void,
  onWhatsappClick: (client: Client) => void
}) => {

  const renderClientCards = (list: Client[]) => {
    return (
      <div className="grid gap-4 mt-4 md:grid-cols-2">
        {list.map(client => (
          <Card key={client.id} className="flex flex-col shadow-sm">
            <CardHeader onClick={() => onClientClick(client)} className="cursor-pointer">
              <CardTitle className="flex justify-between items-start">
                <span>{client.name}</span>
                <Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge>
              </CardTitle>
              <CardDescription>
                <Badge variant="outline" className="mr-2">{client.market}</Badge>
                Expires: {format(client.subscriptionEndDate.toDate(), 'PPP')}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => onWhatsappClick(client)}>
                <MessageSquare className="h-5 w-5 text-green-500" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderClientTable = (list: Client[]) => {
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
                            <TableCell onClick={() => onClientClick(client)} className="font-medium cursor-pointer hover:underline">{client.name}</TableCell>
                            <TableCell><Badge variant="outline">{client.market}</Badge></TableCell>
                            <TableCell>{format(client.subscriptionEndDate.toDate(), 'PPP')}</TableCell>
                            <TableCell><Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge></TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => onWhatsappClick(client)}>
                                    <MessageSquare className="h-5 w-5 text-green-500" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
  }

  return (
    <div className="animate-in fade-in-50">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{title} ({clients.length})</h2>
      </div>

      {clients.length === 0 && <p className="text-center text-muted-foreground mt-8">No clients found for this filter.</p>}
      
      {clients.length > 0 && (
        <>
          <div className="md:hidden">
              {renderClientCards(clients)}
          </div>
           <div className="hidden md:block">
              {renderClientTable(clients)}
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClientList, setShowClientList] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'whatsapp_template') : null, [firestore]);
  const { data: settingsData } = useDoc(settingsRef);


  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'clients'), where('deleted', '==', false));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const clientsData: Client[] = [];
        querySnapshot.forEach((doc) => {
          clientsData.push({ id: doc.id, ...doc.data() } as Client);
        });
        setClients(clientsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching clients:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);
  
  const { kpis, pendingClientsList, expiringClientsList } = useMemo(() => {
    const totalClients = clients.length;
    const indianClients = clients.filter((c) => c.market === 'INDIAN').length;
    const forexClients = clients.filter((c) => c.market === 'FOREX').length;
    const brokerClients = clients.filter((c) => c.market === 'BROKER').length;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const pendingClients = clients.filter(
      (c) => c.paymentStatus === 'pending' || c.subscriptionEndDate.toDate() < today
    );

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringClients = clients.filter((c) => {
      const expiryDate = c.subscriptionEndDate.toDate();
      return (
        expiryDate >= today &&
        expiryDate <= threeDaysFromNow
      );
    });
    
    return {
      kpis: {
        totalClients,
        indianClients,
        forexClients,
        brokerClients,
        pendingPayments: pendingClients.length,
        expiringSoon: expiringClients.length
      },
      pendingClientsList: pendingClients,
      expiringClientsList: expiringClients
    };
  }, [clients]);

  const {filteredClients, filterTitle} = useMemo(() => {
    if (!activeFilter) return { filteredClients: [], filterTitle: '' };

    switch (activeFilter) {
      case 'total':
        return { filteredClients: clients, filterTitle: 'Total Clients' };
      case 'indian':
        return { filteredClients: clients.filter(c => c.market === 'INDIAN'), filterTitle: 'Indian Market Clients' };
      case 'forex':
        return { filteredClients: clients.filter(c => c.market === 'FOREX'), filterTitle: 'Forex Market Clients' };
      case 'broker':
        return { filteredClients: clients.filter(c => c.market === 'BROKER'), filterTitle: 'Broker Clients' };
      case 'pending':
        return { filteredClients: pendingClientsList, filterTitle: 'Pending Payments' };
      case 'expiring':
        return { filteredClients: expiringClientsList, filterTitle: 'Expiring Soon' };
      default:
        return { filteredClients: [], filterTitle: '' };
    }
  }, [activeFilter, clients, pendingClientsList, expiringClientsList]);

  const handleKpiClick = (filter: FilterType) => {
    setActiveFilter(filter);
    setShowClientList(true);
  }

  const handleBackToDashboard = () => {
    setShowClientList(false);
    setActiveFilter(null);
  }

  const handleWhatsappClick = (client: Client) => {
    const template = settingsData?.whatsappTemplate || "Hello {{name}}, your subscription is expiring on {{expiry_date}}.";
    const message = template
      .replace(/{{name}}/g, client.name)
      .replace(/{{market}}/g, client.market)
      .replace(/{{fee}}/g, client.fee.toString())
      .replace(/{{expiry_date}}/g, format(client.subscriptionEndDate.toDate(), 'PPP'));

    const encodedMessage = encodeURIComponent(message);
    const whatsAppNumber = client.phone.replace('+', '');
    window.open(`https://wa.me/${whatsAppNumber}?text=${encodedMessage}`, '_blank');
    
    toast({
      title: 'WhatsApp Ready',
      description: `Message for ${client.name} has been prepared.`,
      duration: 3000,
    });
  };

  if (loading) {
     return (
        <div>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Dashboard
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" /> )}
          </div>
           <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
           </div>
        </div>
     )
  }

  if (showClientList) {
    return (
      <>
        <ClientListView 
          clients={filteredClients}
          title={filterTitle}
          onBack={handleBackToDashboard}
          onClientClick={(client) => setDetailClient(client)}
          onWhatsappClick={handleWhatsappClick}
        />
        <ClientDetailSheet 
          client={detailClient} 
          open={!!detailClient} 
          onOpenChange={(open) => !open && setDetailClient(null)} 
          onShowHistory={(client) => { setDetailClient(null); setHistoryClient(client); }}
          onWhatsappClick={handleWhatsappClick}
        />
        <HistorySheet 
          client={historyClient}
          open={!!historyClient}
          onOpenChange={(open) => !open && setHistoryClient(null)}
        />
      </>
    )
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Dashboard
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="Total Clients"
          value={kpis.totalClients}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          isLoading={loading}
          onClick={() => handleKpiClick('total')}
        />
        <KpiCard
          title="Indian Clients"
          value={kpis.indianClients}
          icon={<IndianRupee className="h-5 w-5 text-muted-foreground" />}
          isLoading={loading}
          onClick={() => handleKpiClick('indian')}
        />
        <KpiCard
          title="Forex Clients"
          value={kpis.forexClients}
          icon={<Globe className="h-5 w-5 text-muted-foreground" />}
          isLoading={loading}
          onClick={() => handleKpiClick('forex')}
        />
        <KpiCard
          title="Broker Clients"
          value={kpis.brokerClients}
          icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
          isLoading={loading}
          onClick={() => handleKpiClick('broker')}
        />
        <KpiCard
          title="Pending Payments"
          value={kpis.pendingPayments}
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          isLoading={loading}
          onClick={() => handleKpiClick('pending')}
        />
        <KpiCard
          title="Expiring in 3 Days"
          value={kpis.expiringSoon}
          icon={<CalendarClock className="h-5 w-5 text-warning" />}
          isLoading={loading}
          onClick={() => handleKpiClick('expiring')}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Pending Clients ({pendingClientsList.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-60 overflow-y-auto">
                {pendingClientsList.length > 0 ? (
                  pendingClientsList.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer" onClick={() => setDetailClient(client)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-sm text-muted-foreground">
                          Status: <Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge>
                        </span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleWhatsappClick(client); }}>
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-muted-foreground">No pending clients.</p>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Expiring Clients ({expiringClientsList.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-60 overflow-y-auto">
                {expiringClientsList.length > 0 ? (
                  expiringClientsList.map(client => (
                     <div key={client.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer" onClick={() => setDetailClient(client)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-sm text-muted-foreground">
                          Expires in {differenceInDays(client.subscriptionEndDate.toDate(), new Date())} days
                        </span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleWhatsappClick(client); }}>
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-muted-foreground">No clients expiring soon.</p>
                )}
            </CardContent>
        </Card>
      </div>
      
      <ClientDetailSheet 
        client={detailClient} 
        open={!!detailClient} 
        onOpenChange={(open) => !open && setDetailClient(null)} 
        onShowHistory={(client) => { setDetailClient(null); setHistoryClient(client); }}
        onWhatsappClick={handleWhatsappClick}
      />

      <HistorySheet 
        client={historyClient}
        open={!!historyClient}
        onOpenChange={(open) => !open && setHistoryClient(null)}
      />

    </div>
  );
}

    