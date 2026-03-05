'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/lib/types';
import { useEffect, useState } from 'react';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { LoaderCircle } from 'lucide-react';
import type { Market } from '@/app/page';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().min(11, { message: 'Please enter a valid phone number with country code.' }).regex(/^\+\d+$/, { message: 'Phone number must start with + and contain only digits.' }),
  market: z.enum(['INDIAN', 'FOREX', 'BROKER']),
  fee: z.coerce.number().min(0, { message: 'Fee cannot be negative.' }),
  validity: z.string(),
  customValidity: z.coerce.number().optional(),
});

type ClientFormProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  client: Client | null;
  onSave?: (client: Client) => void;
};

export function ClientForm({ isOpen, setIsOpen, client, onSave }: ClientFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const marketFees = {
    INDIAN: 600,
    FOREX: 900,
    BROKER: 0,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '+91',
      market: 'INDIAN',
      fee: marketFees.INDIAN,
      validity: '30',
      customValidity: undefined,
    },
  });

  const market = form.watch('market');
  const validity = form.watch('validity');

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        phone: client.phone,
        market: client.market,
        fee: client.fee,
        validity: '30', // Default validity when editing, as it's for new payments
      });
    } else {
      form.reset({
        name: '',
        phone: '+91',
        market: 'INDIAN',
        fee: marketFees.INDIAN,
        validity: '30',
        customValidity: undefined,
      });
    }
  }, [client, form, isOpen]); // Rerun when isOpen changes to reset form

  useEffect(() => {
    if (!client) {
      form.setValue('fee', marketFees[market]);
    }
  }, [market, client, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    
    if (values.market !== 'BROKER' && values.validity === 'custom' && (!values.customValidity || values.customValidity <= 0)) {
        form.setError('customValidity', { message: 'Please enter a valid number of days.' });
        return;
    }

    setIsLoading(true);

    const batch = writeBatch(firestore);
    const fullPhoneNumber = values.phone;
    let savedClient: Client;
    
    if (client) { // Editing existing client
      const clientRef = doc(firestore, 'clients', client.id);
      const updatedData = {
          name: values.name,
          phone: fullPhoneNumber,
          market: values.market,
          fee: values.market === 'BROKER' ? 0 : values.fee,
      };
      batch.update(clientRef, updatedData);
      savedClient = { ...client, ...updatedData };
    } else { // Adding new client
      const isBroker = values.market === 'BROKER';
      const fee = isBroker ? 0 : values.fee;
      const validityDays = isBroker ? 36500 : (values.validity === 'custom' ? values.customValidity! : parseInt(values.validity, 10));

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + validityDays);

      const clientRef = doc(collection(firestore, 'clients'));
      const clientId = clientRef.id;

      const newClientData = {
        id: clientId,
        name: values.name,
        phone: fullPhoneNumber,
        market: values.market,
        fee: fee,
        subscriptionStartDate: Timestamp.fromDate(startDate),
        subscriptionEndDate: Timestamp.fromDate(endDate),
        paymentStatus: 'paid' as 'paid' | 'pending',
        totalPaid: fee,
        createdAt: Timestamp.now(),
        deleted: false,
        deletedAt: null,
      };
      batch.set(clientRef, newClientData);
      savedClient = newClientData;

      if (fee > 0) {
          const paymentRef = doc(collection(firestore, 'clients', clientId, 'payments'));
          const newPaymentData = {
            id: paymentRef.id,
            clientId: clientId,
            paymentDate: Timestamp.now(),
            amount: fee,
            validityDays: validityDays,
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
          };
          batch.set(paymentRef, newPaymentData);
      }
    }
    
    batch.commit()
      .then(() => {
        toast({ title: 'Success', description: client ? 'Client updated successfully.' : 'Client created successfully.' });
        if (onSave) {
          onSave(savedClient);
        }
        setIsOpen(false);
      })
      .catch((error) => {
        console.error("Batch commit failed:", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not save client data.",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="h-dvh flex flex-col w-screen max-w-full rounded-none md:h-auto md:w-full md:max-w-2xl md:rounded-lg">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Member'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update the client details below.' : 'Fill in the details for the new client.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 overflow-y-auto flex-1 px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Client Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+919876543210" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="market" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="INDIAN">INDIAN</SelectItem>
                        <SelectItem value="FOREX">FOREX</SelectItem>
                        <SelectItem value="BROKER">BROKER</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {market !== 'BROKER' && (
                <FormField control={form.control} name="fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            {!client && market !== 'BROKER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="validity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                     <FormControl><SelectTrigger><SelectValue placeholder="Select validity" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {validity === 'custom' && (
                <FormField control={form.control} name="customValidity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Days</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 90" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            )}
            <DialogFooter className="!justify-center pt-4 sticky bottom-0 bg-background py-4">
              <Button type="submit" disabled={isLoading} size="lg" className="w-full max-w-xs">
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {client ? 'Save Changes' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
