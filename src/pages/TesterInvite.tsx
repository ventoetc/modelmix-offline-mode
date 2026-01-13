import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { Shield, Loader2, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const TesterInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code") || "";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [teamName, setTeamName] = useState("");
  const [pendingStatus, setPendingStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");

  // Validate invite code on mount
  useEffect(() => {
    const validateInvite = async () => {
      if (!inviteCode) {
        setInviteValid(false);
        return;
      }

      const { data, error } = await supabase
        .from("tester_invites")
        .select("team_name, max_uses, uses_count, is_active, expires_at")
        .eq("invite_code", inviteCode)
        .maybeSingle();

      if (error || !data) {
        setInviteValid(false);
        return;
      }

      const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
      const isFull = data.uses_count >= data.max_uses;
      
      if (!data.is_active || isExpired || isFull) {
        setInviteValid(false);
        return;
      }

      setInviteValid(true);
      setTeamName(data.team_name);
    };

    validateInvite();
  }, [inviteCode]);

  // Check if user already has pending approval
  useEffect(() => {
    const checkPendingStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: pending } = await supabase
          .from("pending_tester_approvals")
          .select("status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (pending) {
          setPendingStatus(pending.status as typeof pendingStatus);
        }
      }
    };

    checkPendingStatus();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/tester-invite?code=${inviteCode}`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Submit for approval via edge function
        const { error: approvalError } = await supabase.functions.invoke("submit-tester-approval", {
          body: { 
            inviteCode,
            email: email.trim()
          },
        });

        if (approvalError) {
          console.error("Approval submission error:", approvalError);
        }

        setPendingStatus("pending");
        toast({
          title: "Account Created!",
          description: "Your request is pending admin approval. You'll get access once approved.",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Sign up failed",
        description: err instanceof Error ? err.message : "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (inviteValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Logo size="md" showText />
            <CardTitle className="text-destructive mt-4">Invalid Invite</CardTitle>
            <CardDescription>
              This invite code is invalid, expired, or has reached its limit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pendingStatus === "pending") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              Your tester request for <strong>{teamName}</strong> is awaiting admin approval.
              You'll receive access once approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Check back soon or wait for an email notification.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pendingStatus === "approved") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-green-600">You're Approved!</CardTitle>
            <CardDescription>
              Your tester access has been granted. Start exploring ModelMix!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/app")} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Enter ModelMix
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <Logo size="md" showText />
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <Badge variant="secondary">{teamName}</Badge>
            </div>
            <CardTitle>Join as Tester</CardTitle>
            <CardDescription>
              Create your account to request tester access
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-center">
                <strong>Invite Code:</strong>{" "}
                <code className="bg-muted px-2 py-0.5 rounded">{inviteCode}</code>
              </p>
              <p className="text-xs text-muted-foreground text-center mt-2">
                After signup, an admin will review and approve your access.
              </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Request Tester Access
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/tester-access")}>
                Sign in here
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TesterInvite;
