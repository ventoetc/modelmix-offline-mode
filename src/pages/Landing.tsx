import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowRight, CheckCircle2, 
  MessageSquare, Brain, Layers, Calendar
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { WaitlistCounter } from "@/components/WaitlistCounter";

const Landing = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // If user is already logged in, redirect to app
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/app");
    }
  }, [user, isLoading, navigate]);

  if (!isLoading && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Logo size="lg" />
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground"
            >
              Log in
            </Button>
            <Button 
              onClick={() => navigate("/waitlist")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Join Beta
            </Button>
          </div>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
          {/* Beta Banner */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => navigate("/waitlist")}>
            <Calendar className="w-4 h-4" />
            <span>Beta Launch: January 1st, 2026 — Free credits during beta!</span>
            <ArrowRight className="w-3 h-3" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 text-accent-foreground text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>1 Free Question — Try Now!</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            One Question,
            <br />
            <span className="text-primary">Every Answer</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Stop switching between ChatGPT, Claude, and Gemini. Ask once, compare instantly.
            The AI comparison platform that doesn't hide costs.
          </p>
          
          <WaitlistCounter className="justify-center mb-6" />

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button 
              onClick={() => navigate("/app")}
              size="lg"
              className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Try 1 Free Question
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/waitlist")}
              className="h-12 px-8"
            >
              Join Beta Waitlist
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mb-8">
            No signup required for your first question. Join waitlist for unlimited free beta access.
          </p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>1 free question</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Multiple AI models</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Instant comparison</span>
            </div>
          </div>
        </main>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            Why Compare AI Models?
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Different models excel at different tasks. See the differences instantly.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-background border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                One Prompt, Many Answers
              </h3>
              <p className="text-muted-foreground text-sm">
                Ask once and see how GPT-5, Gemini, Claude, and more respond differently. 
                Pick the best answer for your specific need.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-background border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Discover Model Strengths
              </h3>
              <p className="text-muted-foreground text-sm">
                Learn which AI is best for coding, creative writing, analysis, or conversation. 
                Build intuition through direct comparison.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-background border border-border">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Save Time & Money
              </h3>
              <p className="text-muted-foreground text-sm">
                Stop paying for multiple AI subscriptions. Access top models through 
                one interface with transparent per-use pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beta CTA Section */}
      <section className="py-20 bg-primary/5 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            Beta Launch: January 1st, 2026
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Join the Beta — Free Credits Included
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Be among the first to experience AI Model Mix. During our beta period, 
            credits will not be deducted—explore all AI models completely free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => navigate("/waitlist")}
              className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Join the Waitlist
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/app")}
              className="h-12 px-8"
            >
              Try 1 Free Question Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/help" className="hover:text-foreground transition-colors">Help</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
