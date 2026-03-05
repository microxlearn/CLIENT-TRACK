'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Client, Payment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { format, differenceInDays } from 'date-fns';
import { Badge } from '../ui/badge';


const ClientHistorySheet = ({ client, open, onOpenChange }: { client: Client | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const paymentsQuery = useMemoFirebase(() => {
        if (!client || !firestore) return null;
        return query(collection(firestore, 'clients', client.id, 'payments'), orderBy('paymentDate', 'desc'));
    }, [client, firestore]);

    const { data: payments, isLoading: loading, error } = useCollection<Payment>(paymentsQuery);

    useEffect(() => {
        if (error) {
            console.error("Error fetching payments: ", error);
            toast({ title: 'Error', description: 'Could not fetch payments for this client.', variant: 'destructive' });
        }
    }, [error, toast]);


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
                                        {(payments || []).map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.paymentDate ? format(p.paymentDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                                <TableCell>₹{p.amount}</TableCell>
                                                <TableCell>{p.validityDays} days</TableCell>
                                                <TableCell>{p.startDate ? format(p.startDate.toDate(), 'P') : 'N/A'} - {p.endDate ? format(p.endDate.toDate(), 'P') : 'N/A'}</TableCell>
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

export default function HistoryView() {
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'INDIAN' | 'FOREX' | 'BROKER'>('ALL');
  const [sheetState, setSheetState] = useState<{ open: boolean; client: Client | null; }>({ open: false, client: null });
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const clientsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'clients')) : null, [firestore]);
  const { data: clients, isLoading: isLoadingClients, error: clientsError } = useCollection<Client>(clientsQuery);

  const paymentsQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'payments')) : null, [firestore]);
  const { data: rawPayments, isLoading: isLoadingPayments, error: paymentsError } = useCollection<Payment>(paymentsQuery);

  useEffect(() => {
    if (clientsError) {
      console.error("Error fetching clients for history view: ", clientsError);
      toast({ title: 'Error', description: 'Could not fetch client data.', variant: 'destructive' });
    }
  }, [clientsError, toast]);

  useEffect(() => {
    if (paymentsError) {
      // The useCollection hook with the error emitter will throw the detailed error.
      // This toast is a fallback for the user.
      toast({ title: 'Error fetching payments', description: 'There was a problem retrieving the payment history.', variant: 'destructive' });
    }
  }, [paymentsError, toast]);

  const payments = useMemo(() => {
    if (!rawPayments) return [];
    // The collectionGroup query does not support ordering by Timestamps from different documents.
    // Sorting must be done on the client-side.
    const sorted = [...rawPayments];
    sorted.sort((a, b) => {
        if (a.paymentDate && b.paymentDate) {
            return b.paymentDate.toMillis() - a.paymentDate.toMillis();
        }
        return 0;
    });
    return sorted;
  }, [rawPayments]);

  const clientMap = useMemo(() => {
    return new Map((clients || []).map(c => [c.id, c]));
  }, [clients]);

  const paymentsWithClientData = useMemo(() => {
    return payments.map(p => {
      const client = clientMap.get(p.clientId);
      return {
        ...p,
        clientName: client?.name || 'Unknown',
        clientMarket: client?.market || 'N/A',
      };
    });
  }, [payments, clientMap]);

  const filteredPayments = useMemo(() => {
    if (marketFilter === 'ALL') return paymentsWithClientData;
    return paymentsWithClientData.filter(p => p.clientMarket === marketFilter);
  }, [paymentsWithClientData, marketFilter]);

  const loading = isLoadingClients || isLoadingPayments;

  if (loading) {
    return <div className="flex justify-center mt-8"><LoaderCircle className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Payment History</h2>
        <Select onValueChange={(value: 'ALL' | 'INDIAN' | 'FOREX' | 'BROKER') => setMarketFilter(value)} defaultValue={marketFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by market" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Markets</SelectItem>
                <SelectItem value="INDIAN">Indian</SelectItem>
                <SelectItem value="FOREX">Forex</SelectItem>
                <SelectItem value="BROKER">Broker</SelectItem>
            </SelectContent>
        </Select>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="hidden md:table-cell">Market</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="cursor-pointer" onClick={() => setSheetState({ open: true, client: clientMap.get(payment.clientId) || null })}>
                      <TableCell className="font-medium">{payment.clientName}</TableCell>
                      <TableCell>{payment.paymentDate ? format(payment.paymentDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell"><Badge variant="outline">{payment.clientMarket}</Badge></TableCell>
                      <TableCell className="text-right">₹{payment.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ClientHistorySheet client={sheetState.client} open={sheetState.open} onOpenChange={(open) => setSheetState({ client: open ? sheetState.client : null, open })} />
    </>
  );
}
