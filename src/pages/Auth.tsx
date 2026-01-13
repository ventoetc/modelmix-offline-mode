import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { Loader2, ArrowLeft, Sparkles, Zap, Brain, Info, Mail } from "lucide-react";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, signOut, isLoading } = useAuth();
  
  // Pre-fill email from URL params
  const emailFromUrl = searchParams.get("email") || "";
  const tabFromUrl = searchParams.get("tab") as "login" | "signup" | null;
  const isImpersonation = searchParams.get("impersonate") === "true";
  
  // Check for impersonation credentials in sessionStorage (supports both old and new keys)
  const storedEmail = sessionStorage.getItem("impersonation_email") || "";
  const storedPassword = sessionStorage.getItem("impersonation_password") || sessionStorage.getItem("impersonate_password") || "";
  
  const [email, setEmail] = useState(emailFromUrl || storedEmail);
  const [password, setPassword] = useState(storedPassword);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">(tabFromUrl || (isImpersonation ? "login" : "signup"));
  const [hasConsented, setHasConsented] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Auto-login for impersonation if credentials are pre-filled
  useEffect(() => {
    const impersonationEmail = storedEmail || emailFromUrl;
    if (isImpersonation && impersonationEmail && storedPassword && !user) {
      // Clear stored credentials
      sessionStorage.removeItem("impersonation_email");
      sessionStorage.removeItem("impersonation_password");
      sessionStorage.removeItem("impersonate_password");
      
      const autoLogin = async () => {
        setIsSubmitting(true);
        const { error } = await signIn(impersonationEmail, storedPassword);
        setIsSubmitting(false);
        if (error) {
          toast({
            title: "Impersonation Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Store impersonation state for the banner
          sessionStorage.setItem("impersonating_as", impersonationEmail);
          toast({
            title: "Impersonating",
            description: `Signed in as ${impersonationEmail}`,
          });
          navigate("/app");
        }
      };
      autoLogin();
    }
  }, [isImpersonation, emailFromUrl, storedEmail, storedPassword, user, signIn, navigate]);

  // Update email if URL param changes
  useEffect(() => {
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  // If already logged in, show a “signed in” screen (lets admins test auth flows safely)


  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
          queryParams: {
            // Helps on mobile/in-app browsers + avoids “stuck” sessions by forcing account picker
            prompt: "select_account",
          },
        },
      });
      
      if (error) {
        toast({
          title: "Google Sign-In Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsGoogleLoading(false);
      }
      // If successful, user will be redirected to Google
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Google sign-in",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      // Check for email not confirmed error
      if (error.message.includes("Email not confirmed")) {
        setShowResendVerification(true);
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before signing in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message === "Invalid login credentials" 
            ? "Email or password is incorrect" 
            : error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Welcome back!",
        description: "You're now signed in.",
      });
      navigate("/app");
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    setIsResending(false);

    if (error) {
      toast({
        title: "Resend Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verification Email Sent",
        description: "Check your inbox for the verification link.",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
    
    if (!hasConsented) {
      toast({
        title: "Consent Required",
        description: "Please acknowledge the service terms to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Account Exists",
          description: "This email is already registered. Try logging in instead.",
          variant: "destructive",
        });
        setActiveTab("login");
      } else {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      setShowResendVerification(true);
      toast({
        title: "Check your email",
        description: "We sent you a verification link. Please confirm your email to sign in.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Important: if there is already a persisted session, show it explicitly.
  // This prevents the "I clicked login with empty fields and it let me in" confusion.
  if (user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border p-4">
          <div className="container mx-auto flex items-center justify-between">
            <Logo size="md" showText />
            <Button variant="ghost" onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">You’re already signed in</h1>
              <p className="text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.email ?? "(unknown email)"}</span>
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button className="w-full" onClick={() => navigate("/app")}>
                  Continue to app
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={async () => {
                    await signOut();
                    toast({
                      title: "Signed out",
                      description: "You can now test login or Google sign-in.",
                    });
                  }}
                >
                  Sign out
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="md" showText />
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Verification Pending Banner */}
          {showResendVerification && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">Verify your email to continue</p>
                    <p className="text-xs text-muted-foreground">
                      We sent a verification link to <strong>{email || "your email"}</strong>. 
                      Check your inbox and spam folder.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="mt-2"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend verification email"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Start Comparing AI Models</h1>
            <p className="text-muted-foreground">
              Sign up for free and get 10 questions to explore
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <Zap className="h-5 w-5 mx-auto text-primary" />
              <p className="font-medium text-foreground">10 Questions</p>
              <p className="text-xs text-muted-foreground">Free to start</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <Brain className="h-5 w-5 mx-auto text-primary" />
              <p className="font-medium text-foreground">2 Models</p>
              <p className="text-xs text-muted-foreground">GPT-5 & Gemini</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <Sparkles className="h-5 w-5 mx-auto text-primary" />
              <p className="font-medium text-foreground">Sync</p>
              <p className="text-xs text-muted-foreground">Across devices</p>
            </div>
          </div>

          {/* Auth Card */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">
                {activeTab === "login" ? "Welcome back" : "Create account"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login" 
                  ? "Enter your credentials to continue" 
                  : "Enter your email to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Sign-in Button */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="login">Log In</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    {/* Service Disclosure & Consent */}
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">How ModelMix works:</strong> This service acts as a unified interface to multiple AI providers via Lovable AI. 
                          We provide simplified access at wholesale rates. 
                          Your prompts are processed by third-party AI providers. We do not train on your data.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          id="consent" 
                          checked={hasConsented}
                          onCheckedChange={(checked) => setHasConsented(checked === true)}
                        />
                        <label 
                          htmlFor="consent" 
                          className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
                        >
                          I agree to the{" "}
                          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                          {" "}and{" "}
                          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, 
                          and understand that my prompts are processed by third-party AI providers.
                        </label>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting || !hasConsented}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Free Account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Auth;
