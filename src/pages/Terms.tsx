import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Logo from "@/components/Logo";
import { ArrowLeft, Scale, Shield, Database, CreditCard, AlertTriangle, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();
  const lastUpdated = "January 1, 2025";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="md" showText />
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl py-8 px-4 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Service Nature Disclosure */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Important: Service Nature Disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>ModelMix is a conduit service</strong> — we provide a simplified interface to third-party 
              Large Language Model (LLM) APIs. We do not develop, train, or host AI models ourselves.
            </p>
            <p>
              <strong>Our business model:</strong> We purchase API access from providers (primarily OpenRouter) 
              at wholesale/bulk rates and resell access to you at a margin. The difference between what we pay 
              for API tokens and what you pay via credits constitutes our revenue.
            </p>
            <p>
              <strong>What this means for you:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your prompts and conversations are transmitted to third-party AI providers</li>
              <li>We act as an intermediary, not as the AI provider</li>
              <li>Response quality, accuracy, and availability depend on upstream providers</li>
              <li>We add value through interface design, model comparison, and credit system convenience</li>
            </ul>
          </CardContent>
        </Card>

        {/* Terms Sections */}
        <div className="space-y-6">
          <Section
            icon={<Scale className="h-5 w-5" />}
            title="1. Acceptance of Terms"
            content={
              <>
                <p>
                  By accessing or using ModelMix, you agree to be bound by these Terms of Service. 
                  If you do not agree to these terms, do not use our service.
                </p>
                <p>
                  You must be at least 18 years old to use this service. By using ModelMix, you represent 
                  that you are of legal age to form a binding contract.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Database className="h-5 w-5" />}
            title="2. Service Description & Data Flow"
            content={
              <>
                <p><strong>2.1 What We Provide</strong></p>
                <p>
                  ModelMix provides a web interface to query multiple LLM models through a unified experience. 
                  We handle authentication, credit management, and response formatting.
                </p>
                
                <p className="mt-4"><strong>2.2 Data Flow</strong></p>
                <p>When you submit a prompt:</p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>Your prompt is transmitted from your browser to our edge functions</li>
                  <li>We forward your prompt to the selected AI provider via OpenRouter</li>
                  <li>The AI provider processes your prompt and returns a response</li>
                  <li>We relay the response back to you</li>
                </ol>
                
                <p className="mt-4"><strong>2.3 What We Store</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Account information (email, hashed password)</li>
                  <li>Credit balance and transaction history</li>
                  <li>Usage metadata (model used, token counts, timestamps)</li>
                  <li>Session analytics for service improvement (no prompt content)</li>
                </ul>
                
                <p className="mt-4"><strong>2.4 What We Do NOT Store</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your prompts or conversations on our servers</li>
                  <li>AI responses beyond the current session</li>
                </ul>
              </>
            }
          />

          <Separator />

          <Section
            icon={<CreditCard className="h-5 w-5" />}
            title="3. Credits & Billing"
            content={
              <>
                <p><strong>3.1 Credit System</strong></p>
                <p>
                  ModelMix uses a credit system to meter usage. Credits are consumed based on the 
                  computational cost of your requests, which varies by model and response length.
                </p>
                
                <p className="mt-4"><strong>3.2 Pricing Transparency</strong></p>
                <p>
                  Our credit pricing includes a margin above our API costs. This margin covers:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Infrastructure and hosting costs</li>
                  <li>Development and maintenance</li>
                  <li>Customer support</li>
                  <li>Business operations and profit</li>
                </ul>
                
                <p className="mt-4"><strong>3.3 No Refunds</strong></p>
                <p>
                  Credits are non-refundable once purchased. Unused credits do not expire but may be 
                  forfeited if your account is terminated for Terms violations.
                </p>
                
                <p className="mt-4"><strong>3.4 Free Tier</strong></p>
                <p>
                  Free accounts receive limited daily credits. We reserve the right to modify free tier 
                  allocations at any time.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Shield className="h-5 w-5" />}
            title="4. Third-Party Providers & Liability"
            content={
              <>
                <p><strong>4.1 Upstream Providers</strong></p>
                <p>
                  We route requests through OpenRouter to various AI providers including but not limited to 
                  Google (Gemini), OpenAI, Anthropic, and others. Each provider has their own terms of service 
                  and acceptable use policies.
                </p>
                
                <p className="mt-4"><strong>4.2 No Warranty on AI Output</strong></p>
                <p>
                  AI responses may be inaccurate, biased, or inappropriate. We provide AI access "as is" 
                  without any warranty regarding accuracy, completeness, or fitness for any purpose.
                </p>
                
                <p className="mt-4"><strong>4.3 Limitation of Liability</strong></p>
                <p>
                  ModelMix shall not be liable for any damages arising from:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>AI-generated content or advice</li>
                  <li>Service interruptions caused by upstream providers</li>
                  <li>Data transmitted through third-party APIs</li>
                  <li>Your reliance on AI responses for decisions</li>
                </ul>
                
                <p className="mt-4"><strong>4.4 Indemnification</strong></p>
                <p>
                  You agree to indemnify ModelMix against any claims arising from your use of the service 
                  or violation of these terms.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Globe className="h-5 w-5" />}
            title="5. Intended Use & Acceptable Use Policy"
            content={
              <>
                <p><strong>5.1 Intended Purpose</strong></p>
                <p>
                  ModelMix is designed for <strong>ideation, education, research, and creative exploration</strong>. 
                  It is a tool for comparing AI perspectives, brainstorming ideas, and learning how different 
                  models approach problems.
                </p>
                
                <p className="mt-4"><strong>5.2 Not Intended For</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Medical, legal, or financial advice (consult licensed professionals)</li>
                  <li>Making consequential decisions without human verification</li>
                  <li>Generating content that could cause harm to individuals or groups</li>
                  <li>Any use that violates US law or international regulations</li>
                </ul>
                
                <p className="mt-4"><strong>5.3 Content Moderation</strong></p>
                <p>
                  We employ automated content moderation to steer conversations toward appropriate use cases. 
                  Requests for harmful, dangerous, or inappropriate content will receive helpful redirection 
                  rather than the requested content. This moderation:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Does NOT deduct credits for moderated responses</li>
                  <li>Logs patterns (not content) for platform safety</li>
                  <li>Is designed to be helpful, not punitive</li>
                </ul>
                
                <p className="mt-4"><strong>5.4 Prohibited Uses</strong></p>
                <p>You agree NOT to use ModelMix to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Generate illegal, harmful, or abusive content</li>
                  <li>Attempt to extract training data or reverse-engineer models</li>
                  <li>Circumvent usage limits or credit systems</li>
                  <li>Resell or redistribute access without authorization</li>
                  <li>Violate upstream provider terms of service</li>
                  <li>Harass, threaten, or harm others</li>
                  <li>Engage in activities contrary to US interests or law</li>
                  <li>Automate requests without explicit permission</li>
                </ul>
                
                <p className="mt-4"><strong>5.5 Enterprise Use</strong></p>
                <p>
                  Enterprise customers may negotiate custom terms including adjusted content policies, 
                  dedicated support, and custom integrations. Contact{" "}
                  <a href="mailto:enterprise@modelmix.app" className="text-primary hover:underline">
                    enterprise@modelmix.app
                  </a>{" "}
                  for details.
                </p>
                
                <p className="mt-4">
                  Violations may result in immediate account termination without refund.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Database className="h-5 w-5" />}
            title="6. Account Termination"
            content={
              <>
                <p>
                  You may delete your account at any time. Upon deletion, we will remove your personal 
                  data within 30 days, except where retention is required by law.
                </p>
                <p className="mt-4">
                  We reserve the right to terminate accounts that violate these terms, abuse the service, 
                  or engage in fraudulent activity.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Scale className="h-5 w-5" />}
            title="7. Changes to Terms"
            content={
              <p>
                We may update these terms at any time. Material changes will be communicated via email 
                or prominent notice in the application. Continued use after changes constitutes acceptance.
              </p>
            }
          />

          <Separator />

          <Section
            icon={<Globe className="h-5 w-5" />}
            title="8. Governing Law"
            content={
              <p>
                These terms are governed by the laws of the jurisdiction in which ModelMix operates. 
                Any disputes shall be resolved through binding arbitration.
              </p>
            }
          />
        </div>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Questions about these terms? Contact us at{" "}
              <a href="mailto:legal@modelmix.app" className="text-primary hover:underline">
                legal@modelmix.app
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate("/privacy")}>
            Privacy Policy
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Return to App
          </Button>
        </div>
      </main>
    </div>
  );
};

const Section = React.forwardRef<HTMLDivElement, {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}>(({ icon, title, content }, ref) => (
  <div ref={ref} className="space-y-3">
    <h2 className="text-xl font-semibold flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <div className="text-sm text-muted-foreground space-y-2 pl-7">{content}</div>
  </div>
));
Section.displayName = "Section";

export default Terms;
