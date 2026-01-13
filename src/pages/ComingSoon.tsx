import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { Sparkles, Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ComingSoon = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("waitlist").insert({
        email: email.trim(),
        full_name: "Coming Soon Signup",
        use_case: "Beta interest",
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "You're already on the list!", description: "We'll notify you when we launch." });
        } else {
          throw error;
        }
      } else {
        toast({ title: "You're on the list!", description: "We'll notify you when we launch." });
      }
      setIsSubmitted(true);
    } catch (err) {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      
      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="lg" showText />
        </div>

        {/* Badge */}
        <Badge variant="secondary" className="mb-6">
          <Sparkles className="h-3 w-3 mr-1" />
          Coming Soon
        </Badge>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          One question.
          <br />
          <span className="text-primary">Every answer.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-muted-foreground mb-8">
          Compare AI models side-by-side. Find the best response instantly.
          <br />
          We're putting the finishing touches on something special.
        </p>

        {/* Waitlist form */}
        {!isSubmitted ? (
          <form onSubmit={handleWaitlistSubmit} className="flex gap-2 max-w-sm mx-auto mb-8">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "..." : "Notify Me"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        ) : (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-sm mx-auto mb-8">
            <p className="text-primary font-medium">🎉 You're on the list!</p>
            <p className="text-sm text-muted-foreground">We'll email you when we launch.</p>
          </div>
        )}

        {/* Tester access - subtle link */}
        <div className="pt-8 border-t border-border/50">
          <button
            onClick={() => navigate("/tester-access")}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Tester access →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;