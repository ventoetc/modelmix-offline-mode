import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Logo from "@/components/Logo";
import { Shield, ArrowLeft, Loader2, User, CheckCircle2, Mail, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const TesterAccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<"tester" | "regular">("tester");
  const [authMethod, setAuthMethod] = useState<"password" | "magic">("password");
  
  // Pre-fill email from query params or session storage
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setAuthMethod("magic"); // Default to magic link if email provided
    }
    
    const switchTo = sessionStorage.getItem("switch-to-account");
    if (switchTo) {
      setEmail(switchTo);
      sessionStorage.removeItem("switch-to-account");
    }
    
    const addNew = sessionStorage.getItem("add-new-account");
    if (addNew) {
      setActiveTab("regular");
      sessionStorage.removeItem("add-new-account");
    }
  }, [searchParams]);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user is a tester
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "tester")
          .maybeSingle();

        if (roles) {
          navigate("/app");
          return;
        }
        // Non-tester but logged in - they can still access for regular testing
        navigate("/app");
        return;
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has tester role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "tester")
          .maybeSingle();

        const isTester = !!roles;

        if (activeTab === "tester" && !isTester) {
          toast({
            title: "Not a tester account",
            description: "This account doesn't have tester privileges. Switch to 'Regular Account' tab to continue.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          return;
        }

        toast({ 
          title: isTester ? "Welcome, tester!" : "Signed in",
          description: isTester 
            ? "You have full access. Use the account switcher to toggle to a regular view." 
            : "You're signed in as a regular user for testing."
        });
        navigate("/app");
      }
    } catch (err: unknown) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingMagicLink(true);

    try {
      const redirectUrl = `${window.location.origin}/tester-access`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for a sign-in link. It expires in 1 hour.",
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to send magic link",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/tester-access`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Logo */}
        <div className="text-center mb-6">
          <Logo size="md" showText />
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle>Tester Portal</CardTitle>
            <CardDescription>
              Sign in with your test credentials
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Onboarding steps */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                How Dual-Account Testing Works
              </p>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li><strong>Sign in as Tester</strong> — Get unlimited access, all models, no limits</li>
                <li><strong>Sign in as Regular</strong> — Experience the app exactly as users will</li>
                <li><strong>Switch anytime</strong> — Use the account switcher in the header to toggle</li>
                <li><strong>Full isolation</strong> — Each switch clears all session data for true testing</li>
              </ol>
            </div>

            {/* Account type tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tester" | "regular")} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tester" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Tester
                </TabsTrigger>
                <TabsTrigger value="regular" className="gap-2">
                  <User className="h-4 w-4" />
                  Regular
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="tester" className="mt-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary">Tester Account</p>
                      <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                        <li>• Unlimited access, no credit limits</li>
                        <li>• All models available</li>
                        <li>• Usage tracked but not charged</li>
                        <li>• Access to diagnostics & telemetry</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="regular" className="mt-4">
                <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Regular Account</p>
                      <ul className="text-muted-foreground text-xs mt-1 space-y-0.5">
                        <li>• Experience the app as a normal user</li>
                        <li>• Credit limits apply</li>
                        <li>• Standard model access</li>
                        <li>• Perfect for UX testing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Auth method toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={authMethod === "password" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => { setAuthMethod("password"); setMagicLinkSent(false); }}
              >
                <Key className="h-3.5 w-3.5" />
                Password
              </Button>
              <Button
                type="button"
                variant={authMethod === "magic" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => { setAuthMethod("magic"); setMagicLinkSent(false); }}
              >
                <Mail className="h-3.5 w-3.5" />
                Magic Link
              </Button>
            </div>

            {authMethod === "password" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={activeTab === "tester" ? "tester@example.com" : "user@example.com"}
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In as {activeTab === "tester" ? "Tester" : "Regular User"}
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                {magicLinkSent ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm">Check your email!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We sent a sign-in link to <strong>{email}</strong>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => setMagicLinkSent(false)}
                    >
                      Send again
                    </Button>
                  </div>
                ) : (
                  <Button type="submit" className="w-full gap-2" disabled={isSendingMagicLink}>
                    {isSendingMagicLink ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground text-center">
                  No password needed — we'll email you a secure sign-in link.
                </p>
              </form>
            )}

            {/* Google OAuth divider */}
            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="mt-6 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Pro tip:</strong> Sign in with both accounts to toggle between tester and regular user experiences using the account switcher in the app.
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Need credentials? Contact the admin to get set up.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TesterAccess;
