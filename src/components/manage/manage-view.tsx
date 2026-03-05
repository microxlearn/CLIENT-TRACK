'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, collectionGroup, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Client, Payment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';

import FullScreenLoader from '@/components/layout/full-screen-loader';
import KpiCard from '@/components/dashboard/kpi-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, IndianRupee, Globe, DollarSign, MoreVertical, View, Edit, Trash2, History, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { ClientForm } from '@/components/clients/client-form';
import { RenewSubscriptionForm } from '@/components/clients/renew-subscription-form';

// Re-using sheets from clients-view for a consistent UX
import { HistorySheet, ClientDetailSheet } from '@/components/clients/clients-view';

const ClientTable = ({ 
    clients,
    onView,
    onEdit,
    onDelete,
    onRenew
 } : { 
    clients: Client[],
    onView: (client: Client) => void,
    onEdit: (client: Client) => void,
    onDelete: (client: Client) => void,
    onRenew: (client: Client) => void,
}) => {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Start Date</TableHead>
                        <TableHead className="hidden md:table-cell">End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map(client => (
                        <TableRow key={client.id}>
                            <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => onView(client)}>
                                {client.name}
                            </TableCell>
                            <TableCell>{client.phone}</TableCell>
                            <TableCell>₹{client.fee.toLocaleString()}</TableCell>
                            <TableCell className="hidden md:table-cell">{format(client.subscriptionStartDate.toDate(), 'P')}</TableCell>
                            <TableCell className="hidden md:table-cell">{format(client.subscriptionEndDate.toDate(), 'P')}</TableCell>
                            <TableCell>
                                <Badge variant={client.paymentStatus === 'paid' ? 'secondary' : 'destructive'}>{client.paymentStatus}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onView(client)}>
                                            <View className="mr-2 h-4 w-4" /> View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onRenew(client)}>
                                            <DollarSign className="mr-2 h-4 w-4" /> Renew
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(client)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive" onClick={() => onDelete(client)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default function ManageView() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // State for modals and dialogs
    const [detailSheet, setDetailSheet] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
    const [historySheet, setHistorySheet] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
    const [editForm, setEditForm] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
    const [renewForm, setRenewForm] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
    const [actionLoading, setActionLoading] = useState(false);

    // Data Fetching
    const clientsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'clients'), where('deleted', '==', false)) : null, [firestore]);
    const { data: clients, isLoading: clientsLoading, error: clientsError } = useCollection<Client>(clientsQuery);

    const paymentsQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'payments')) : null, [firestore]);
    const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useCollection<Payment>(paymentsQuery);

     useEffect(() => {
        if (clientsError || paymentsError) {
            toast({ title: 'Error', description: 'Could not fetch required data.', variant: 'destructive' });
            console.error(clientsError || paymentsError);
        }
    }, [clientsError, paymentsError, toast]);
    
    // KPI Calculation
    const kpis = useMemo(() => {
        const loading = !clients || !payments;
        const totalClients = clients?.length ?? 0;
        const indianClients = clients?.filter(c => c.market === 'INDIAN').length ?? 0;
        const forexClients = clients?.filter(c => c.market === 'FOREX').length ?? 0;

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        
        const monthlyIncome = payments
            ?.filter(p => isWithinInterval(p.paymentDate.toDate(), { start: monthStart, end: monthEnd }))
            .reduce((sum, p) => sum + p.amount, 0) ?? 0;

        return { totalClients, indianClients, forexClients, monthlyIncome, loading };
    }, [clients, payments]);

    const indianMarketClients = useMemo(() => clients?.filter(c => c.market === 'INDIAN') || [], [clients]);
    const forexMarketClients = useMemo(() => clients?.filter(c => c.market === 'FOREX') || [], [clients]);

    // Action Handlers
    const handleSoftDelete = async () => {
        if (!firestore || !deleteDialog.client) return;
        
        setActionLoading(true);
        try {
            const clientRef = doc(firestore, 'clients', deleteDialog.client.id);
            await updateDoc(clientRef, {
                deleted: true,
                deletedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Client moved to Recycle Bin.' });
        } catch (error) {
            console.error("Error soft deleting client:", error);
            toast({ title: 'Error', description: 'Could not move client to recycle bin.', variant: 'destructive' });
        } finally {
            setActionLoading(false);
            setDeleteDialog({ open: false, client: null });
        }
    };
    
    if (clientsLoading || paymentsLoading) {
        return <FullScreenLoader />;
    }

    return (
        <div>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Manage Clients</h2>
            {/* Section 1: KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard title="Total Clients" value={kpis.totalClients} icon={<Users />} isLoading={kpis.loading} />
                <KpiCard title="Indian Broker" value={kpis.indianClients} icon={<IndianRupee />} isLoading={kpis.loading} />
                <KpiCard title="Forex Broker" value={kpis.forexClients} icon={<Globe />} isLoading={kpis.loading} />
                <KpiCard title="Monthly Income" value={`₹${kpis.monthlyIncome.toLocaleString()}`} icon={<DollarSign />} isLoading={kpis.loading} />
            </div>

            {/* Section 2: Tabs and Tables */}
            <Tabs defaultValue="indian">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="indian">Indian Broker ({indianMarketClients.length})</TabsTrigger>
                    <TabsTrigger value="forex">Forex Broker ({forexMarketClients.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="indian">
                    <Card>
                        <CardContent className="p-0">
                           <ClientTable 
                                clients={indianMarketClients}
                                onView={(client) => setDetailSheet({ open: true, client })}
                                onEdit={(client) => setEditForm({ open: true, client })}
                                onDelete={(client) => setDeleteDialog({ open: true, client })}
                                onRenew={(client) => setRenewForm({ open: true, client })}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="forex">
                    <Card>
                        <CardContent className="p-0">
                           <ClientTable 
                                clients={forexMarketClients}
                                onView={(client) => setDetailSheet({ open: true, client })}
                                onEdit={(client) => setEditForm({ open: true, client })}
                                onDelete={(client) => setDeleteDialog({ open: true, client })}
                                onRenew={(client) => setRenewForm({ open: true, client })}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modals and Sheets for Actions */}
            <ClientDetailSheet 
                client={detailSheet.client}
                open={detailSheet.open}
                onOpenChange={(open) => setDetailSheet({ open, client: open ? detailSheet.client : null })}
                onShowHistory={(client) => { setDetailSheet({ open: false, client: null }); setHistorySheet({ open: true, client })}}
                onEdit={(client) => { setDetailSheet({ open: false, client: null }); setEditForm({ open: true, client })}}
                onRenew={(client) => { setDetailSheet({ open: false, client: null }); setRenewForm({ open: true, client })}}
            />
            
            {historySheet.client && <HistorySheet client={historySheet.client} open={historySheet.open} onOpenChange={(open) => setHistorySheet({ open, client: open ? historySheet.client : null })} />}

            <ClientForm isOpen={editForm.open} setIsOpen={(open) => setEditForm({ open, client: open ? editForm.client : null })} client={editForm.client} />

            {renewForm.client && (
                <RenewSubscriptionForm
                    isOpen={renewForm.open}
                    setIsOpen={(open) => setRenewForm({ open, client: open ? renewForm.client : null })}
                    client={renewForm.client}
                />
            )}
            
            <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({open, client: open ? deleteDialog.client : null})}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Move to Recycle Bin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will move the client to the recycle bin. You can recover them from there later.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSoftDelete} disabled={actionLoading}>
                        {actionLoading ? <LoaderCircle className="animate-spin" /> : 'Continue'}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
