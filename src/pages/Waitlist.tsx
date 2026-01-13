import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles, Calendar, Zap, Users } from "lucide-react";
import { z } from "zod";
import { WaitlistCounter } from "@/components/WaitlistCounter";
import { SocialShareButtons } from "@/components/SocialShareButtons";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  use_case: z.string().min(10, "Please describe your use case in at least 10 characters"),
  profession: z.string().optional(),
  preferred_models: z.array(z.string()).optional(),
  referral_source: z.string().optional(),
});

const MODEL_OPTIONS = [
  { value: "gpt-4", label: "GPT-4 / GPT-4o" },
  { value: "claude", label: "Claude 3.5" },
  { value: "gemini", label: "Gemini Pro" },
  { value: "llama", label: "Llama 3" },
  { value: "mistral", label: "Mistral" },
  { value: "other", label: "Other / All of them" },
];

const PROFESSION_OPTIONS = [
  { value: "developer", label: "Software Developer" },
  { value: "designer", label: "Designer" },
  { value: "product", label: "Product Manager" },
  { value: "researcher", label: "Researcher / Academic" },
  { value: "writer", label: "Writer / Content Creator" },
  { value: "business", label: "Business / Entrepreneur" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
];

const REFERRAL_OPTIONS = [
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "friend", label: "Friend or Colleague" },
  { value: "search", label: "Search Engine" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
];

export default function Waitlist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    use_case: "",
    profession: "",
    preferred_models: [] as string[],
    referral_source: "",
  });

  const handleModelToggle = (model: string) => {
    setFormData((prev) => ({
      ...prev,
      preferred_models: prev.preferred_models.includes(model)
        ? prev.preferred_models.filter((m) => m !== model)
        : [...prev.preferred_models, model],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validated = waitlistSchema.parse(formData);

      const { error } = await supabase.from("waitlist").insert({
        email: validated.email,
        full_name: validated.full_name,
        use_case: validated.use_case,
        profession: validated.profession || null,
        preferred_models: validated.preferred_models?.length ? validated.preferred_models : null,
        referral_source: validated.referral_source || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already registered",
            description: "This email is already on our waitlist!",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        setIsSubmitted(true);
        toast({
          title: "You're on the list! 🎉",
          description: "We'll notify you when the beta launches.",
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">You're in! 🎉</CardTitle>
            <CardDescription className="text-base">
              We're rolling out access soon. You'll be notified when the beta launches on{" "}
              <span className="font-semibold text-primary">January 1st, 2026</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              During the beta period, credits will not be deducted—explore all AI models for free!
            </p>
            
            <div className="border-t pt-6">
              <p className="text-sm font-medium text-foreground mb-4">
                Share to move up the waitlist:
              </p>
              <SocialShareButtons 
                referralMessage="I just joined the ModelMix beta! Compare AI models side-by-side in real time. Join me:"
              />
            </div>

            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Join the Beta</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <Calendar className="w-4 h-4" />
            Beta Launch: January 1st, 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            One Question, Every Answer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Join our exclusive waitlist and get free access during the beta period—no credits deducted.
          </p>
          <WaitlistCounter className="justify-center" />
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Free Beta Access</h3>
            <p className="text-sm text-muted-foreground">
              No credits deducted during beta. Explore all AI models freely.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Early Access</h3>
            <p className="text-sm text-muted-foreground">
              Be among the first to try new features and provide feedback.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Priority Support</h3>
            <p className="text-sm text-muted-foreground">
              Get dedicated support and influence the product roadmap.
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Join the Waitlist</CardTitle>
            <CardDescription>
              Complete your profile to reserve your spot. This info will also be saved to your account when you sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="use_case">How do you plan to use AI Model Mix? *</Label>
                <Textarea
                  id="use_case"
                  placeholder="E.g., Comparing responses for research, finding the best model for coding tasks, exploring creative writing with different AIs..."
                  value={formData.use_case}
                  onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              {/* Optional Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Your Profession</Label>
                  <Select
                    value={formData.profession}
                    onValueChange={(value) => setFormData({ ...formData, profession: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFESSION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral_source">How did you hear about us?</Label>
                  <Select
                    value={formData.referral_source}
                    onValueChange={(value) => setFormData({ ...formData, referral_source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERRAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Which AI models interest you most?</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MODEL_OPTIONS.map((model) => (
                    <div
                      key={model.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={model.value}
                        checked={formData.preferred_models.includes(model.value)}
                        onCheckedChange={() => handleModelToggle(model.value)}
                      />
                      <label
                        htmlFor={model.value}
                        className="text-sm cursor-pointer"
                      >
                        {model.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Joining..." : "Join the Waitlist"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By joining, you agree to receive updates about AI Model Mix. We respect your privacy.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
