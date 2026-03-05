'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type AutoOffDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (date: Date | null) => void;
  currentAutoOffDate: Date | null;
};

export function AutoOffDialog({ isOpen, setIsOpen, onSave, currentAutoOffDate }: AutoOffDialogProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('23:59');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setDate(currentAutoOffDate || new Date());
        setTime(currentAutoOffDate 
            ? `${currentAutoOffDate.getHours().toString().padStart(2, '0')}:${currentAutoOffDate.getMinutes().toString().padStart(2, '0')}` 
            : '23:59'
        );
    }
  }, [isOpen, currentAutoOffDate]);


  const handleSave = () => {
    if (!date) {
      toast({ title: 'Please select a date.', variant: 'destructive' });
      return;
    }
    const [hours, minutes] = time.split(':').map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);

    if (combinedDate <= new Date()) {
      toast({ title: 'Please select a future date and time.', variant: 'destructive' });
      return;
    }

    onSave(combinedDate);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    onSave(null);
    setIsOpen(false);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Auto Turn-Off</DialogTitle>
          <DialogDescription>
            Select a date and time to automatically turn the "Live" status off.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              disabled={(d) => d < startOfToday}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button onClick={handleClear} variant="outline" className="w-full">Clear Schedule</Button>
            <Button onClick={handleSave} className="w-full">Save Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
