import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, ArrowLeft, X, Users, LogIn, Loader2 } from "lucide-react";

interface TestAccount {
  id: string;
  email: string;
  description: string | null;
  starting_credits: number;
}

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [impersonatingAs, setImpersonatingAs] = useState<string | null>(null);
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const impersonatedEmail = sessionStorage.getItem("impersonating_as");
    setImpersonatingAs(impersonatedEmail);
  }, [user]);

  // Fetch test accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTestAccounts();
    }
  }, [isOpen]);

  const fetchTestAccounts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("test_accounts")
      .select("id, email, description, starting_credits")
      .order("created_at", { ascending: false });
    
    if (data) {
      setTestAccounts(data);
    }
    setIsLoading(false);
  };

  const handleReturnToAdmin = async () => {
    sessionStorage.removeItem("impersonating_as");
    sessionStorage.removeItem("impersonate_password");
    await signOut();
    navigate("/admin");
  };

  const handleDismiss = () => {
    sessionStorage.removeItem("impersonating_as");
    setImpersonatingAs(null);
  };

  const handleSwitchToAccount = async (email: string) => {
    setIsSwitching(email);
    
    // Sign out current user first
    await signOut();
    
    // Clear current impersonation state
    sessionStorage.removeItem("impersonating_as");
    
    // Navigate to login with pre-filled email
    navigate(`/auth?tab=login&email=${encodeURIComponent(email)}`);
    setIsOpen(false);
    setIsSwitching(null);
  };

  if (!impersonatingAs) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm text-yellow-950 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-sm font-medium">
            Impersonating: <span className="font-mono">{impersonatingAs}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Switch User Modal */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 bg-yellow-800 text-yellow-100 hover:bg-yellow-700"
              >
                <Users className="h-3 w-3 mr-1" />
                Switch User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Switch Test Account
                </DialogTitle>
                <DialogDescription>
                  Select a test account to impersonate. You'll need to enter the password manually.
                </DialogDescription>
              </DialogHeader>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : testAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test accounts found
                </div>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {testAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          account.email === impersonatingAs 
                            ? "bg-primary/10 border-primary" 
                            : "bg-muted/50 border-border hover:bg-muted"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm truncate">
                              {account.email}
                            </span>
                            {account.email === impersonatingAs && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          {account.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {account.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={account.email === impersonatingAs ? "outline" : "default"}
                          className="h-7 ml-2"
                          disabled={account.email === impersonatingAs || isSwitching !== null}
                          onClick={() => handleSwitchToAccount(account.email)}
                        >
                          {isSwitching === account.email ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <LogIn className="h-3 w-3 mr-1" />
                              Switch
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              <div className="flex justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin?tab=testers")}
                >
                  Manage Test Accounts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReturnToAdmin}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Return to Admin
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="secondary"
            className="h-7 bg-yellow-950 text-yellow-100 hover:bg-yellow-900"
            onClick={handleReturnToAdmin}
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Return to Admin
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-yellow-600"
            onClick={handleDismiss}
            title="Dismiss banner (stay logged in)"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
