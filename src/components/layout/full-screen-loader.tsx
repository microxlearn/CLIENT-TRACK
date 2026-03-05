import { LoaderCircle } from 'lucide-react';

export default function FullScreenLoader() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
