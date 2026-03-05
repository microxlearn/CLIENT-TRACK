import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isLoading: boolean;
  onClick?: () => void;
  className?: string;
}

export default function KpiCard({
  title,
  value,
  icon,
  isLoading,
  onClick,
  className,
}: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'shadow-md transition-all active:scale-[0.98]',
        onClick && 'cursor-pointer hover:shadow-lg hover:bg-card/90',
        className
      )}
      role={onClick ? 'button' : 'figure'}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

    