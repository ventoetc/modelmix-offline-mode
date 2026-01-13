import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Logo from "@/components/Logo";
import { ArrowLeft, Shield, Database, UserCheck, Globe, Mail, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* GDPR Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Your Privacy Rights (GDPR & Global)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              We respect your privacy and comply with GDPR, CCPA, and other applicable data protection laws. 
              You have the right to:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <li className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Access your personal data</span>
              </li>
              <li className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary shrink-0" />
                <span>Export your data (portability)</span>
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-primary shrink-0" />
                <span>Request data deletion</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span>Withdraw consent at any time</span>
              </li>
            </ul>
            <p className="pt-2">
              To exercise these rights, email{" "}
              <a href="mailto:privacy@modelmix.app" className="text-primary hover:underline">
                privacy@modelmix.app
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Privacy Sections */}
        <div className="space-y-6">
          <Section
            icon={<Database className="h-5 w-5" />}
            title="1. Data We Collect"
            content={
              <>
                <p><strong>1.1 Account Data</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Email address (for authentication)</li>
                  <li>Password (hashed, never stored in plain text)</li>
                  <li>Account creation date</li>
                </ul>
                
                <p className="mt-4"><strong>1.2 Usage Data</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Credit balance and transaction history</li>
                  <li>Model selection preferences</li>
                  <li>Token counts and usage timestamps</li>
                  <li>Session duration and interaction patterns (anonymized)</li>
                </ul>
                
                <p className="mt-4"><strong>1.3 Technical Data</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Browser fingerprint (for rate limiting and fraud prevention)</li>
                  <li>IP address (temporary, for security)</li>
                  <li>Device type and browser version</li>
                </ul>
                
                <p className="mt-4"><strong>1.4 Data We Do NOT Collect</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Your prompts or conversation content</li>
                  <li>AI responses or chat history</li>
                  <li>Personal information beyond what you provide</li>
                </ul>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Shield className="h-5 w-5" />}
            title="2. Legal Basis for Processing (GDPR)"
            content={
              <>
                <p>We process your data under the following legal bases:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>
                    <strong>Contract Performance:</strong> Processing necessary to provide our service 
                    (account management, credit system, API access)
                  </li>
                  <li>
                    <strong>Legitimate Interest:</strong> Fraud prevention, security, service improvement, 
                    and analytics (balanced against your rights)
                  </li>
                  <li>
                    <strong>Consent:</strong> Marketing communications (opt-in only), non-essential cookies
                  </li>
                  <li>
                    <strong>Legal Obligation:</strong> Tax records, fraud investigation cooperation
                  </li>
                </ul>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Globe className="h-5 w-5" />}
            title="3. Data Sharing & Third Parties"
            content={
              <>
                <p><strong>3.1 AI Providers (Data Processors)</strong></p>
                <p>
                  When you submit a prompt, it is transmitted to AI providers via OpenRouter. 
                  These providers process your prompts to generate responses. We have Data Processing 
                  Agreements (DPAs) with our providers.
                </p>
                
                <p className="mt-4"><strong>3.2 Infrastructure Providers</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Supabase (database and authentication)</li>
                  <li>Cloud hosting providers (edge functions)</li>
                </ul>
                
                <p className="mt-4"><strong>3.3 We Never Sell Your Data</strong></p>
                <p>
                  We do not sell, rent, or trade your personal information to third parties for 
                  marketing or any other purpose.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Database className="h-5 w-5" />}
            title="4. Data Retention"
            content={
              <>
                <p><strong>Account Data:</strong> Retained until you delete your account</p>
                <p><strong>Usage Analytics:</strong> Aggregated after 90 days, deleted after 2 years</p>
                <p><strong>Transaction Records:</strong> Retained for 7 years (legal requirement)</p>
                <p><strong>Security Logs:</strong> 30 days</p>
                <p className="mt-4">
                  Upon account deletion, personal data is removed within 30 days. Some anonymized 
                  aggregate data may be retained for service improvement.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Shield className="h-5 w-5" />}
            title="5. Data Security"
            content={
              <>
                <p>We protect your data with:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>TLS encryption for all data in transit</li>
                  <li>Encrypted database storage</li>
                  <li>Secure password hashing (bcrypt)</li>
                  <li>Row-level security policies</li>
                  <li>Regular security audits</li>
                </ul>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Globe className="h-5 w-5" />}
            title="6. International Data Transfers"
            content={
              <p>
                Our services and infrastructure may be located outside your country. By using ModelMix, 
                you consent to transfer of your data to countries that may have different data protection 
                laws. We use Standard Contractual Clauses (SCCs) where required for EU data transfers.
              </p>
            }
          />

          <Separator />

          <Section
            icon={<UserCheck className="h-5 w-5" />}
            title="7. Your Rights"
            content={
              <>
                <p><strong>Right to Access:</strong> Request a copy of your personal data</p>
                <p><strong>Right to Rectification:</strong> Correct inaccurate data</p>
                <p><strong>Right to Erasure:</strong> Request deletion of your data</p>
                <p><strong>Right to Portability:</strong> Export your data in a machine-readable format</p>
                <p><strong>Right to Object:</strong> Object to processing based on legitimate interest</p>
                <p><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</p>
                <p className="mt-4">
                  <strong>How to Exercise:</strong> Email{" "}
                  <a href="mailto:privacy@modelmix.app" className="text-primary hover:underline">
                    privacy@modelmix.app
                  </a>{" "}
                  with your request. We will respond within 30 days.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Mail className="h-5 w-5" />}
            title="8. Cookies & Local Storage"
            content={
              <>
                <p><strong>Essential Storage (Required):</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Authentication tokens</li>
                  <li>Privacy consent preference</li>
                  <li>Session identifiers</li>
                </ul>
                
                <p className="mt-4"><strong>Functional Storage (Optional):</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Theme preference</li>
                  <li>Model selection preferences</li>
                  <li>UI settings</li>
                </ul>
                
                <p className="mt-4">
                  We primarily use localStorage rather than cookies. You can clear this data through 
                  your browser settings at any time.
                </p>
              </>
            }
          />

          <Separator />

          <Section
            icon={<Shield className="h-5 w-5" />}
            title="9. Children's Privacy"
            content={
              <p>
                ModelMix is not intended for users under 18. We do not knowingly collect data from 
                minors. If you believe a minor has provided us with personal data, contact us 
                immediately for deletion.
              </p>
            }
          />

          <Separator />

          <Section
            icon={<Globe className="h-5 w-5" />}
            title="10. Changes to This Policy"
            content={
              <p>
                We may update this policy periodically. Material changes will be communicated via 
                email or prominent notice. Your continued use after changes constitutes acceptance.
              </p>
            }
          />
        </div>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm font-medium">Data Protection Contact</p>
            <p className="text-sm text-muted-foreground">
              For privacy inquiries, data requests, or complaints:{" "}
              <a href="mailto:privacy@modelmix.app" className="text-primary hover:underline">
                privacy@modelmix.app
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              EU residents may also contact your local Data Protection Authority.
            </p>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate("/terms")}>
            Terms of Service
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

export default Privacy;
