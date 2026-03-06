
'use client';
import { Plus, Trash, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onAddMemberClick?: () => void;
  isLiveOn?: boolean;
  setIsLiveOn?: (isOn: boolean) => void;
  showLiveToggle?: boolean;
  liveToggleHandlers?: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
  };
  onClearHistoryClick?: () => void;
  showClearHistoryButton?: boolean;
  showSignOutButton?: boolean;
}

export default function Header({ 
    onAddMemberClick, 
    isLiveOn, 
    setIsLiveOn, 
    showLiveToggle, 
    liveToggleHandlers,
    onClearHistoryClick,
    showClearHistoryButton,
    showSignOutButton,
}: HeaderProps) {
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm md:justify-end md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Client Track
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {showClearHistoryButton && onClearHistoryClick && (
            <Button onClick={onClearHistoryClick} variant="destructive" size="sm">
              <Trash className="mr-2 h-4 w-4" />
              Clear History
            </Button>
        )}
        {showLiveToggle && (
          <div className="flex items-center space-x-2" {...liveToggleHandlers}>
            <Label htmlFor="live-toggle" className="font-bold cursor-pointer select-none">Live</Label>
            <Switch
              id="live-toggle"
              checked={isLiveOn}
              onCheckedChange={setIsLiveOn}
            />
          </div>
        )}
        
        {onAddMemberClick && (
          <Button onClick={onAddMemberClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}

        {showSignOutButton && (
           <Button onClick={handleSignOut} variant="outline" size="sm">
             <LogOut className="mr-2 h-4 w-4" />
             Sign Out
           </Button>
        )}
      </div>
    </header>
  );
}
