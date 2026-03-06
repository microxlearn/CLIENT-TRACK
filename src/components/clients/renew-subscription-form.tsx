
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
import { collection, doc, writeBatch, Timestamp, increment } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { LoaderCircle } from 'lucide-react';
import { addDays, format, isBefore } from 'date-fns';

const formSchema = z.object({
  amount: z.coerce.number().min(0, { message: 'Amount cannot be negative.' }),
  validity: z.string(),
  customValidity: z.coerce.number().optional(),
});

type RenewFormProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  client: Client;
};

export function RenewSubscriptionForm({ isOpen, setIsOpen, client }: RenewFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<Date | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: client.fee,
      validity: '30',
      customValidity: undefined,
    },
  });

  const validity = form.watch('validity');
  const customValidity = form.watch('customValidity');

  useEffect(() => {
    form.reset({
      amount: client.fee,
      validity: '30',
      customValidity: undefined,
    });
  }, [client, form, isOpen]);

  useEffect(() => {
    const validityDays = validity === 'custom' ? customValidity || 0 : parseInt(validity, 10);
    if (validityDays > 0) {
      const today = new Date();
      const currentSubscriptionEndDate = client.subscriptionEndDate.toDate();

      const renewalStartDate = isBefore(currentSubscriptionEndDate, today)
        ? today // Expired: start from today
        : currentSubscriptionEndDate; // Active: start from current end date

      const calculatedNewExpiry = addDays(renewalStartDate, validityDays);
      setNewExpiryDate(calculatedNewExpiry);
    } else {
      setNewExpiryDate(null);
    }
  }, [validity, customValidity, client]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore || !user) return;

    const validityDays = values.validity === 'custom' ? values.customValidity! : parseInt(values.validity, 10);
    if (values.validity === 'custom' && (!values.customValidity || values.customValidity <= 0)) {
        form.setError('customValidity', { message: 'Please enter a valid number of days.' });
        return;
    }

    setIsLoading(true);

    const batch = writeBatch(firestore);
    
    const today = new Date();
    const currentSubscriptionEndDate = client.subscriptionEndDate.toDate();
    
    const newStartDate = isBefore(currentSubscriptionEndDate, today) ? today : currentSubscriptionEndDate;
    const newEndDate = addDays(newStartDate, validityDays);
    
    // 1. Create a new payment record
    const paymentRef = doc(collection(firestore, `users/${user.uid}/clients/${client.id}/payments`));
    const newPaymentData = {
      id: paymentRef.id,
      userId: user.uid,
      clientId: client.id,
      paymentDate: Timestamp.now(),
      amount: values.amount,
      validityDays: validityDays,
      startDate: Timestamp.fromDate(newStartDate),
      endDate: Timestamp.fromDate(newEndDate),
    };
    batch.set(paymentRef, newPaymentData);

    // 2. Update the client document
    const clientRef = doc(firestore, 'users', user.uid, 'clients', client.id);
    const updatedClientData = {
      subscriptionStartDate: Timestamp.fromDate(newStartDate),
      subscriptionEndDate: Timestamp.fromDate(newEndDate),
      paymentStatus: 'paid' as const,
      totalPaid: increment(values.amount),
      fee: values.amount 
    };
    batch.update(clientRef, updatedClientData);
    
    batch.commit()
      .then(() => {
        toast({ title: 'Success', description: 'Subscription renewed successfully.' });
        setIsOpen(false);
      })
      .catch((error) => {
        console.error("Renewal batch commit failed:", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not renew subscription.",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew Subscription for {client.name}</DialogTitle>
          <DialogDescription>
            Extend the client's subscription. The new period will start from the current expiry date if active, or from today if expired.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

            {newExpiryDate && (
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                    New Expiry Date: <span className="font-semibold text-foreground">{format(newExpiryDate, 'PPP')}</span>
                </div>
            )}

            <DialogFooter className="!justify-center pt-4">
              <Button type="submit" disabled={isLoading} size="lg" className="w-full max-w-xs">
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Renew Subscription
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
