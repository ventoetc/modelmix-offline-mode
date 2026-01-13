import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Brain, Coins, Zap, Users, 
  Coffee, Lightbulb, Clock, MessageSquare,
  Check, Sparkles
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

// Not subscription-framed - these are pay-as-you-go equivalents
const MENTAL_MODELS = [
  {
    icon: Coffee,
    title: "Like a coffee shop for your mind",
    description: "You don't pay rent at a coffee shop — you pay per visit, for what you consume. Credits work the same way.",
  },
  {
    icon: Lightbulb,
    title: "Electricity for thinking",
    description: "Your home uses electricity when you need it. You pay for what you use. AI thinking works the same way — power on demand.",
  },
  {
    icon: Clock,
    title: "A taxi meter for expertise",
    description: "Like a taxi, the meter runs while you're getting value. Short trips cost less. Long explorations cost more. Fair and transparent.",
  },
];

const VALUE_COMPARISONS = [
  { credits: 5, value: "A single focused question answered thoughtfully", comparison: "Less than a vending machine snack" },
  { credits: 25, value: "A detailed analysis of a problem", comparison: "About a fancy coffee" },
  { credits: 100, value: "An hour of research and synthesis", comparison: "A nice lunch" },
  { credits: 500, value: "A week of on-demand thinking partner", comparison: "A dinner out" },
];

const WHY_NOT_FREE = [
  "AI models cost real money to run (compute, energy, infrastructure)",
  "Quality requires powerful models, not cheap shortcuts",
  "Credits let us keep improving without ads or selling your data",
  "Pay-as-you-go means you never pay for what you don't use",
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="md" showText />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Coins className="h-3 w-3 mr-1" />
            How Credits Work
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Pay for thinking,<br />
            <span className="text-primary">not for software</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ModelMix isn't a subscription. It's cognitive leverage on demand. 
            You pay for the thinking you use, nothing more.
          </p>
        </div>

        {/* Mental Models */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Think of it like...</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {MENTAL_MODELS.map((model, i) => (
              <Card key={i} className="text-center">
                <CardHeader>
                  <model.icon className="h-10 w-10 mx-auto text-primary mb-2" />
                  <CardTitle className="text-lg">{model.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{model.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Value Comparisons */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">What credits get you</h2>
          <div className="space-y-4">
            {VALUE_COMPARISONS.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                  {item.credits}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.comparison}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="my-12" />

        {/* Why Not Free */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Why does AI thinking cost anything?</h2>
            <p className="text-muted-foreground">
              Fair question. Here's the honest answer:
            </p>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {WHY_NOT_FREE.map((reason, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Getting Started */}
        <section className="text-center">
          <Card className="bg-primary/5 border-primary/20 max-w-xl mx-auto">
            <CardContent className="pt-8 pb-8">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Start free, pay when it matters</h3>
              <p className="text-muted-foreground mb-6">
                {user 
                  ? "You already have credits. Start thinking."
                  : "Sign up and get 500 credits free. No card required."}
              </p>
              <div className="flex gap-3 justify-center">
                {user ? (
                  <Button size="lg" onClick={() => navigate("/")}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start Thinking
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={() => navigate("/auth")}>
                      <Users className="h-4 w-4 mr-2" />
                      Get 500 Free Credits
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/")}>
                      Try First
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Transparency Note */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            Credits are calculated based on the complexity of your request (token usage).
            <br />
            Simple questions cost less. Deep analysis costs more. Always transparent.
          </p>
        </div>
      </main>
    </div>
  );
}
