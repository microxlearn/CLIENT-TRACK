'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { View } from '@/app/page';

interface BottomNavProps {
  activeView: View;
  setActiveView: Dispatch<SetStateAction<View>>;
}

const navItems: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'payments', label: 'Payments', icon: CreditCard },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export default function BottomNav({ activeView, setActiveView }: BottomNavProps) {

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-3 items-center justify-around">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors h-14 w-full justify-center',
              activeView === item.view ? 'text-primary bg-primary/10' : 'hover:text-foreground'
            )}
          >
            <item.icon
              className="h-5 w-5"
              strokeWidth={activeView === item.view ? 2.5 : 2}
            />
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
