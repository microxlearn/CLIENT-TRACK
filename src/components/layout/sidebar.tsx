'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  History,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { View } from '@/app/page';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeView: View;
  setActiveView: Dispatch<SetStateAction<View>>;
}

const navItems: { view: View; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'payments', label: 'Payments', icon: CreditCard },
  { view: 'history', label: 'History', icon: History },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 py-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Client Track
        </h2>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navItems.map((item) => (
                  <li key={item.view}>
                    <Button
                      variant={activeView === item.view ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-base"
                      onClick={() => setActiveView(item.view)}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
