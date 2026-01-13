import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, Coins, Users, TrendingUp, 
  Zap, Brain, MessageSquare, DollarSign
} from "lucide-react";

// Real-world equivalents for framing
const REAL_WORLD_COMPARISONS = [
  { credits: 5, equivalent: "A focused question to a smart friend", emoji: "💬" },
  { credits: 25, equivalent: "A detailed consultation with an expert", emoji: "🧠" },
  { credits: 100, equivalent: "An hour with a research assistant", emoji: "📚" },
  { credits: 500, equivalent: "A week of on-demand thinking support", emoji: "🤝" },
  { credits: 1000, equivalent: "A personal analyst for a month", emoji: "📊" },
];

const SUGGESTED_TIERS = [
  { name: "Trial", credits: 100, price: 0, purpose: "Hook - First taste of cognitive leverage" },
  { name: "Starter", credits: 1000, price: 9, purpose: "Daily thinkers - Light regular use" },
  { name: "Pro", credits: 5000, price: 29, purpose: "Deep reasoning - Complex problems" },
  { name: "Admin", credits: 20000, price: 99, purpose: "Power users - Unlimited thinking" },
];

interface FinancialsTabProps {
  totalUsers?: number;
  totalCreditsInCirculation?: number;
}

export default function FinancialsTab({ totalUsers = 0, totalCreditsInCirculation = 0 }: FinancialsTabProps) {
  // Config values (match your credit_config table)
  const [tokensPerCredit, setTokensPerCredit] = useState(1000);
  const [flashMultiplier, setFlashMultiplier] = useState(100);
  const [proMultiplier, setProMultiplier] = useState(140);
  
  // Cost assumptions (Lovable AI pricing)
  const [costPer1MTokens, setCostPer1MTokens] = useState(0.15); // Approximate Gemini Flash cost
  
  // User behavior assumptions
  const [avgTokensPerChat, setAvgTokensPerChat] = useState(2000);
  const [chatsPerDay, setChatsPerDay] = useState(5);
  
  // Business projections
  const [projectedUsers, setProjectedUsers] = useState(100);
  const [conversionRate, setConversionRate] = useState(5);
  
  // Calculate metrics
  const metrics = useMemo(() => {
    const creditsPerChat = Math.ceil(avgTokensPerChat / tokensPerCredit * (flashMultiplier / 100));
    const dailyCredits = creditsPerChat * chatsPerDay;
    const monthlyCredits = dailyCredits * 30;
    
    // Cost per credit
    const tokensPerCreditAdjusted = tokensPerCredit / (flashMultiplier / 100);
    const costPerCredit = (tokensPerCreditAdjusted / 1_000_000) * costPer1MTokens;
    const costPerChat = creditsPerChat * costPerCredit;
    const monthlyCost = monthlyCredits * costPerCredit;
    
    // Business projections
    const paidUsers = Math.round(projectedUsers * (conversionRate / 100));
    const projectedMRR = paidUsers * 29; // Assuming Pro tier
    const projectedCost = projectedUsers * monthlyCost;
    const grossMargin = projectedMRR > 0 ? ((projectedMRR - projectedCost) / projectedMRR) * 100 : 0;
    
    // Margin analysis for each tier
    const tierAnalysis = SUGGESTED_TIERS.map(tier => {
      const tierCost = tier.credits * costPerCredit;
      const margin = tier.price > 0 ? ((tier.price - tierCost) / tier.price) * 100 : 0;
      const chatsIncluded = Math.floor(tier.credits / creditsPerChat);
      return {
        ...tier,
        cost: tierCost,
        margin,
        chatsIncluded,
      };
    });
    
    return {
      creditsPerChat,
      dailyCredits,
      monthlyCredits,
      costPerCredit,
      costPerChat,
      monthlyCost,
      tierAnalysis,
      paidUsers,
      projectedMRR,
      projectedCost,
      grossMargin,
    };
  }, [tokensPerCredit, flashMultiplier, costPer1MTokens, avgTokensPerChat, chatsPerDay, projectedUsers, conversionRate]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Credits in Circulation</span>
            </div>
            <div className="text-2xl font-bold">{totalCreditsInCirculation.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Projected MRR</span>
            </div>
            <div className="text-2xl font-bold text-green-500">${metrics.projectedMRR}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Gross Margin</span>
            </div>
            <div className={`text-2xl font-bold ${metrics.grossMargin > 70 ? "text-green-500" : metrics.grossMargin > 50 ? "text-yellow-500" : "text-red-500"}`}>
              {metrics.grossMargin.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Credit Configuration
              </CardTitle>
              <CardDescription>Core economy parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Tokens per Credit: {tokensPerCredit}</Label>
                <Slider
                  value={[tokensPerCredit]}
                  onValueChange={([v]) => setTokensPerCredit(v)}
                  min={500}
                  max={5000}
                  step={100}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher = more generous, lower = more revenue
                </p>
              </div>

              <div>
                <Label>Flash Multiplier: {flashMultiplier / 100}x</Label>
                <Slider
                  value={[flashMultiplier]}
                  onValueChange={([v]) => setFlashMultiplier(v)}
                  min={50}
                  max={200}
                  step={10}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Pro Multiplier: {proMultiplier / 100}x</Label>
                <Slider
                  value={[proMultiplier]}
                  onValueChange={([v]) => setProMultiplier(v)}
                  min={100}
                  max={300}
                  step={10}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Avg Tokens per Chat: {avgTokensPerChat}</Label>
                <Slider
                  value={[avgTokensPerChat]}
                  onValueChange={([v]) => setAvgTokensPerChat(v)}
                  min={500}
                  max={10000}
                  step={250}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Chats per Day: {chatsPerDay}</Label>
                <Slider
                  value={[chatsPerDay]}
                  onValueChange={([v]) => setChatsPerDay(v)}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Cost per 1M Tokens: ${costPer1MTokens}
                </Label>
                <Input
                  type="number"
                  value={costPer1MTokens}
                  onChange={(e) => setCostPer1MTokens(parseFloat(e.target.value) || 0.1)}
                  step={0.01}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Business Projections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Projected Users: {projectedUsers}</Label>
                <Slider
                  value={[projectedUsers]}
                  onValueChange={([v]) => setProjectedUsers(v)}
                  min={10}
                  max={10000}
                  step={10}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Conversion Rate: {conversionRate}%</Label>
                <Slider
                  value={[conversionRate]}
                  onValueChange={([v]) => setConversionRate(v)}
                  min={1}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Live Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{metrics.creditsPerChat}</div>
                  <div className="text-xs text-muted-foreground">Credits/Chat</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{metrics.dailyCredits}</div>
                  <div className="text-xs text-muted-foreground">Credits/Day</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{metrics.monthlyCredits.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Credits/Month</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">${metrics.costPerChat.toFixed(4)}</div>
                  <div className="text-xs text-muted-foreground">Your Cost/Chat</div>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-medium">Monthly Infra Cost</span>
                </div>
                <div className="text-3xl font-bold text-primary">
                  ${metrics.monthlyCost.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Per active user at current usage rate
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Projected Monthly</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="ml-2 font-bold text-green-500">${metrics.projectedMRR}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="ml-2 font-bold text-red-500">${metrics.projectedCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid Users:</span>
                    <span className="ml-2 font-bold">{metrics.paidUsers}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit:</span>
                    <span className="ml-2 font-bold text-green-500">
                      ${(metrics.projectedMRR - metrics.projectedCost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Real-World Value
              </CardTitle>
              <CardDescription>Frame credits in terms users understand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {REAL_WORLD_COMPARISONS.map((comp, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">{comp.emoji}</span>
                    <Badge variant="outline" className="font-mono">
                      {comp.credits}
                    </Badge>
                    <span className="text-muted-foreground">{comp.equivalent}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tier Analysis */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Tier Analysis
              </CardTitle>
              <CardDescription>Margin breakdown by pricing tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.tierAnalysis.map((tier, i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{tier.name}</span>
                      <Badge variant={tier.price === 0 ? "secondary" : "default"}>
                        {tier.price === 0 ? "Free" : `$${tier.price}/mo`}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Credits:</span>{" "}
                        <span className="font-mono">{tier.credits.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Chats:</span>{" "}
                        <span className="font-mono">~{tier.chatsIncluded}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Your Cost:</span>{" "}
                        <span className="font-mono">${tier.cost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin:</span>{" "}
                        <span className={`font-mono ${tier.margin > 80 ? "text-green-500" : tier.margin > 50 ? "text-yellow-500" : "text-red-500"}`}>
                          {tier.margin.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{tier.purpose}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary">Key Insight</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                At current settings, you're paying <strong>${metrics.costPerCredit.toFixed(4)}</strong> per credit.
                With {metrics.tierAnalysis[2]?.margin.toFixed(0)}% margins on Pro tier, you have room to:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• Increase trial credits for better conversion</li>
                <li>• Add referral bonuses without losing money</li>
                <li>• Run promotions during low-usage periods</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}