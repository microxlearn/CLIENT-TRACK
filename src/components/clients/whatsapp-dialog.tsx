'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateWhatsAppMessage } from '@/ai/flows/generate-whatsapp-message';
import { LoaderCircle, Copy, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

type WhatsappDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  client: Client;
};

type Purpose = 'subscription nearing expiry' | 'pending payment' | 'general update';

export function WhatsappDialog({ isOpen, setIsOpen, client }: WhatsappDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>('subscription nearing expiry');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Reset state when dialog opens for a new client or purpose changes
    setMessage('');
    setCopied(false);
  }, [isOpen, purpose]);

  const handleGenerateMessage = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const result = await generateWhatsAppMessage({
        clientName: client.name,
        clientMarket: client.market,
        clientFee: client.fee,
        clientExpiryDate: format(client.subscriptionEndDate.toDate(), 'PPP'),
        communicationPurpose: purpose,
      });
      setMessage(result.message);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not generate message.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!message) {
      toast({ title: 'Warning', description: 'Please generate a message first.', variant: 'destructive' });
      return;
    }
    const encodedMessage = encodeURIComponent(message);
    const whatsAppNumber = client.phone.replace('+', '');
    window.open(`https://wa.me/${whatsAppNumber}?text=${encodedMessage}`, '_blank');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
          <DialogDescription>Generate a personalized message for {client.name}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Select onValueChange={(value: Purpose) => setPurpose(value)} defaultValue={purpose}>
              <SelectTrigger id="purpose">
                <SelectValue placeholder="Select a purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription nearing expiry">Subscription Expiry</SelectItem>
                <SelectItem value="pending payment">Payment Reminder</SelectItem>
                <SelectItem value="general update">General Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateMessage} disabled={isLoading} className="w-full">
            {isLoading ? <LoaderCircle className="animate-spin" /> : 'Generate with AI'}
          </Button>
          {(isLoading || message) && (
            <div className="space-y-2 relative">
                <Label htmlFor='message'>Generated Message</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder={isLoading ? 'AI is writing...' : ''} readOnly={isLoading} />
                 {message && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-6 right-1"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </Button>
                 )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={!message || isLoading} className="w-full">
            Send on WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
