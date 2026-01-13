import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, User, ChevronDown, Plus, LogOut, Trash2, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SavedAccount {
  email: string;
  isTester: boolean;
  lastUsed: string;
}

interface TesterAccountSwitcherProps {
  currentEmail?: string;
  isTester: boolean;
  onSwitch: () => void;
}

// Keys that should be cleared on account switch for true session isolation
const SESSION_STORAGE_KEYS = [
  { key: "arena-prompt", label: "Current prompt" },
  { key: "arena-panel-count", label: "Panel layout" },
  { key: "arena-selected-models", label: "Selected models" },
  { key: "arena-responses", label: "Model responses" },
  { key: "arena-prompts", label: "Prompt history" },
  { key: "arena-session-title", label: "Session title" },
  { key: "arena-session-start", label: "Session timestamp" },
  { key: "arena-session-id", label: "Session ID" },
  { key: "modelmix-questions-used", label: "Questions used count" },
];

// Clear all session data for true isolation and return what was cleared
const clearSessionData = (): string[] => {
  const clearedItems: string[] = [];
  
  SESSION_STORAGE_KEYS.forEach(({ key, label }) => {
    if (localStorage.getItem(key)) {
      clearedItems.push(label);
      localStorage.removeItem(key);
    }
  });
  
  // Check sessionStorage items
  const sessionStorageCount = sessionStorage.length;
  if (sessionStorageCount > 0) {
    clearedItems.push(`${sessionStorageCount} temporary session item${sessionStorageCount > 1 ? 's' : ''}`);
  }
  sessionStorage.clear();
  
  return clearedItems;
};

const TesterAccountSwitcher = ({ 
  currentEmail, 
  isTester,
  onSwitch 
}: TesterAccountSwitcherProps) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load saved accounts from localStorage (this persists across sessions)
  useEffect(() => {
    const saved = localStorage.getItem("tester-saved-accounts");
    if (saved) {
      setSavedAccounts(JSON.parse(saved));
    }
  }, []);

  // Save current account to list
  useEffect(() => {
    if (currentEmail) {
      setSavedAccounts(prev => {
        const existing = prev.find(a => a.email === currentEmail);
        const updated = existing 
          ? prev.map(a => a.email === currentEmail 
              ? { ...a, isTester, lastUsed: new Date().toISOString() } 
              : a)
          : [...prev, { email: currentEmail, isTester, lastUsed: new Date().toISOString() }];
        
        localStorage.setItem("tester-saved-accounts", JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentEmail, isTester]);

  const handleSwitchAccount = async (account: SavedAccount) => {
    // Clear all session data for true isolation
    const clearedItems = clearSessionData();
    
    // Sign out current user
    await supabase.auth.signOut();
    
    // Store which account to switch to
    sessionStorage.setItem("switch-to-account", account.email);
    
    toast({
      title: "🔄 Session Cleared for Account Switch",
      description: (
        <div className="mt-2 space-y-2">
          <p className="font-medium">Switching to: {account.email}</p>
          {clearedItems.length > 0 ? (
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Data reset:
              </p>
              <ul className="list-none space-y-0.5 pl-4">
                {clearedItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No cached session data to clear</p>
          )}
        </div>
      ),
      duration: 5000,
    });
    
    onSwitch();
    setIsOpen(false);
  };

  const handleAddAccount = async () => {
    // Clear all session data
    const clearedItems = clearSessionData();
    
    await supabase.auth.signOut();
    sessionStorage.setItem("add-new-account", "true");
    
    toast({ 
      title: "🆕 Ready for New Account",
      description: (
        <div className="mt-2 space-y-2">
          <p className="text-sm">Session cleared for fresh start</p>
          {clearedItems.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Cleared {clearedItems.length} item{clearedItems.length > 1 ? 's' : ''}: {clearedItems.slice(0, 3).join(', ')}{clearedItems.length > 3 ? '...' : ''}
            </p>
          )}
        </div>
      ),
      duration: 4000,
    });
    
    onSwitch();
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    // Clear all session data
    const clearedItems = clearSessionData();
    
    await supabase.auth.signOut();
    
    toast({ 
      title: "👋 Signed Out",
      description: (
        <div className="mt-2 space-y-2">
          <p className="text-sm">All session data cleared</p>
          {clearedItems.length > 0 ? (
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Reset {clearedItems.length} item{clearedItems.length > 1 ? 's' : ''}:
              </p>
              <ul className="list-none space-y-0.5 pl-4">
                {clearedItems.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {item}
                  </li>
                ))}
                {clearedItems.length > 5 && (
                  <li className="text-muted-foreground">+{clearedItems.length - 5} more</li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No cached data was present</p>
          )}
        </div>
      ),
      duration: 5000,
    });
    
    onSwitch();
  };

  const otherAccounts = savedAccounts.filter(a => a.email !== currentEmail);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {isTester ? (
            <Shield className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4" />
          )}
          <span className="hidden sm:inline truncate max-w-24">
            {currentEmail?.split("@")[0]}
          </span>
          {isTester && (
            <Badge variant="secondary" className="text-[10px] px-1">
              Tester
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{currentEmail}</p>
            <p className="text-xs text-muted-foreground">
              {isTester ? "Tester Account • Unlimited access" : "Regular Account • Credit limits apply"}
            </p>
          </div>
          {isTester ? (
            <Shield className="h-5 w-5 text-primary shrink-0" />
          ) : (
            <User className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {otherAccounts.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Switch account (clears session):
            </DropdownMenuLabel>
            {otherAccounts.map((account) => (
              <DropdownMenuItem
                key={account.email}
                onClick={() => handleSwitchAccount(account)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {account.isTester ? (
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{account.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.isTester ? "Tester • Full access" : "Regular • For UX testing"}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={handleAddAccount} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Add another account
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive cursor-pointer">
          <LogOut className="h-4 w-4" />
          Sign out & clear session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TesterAccountSwitcher;