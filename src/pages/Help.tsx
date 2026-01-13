import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, MessageSquare, Zap, Settings, Download, HelpCircle, Lightbulb, Keyboard, BookOpen } from "lucide-react";
import Logo from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="md" showText />
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open('/docs/USER_GUIDE.md', '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download Guide
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            How to Use ModelMix
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare AI models side-by-side. Ask once, see how different AIs respond.
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Quick Start</h2>
                <ol className="space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Choose 1-10 AI models using the slots at the top</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>Type your question in the text box at the bottom</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Press Enter or click "Run Models" to send</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>Compare the responses side-by-side!</span>
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Ask Anything</h3>
                  <p className="text-sm text-muted-foreground">
                    Writing help, coding questions, research, creative tasks, decisions—all work great.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">@Mention Models</h3>
                  <p className="text-sm text-muted-foreground">
                    Type @modelname to ask just that AI. Great for follow-up questions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Settings className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Click the gear icon to set system prompts, use your own API key, or change themes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Export Chats</h3>
                  <p className="text-sm text-muted-foreground">
                    Save your conversations as Markdown, JSON, or PDF for later reference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">Tips for Better Comparisons</h2>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-destructive line-through mb-1">❌ "Tell me about dogs"</p>
                    <p className="text-primary">✅ "What are the 3 best dog breeds for apartment living and why?"</p>
                  </div>
                  <p className="text-muted-foreground">
                    <strong>Be specific!</strong> The more detail you give, the better you can compare how models handle complexity.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Try the shuffle button</strong> (🔀) for challenge prompts designed to show model differences.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Keyboard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground mb-3">Keyboard Shortcuts</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Send message</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">New line</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Shift + Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Close dialogs</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Escape</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Copy response</span>
                    <span className="text-xs text-muted-foreground">Click copy icon</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>
          
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="different-lengths" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                Why do some models give different length answers?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Each AI has its own style! Some are naturally concise, others more detailed. 
                This is one of the things you can learn by comparing them.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mobile" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                Can I use this on my phone?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! ModelMix works on mobile browsers. The interface adapts to smaller screens, 
                showing one model at a time with easy navigation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="timeout" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                What if a model fails to respond?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sometimes models timeout due to high demand. Try again or select a different model. 
                You won't be charged credits for failed responses.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                Is my data private?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We don't permanently store your conversations. Check our{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>{" "}
                for complete details on how we handle your data.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="credits" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                How do credits work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Each question costs 1 credit per model. Asking 3 models = 3 credits. 
                You get free credits when you sign up, and more are available through upgrades or referrals.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="best-model" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                Which model is the best?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                There's no single "best" model—it depends on your task! Some excel at creative writing, 
                others at coding or factual accuracy. That's why comparing is so valuable.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
          <CardContent className="py-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Ready to compare AI models?</h2>
            <p className="text-muted-foreground mb-4">Your first question is free—no signup required.</p>
            <Button onClick={() => navigate("/app")} size="lg" className="bg-primary text-primary-foreground">
              Try ModelMix Now
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border mt-12">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Help;
