import { useState, useEffect, useCallback } from "react";
import { X, Brain, TrendingDown, Layers, BarChart3, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface RoutingIntelligenceLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  contextId?: string;
  fingerprint?: string;
}

// Model data for simulation
const MODELS = [
  { id: "flash", name: "Gemini Flash", inputPrice: 0.075, outputPrice: 0.30, capability: 75 },
  { id: "flash-lite", name: "Flash Lite", inputPrice: 0.02, outputPrice: 0.05, capability: 60 },
  { id: "gpt5-mini", name: "GPT-5 Mini", inputPrice: 0.15, outputPrice: 0.60, capability: 82 },
  { id: "gpt5", name: "GPT-5", inputPrice: 2.50, outputPrice: 10.0, capability: 95 },
  { id: "gemini-pro", name: "Gemini Pro", inputPrice: 1.25, outputPrice: 5.0, capability: 92 },
  { id: "claude", name: "Claude 4.5", inputPrice: 3.0, outputPrice: 15.0, capability: 98 },
];

const formatCost = (cost: number) => {
  if (cost < 0.01) return `$${(cost * 100).toFixed(2)}¢`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

const RoutingIntelligenceLightbox = ({
  isOpen,
  onClose,
  contextId,
  fingerprint,
}: RoutingIntelligenceLightboxProps) => {
  // Configuration state
  const [fastPct, setFastPct] = useState(60);
  const [balancedPct, setBalancedPct] = useState(30);
  const [premiumPct, setPremiumPct] = useState(10);
  const [tokenReduction, setTokenReduction] = useState(true);
  const [reductionLevel, setReductionLevel] = useState(40);
  const [monthlyRuns, setMonthlyRuns] = useState(1000);
  const [inputTokens, setInputTokens] = useState(2000);
  const [outputTokens, setOutputTokens] = useState(500);
  
  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["funnel", "results"]));
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Interaction tracking state (internal)
  const [interactionCount, setInteractionCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [sectionsViewed, setSectionsViewed] = useState<Set<string>>(new Set());

  // Timer for time tracking
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTimeSpent(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Discreet interaction tracking
  const trackInteraction = useCallback(async (
    action: string, 
    target: string,
    value?: string | number
  ) => {
    setInteractionCount(prev => prev + 1);

    // Track via Shadow Analytics (background, non-blocking)
    try {
      await supabase.functions.invoke("track-action", {
        body: {
          eventType: "action_click",
          eventValue: `lightbox_${action}`,
          metadata: {
            target,
            value,
            section: "routing_intelligence",
            interaction_count: interactionCount + 1,
            time_in_lightbox: timeSpent,
            sections_viewed: Array.from(sectionsViewed),
          },
          sessionId: contextId || `anon_${Date.now()}`,
          fingerprint,
        },
      });
    } catch {
      // Silent fail - analytics should never block UX
    }
  }, [contextId, fingerprint, interactionCount, timeSpent, sectionsViewed]);

  // Track section toggle
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
        setSectionsViewed(v => new Set([...v, section]));
      }
      return next;
    });
    trackInteraction("toggle_section", section, expandedSections.has(section) ? "collapse" : "expand");
  };

  // Normalize percentages to 100%
  const normalizePercentages = (fast: number, balanced: number, premium: number) => {
    const total = fast + balanced + premium;
    if (total === 0) return { fast: 60, balanced: 30, premium: 10 };
    return {
      fast: Math.round((fast / total) * 100),
      balanced: Math.round((balanced / total) * 100),
      premium: Math.round((premium / total) * 100),
    };
  };

  // Calculate costs
  const calculateCost = () => {
    const fast = MODELS.find(m => m.id === "flash-lite")!;
    const balanced = MODELS.find(m => m.id === "flash")!;
    const premium = MODELS.find(m => m.id === "gpt5")!;

    const r = tokenReduction ? (1 - reductionLevel / 100) : 1;

    const fastCost = (inputTokens * fast.inputPrice / 1_000_000 + outputTokens * fast.outputPrice / 1_000_000) * (fastPct / 100);
    const balancedCost = (inputTokens * r * balanced.inputPrice / 1_000_000 + outputTokens * r * balanced.outputPrice / 1_000_000) * (balancedPct / 100);
    const premiumCost = (inputTokens * r * r * premium.inputPrice / 1_000_000 + outputTokens * r * r * premium.outputPrice / 1_000_000) * (premiumPct / 100);
    
    const funnelTotal = fastCost + balancedCost + premiumCost;
    const singlePremium = inputTokens * premium.inputPrice / 1_000_000 + outputTokens * premium.outputPrice / 1_000_000;
    
    return {
      funnel: funnelTotal,
      singlePremium,
      savings: ((singlePremium - funnelTotal) / singlePremium * 100),
      monthlyFunnel: funnelTotal * monthlyRuns,
      monthlySingle: singlePremium * monthlyRuns,
    };
  };

  const costs = calculateCost();

  // Track close with summary
  const handleClose = async () => {
    await trackInteraction("close", "lightbox", `time:${timeSpent}s,interactions:${interactionCount}`);
    onClose();
  };

  // Onboarding content
  const onboardingSteps = [
    {
      title: "🎯 What is Intelligent Routing?",
      content: "Send simple requests to fast/cheap models, complex ones to premium models. Save 50-80% on API costs while maintaining quality where it matters.",
    },
    {
      title: "⚡ The Funnel Strategy",
      content: "Most queries (60%) are simple → use fast models. Medium complexity (30%) → balanced models. Only truly complex queries (10%) go to premium.",
    },
    {
      title: "📊 Token Reduction",
      content: "Before escalating, the fast model can summarize/extract key info, reducing tokens passed to expensive models by 40-60%.",
    },
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 bg-background">
        <DialogHeader className="p-4 pb-2 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Routing Intelligence
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Explore cost optimization strategies while you wait
          </p>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Onboarding Banner */}
          {showOnboarding && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">
                    {onboardingSteps[onboardingStep].title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {onboardingSteps[onboardingStep].content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    trackInteraction("dismiss_onboarding", "banner", onboardingStep);
                    setShowOnboarding(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1">
                  {onboardingSteps.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 w-6 rounded-full transition-colors cursor-pointer",
                        i === onboardingStep ? "bg-primary" : "bg-border"
                      )}
                      onClick={() => {
                        trackInteraction("nav_onboarding", "dot", i);
                        setOnboardingStep(i);
                      }}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (onboardingStep < onboardingSteps.length - 1) {
                      setOnboardingStep(s => s + 1);
                      trackInteraction("next_onboarding", "button", onboardingStep + 1);
                    } else {
                      setShowOnboarding(false);
                      trackInteraction("complete_onboarding", "button");
                    }
                  }}
                >
                  {onboardingStep < onboardingSteps.length - 1 ? "Next" : "Got it"}
                </Button>
              </div>
            </div>
          )}

          {/* Results Summary - Always Visible */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Funnel Cost</p>
              <p className="text-xl font-bold text-success">{formatCost(costs.funnel)}</p>
              <p className="text-[10px] text-muted-foreground">per request</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">vs Premium Only</p>
              <p className="text-xl font-bold text-primary">{costs.savings.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">savings</p>
            </div>
          </div>

          {/* Funnel Visualization */}
          <Collapsible open={expandedSections.has("funnel")}>
            <CollapsibleTrigger asChild>
              <div
                className="flex items-center justify-between p-3 bg-card rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection("funnel")}
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Routing Funnel</span>
                </div>
                {expandedSections.has("funnel") ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {/* Fast Tier */}
              <div className="relative">
                <div 
                  className="h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-between px-3"
                  style={{ width: `${Math.max(fastPct, 20)}%` }}
                >
                  <span className="text-xs font-medium text-white">⚡ Fast</span>
                  <span className="text-[10px] text-white/80">{fastPct}%</span>
                </div>
              </div>
              <div className="text-center text-[10px] text-muted-foreground">
                ↓ {tokenReduction ? `-${reductionLevel}% tokens` : "no reduction"}
              </div>
              
              {/* Balanced Tier */}
              <div className="relative">
                <div 
                  className="h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between px-3"
                  style={{ width: `${Math.max(balancedPct * (tokenReduction ? (1 - reductionLevel/100) : 1), 15)}%` }}
                >
                  <span className="text-xs font-medium text-white">🔧 Balanced</span>
                  <span className="text-[10px] text-white/80">{balancedPct}%</span>
                </div>
              </div>
              <div className="text-center text-[10px] text-muted-foreground">
                ↓ {tokenReduction ? `-${reductionLevel}% tokens` : "no reduction"}
              </div>
              
              {/* Premium Tier */}
              <div className="relative">
                <div 
                  className="h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-between px-3"
                  style={{ width: `${Math.max(premiumPct * Math.pow(tokenReduction ? (1 - reductionLevel/100) : 1, 2), 10)}%` }}
                >
                  <span className="text-xs font-medium text-white">👑 Premium</span>
                  <span className="text-[10px] text-white/80">{premiumPct}%</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Controls */}
          <Collapsible open={expandedSections.has("controls")}>
            <CollapsibleTrigger asChild>
              <div
                className="flex items-center justify-between p-3 bg-card rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection("controls")}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Adjust Parameters</span>
                </div>
                {expandedSections.has("controls") ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 bg-muted/30 rounded-lg space-y-4">
              {/* Fast % */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Fast tier %</span>
                  <span className="text-green-500 font-medium">{fastPct}%</span>
                </div>
                <Slider
                  value={[fastPct]}
                  onValueChange={([v]) => {
                    setFastPct(v);
                    trackInteraction("slider", "fast_pct", v);
                  }}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-green-500"
                />
              </div>
              
              {/* Balanced % */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Balanced tier %</span>
                  <span className="text-blue-500 font-medium">{balancedPct}%</span>
                </div>
                <Slider
                  value={[balancedPct]}
                  onValueChange={([v]) => {
                    setBalancedPct(v);
                    trackInteraction("slider", "balanced_pct", v);
                  }}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-blue-500"
                />
              </div>
              
              {/* Premium % */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Premium tier %</span>
                  <span className="text-purple-500 font-medium">{premiumPct}%</span>
                </div>
                <Slider
                  value={[premiumPct]}
                  onValueChange={([v]) => {
                    setPremiumPct(v);
                    trackInteraction("slider", "premium_pct", v);
                  }}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-purple-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <Label className="text-xs">Token Reduction</Label>
                </div>
                <Switch
                  checked={tokenReduction}
                  onCheckedChange={(v) => {
                    setTokenReduction(v);
                    trackInteraction("toggle", "token_reduction", v ? "on" : "off");
                  }}
                />
              </div>

              {tokenReduction && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Reduction level</span>
                    <span className="text-cyan-500 font-medium">{reductionLevel}%</span>
                  </div>
                  <Slider
                    value={[reductionLevel]}
                    onValueChange={([v]) => {
                      setReductionLevel(v);
                      trackInteraction("slider", "reduction_level", v);
                    }}
                    max={80}
                    step={5}
                    className="[&_[role=slider]]:bg-cyan-500"
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Monthly Projection */}
          <Collapsible open={expandedSections.has("monthly")}>
            <CollapsibleTrigger asChild>
              <div
                className="flex items-center justify-between p-3 bg-card rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSection("monthly")}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Monthly Projection</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {formatCost(costs.monthlyFunnel)}/mo
                  </Badge>
                </div>
                {expandedSections.has("monthly") ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 bg-muted/30 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">With Routing</p>
                  <p className="text-lg font-bold text-success">{formatCost(costs.monthlyFunnel)}</p>
                  <p className="text-[10px] text-muted-foreground">{monthlyRuns.toLocaleString()} runs/mo</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Without Routing</p>
                  <p className="text-lg font-bold text-destructive">{formatCost(costs.monthlySingle)}</p>
                  <p className="text-[10px] text-muted-foreground">Premium only</p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Monthly runs</span>
                  <span className="font-medium">{monthlyRuns.toLocaleString()}</span>
                </div>
                <Slider
                  value={[monthlyRuns]}
                  onValueChange={([v]) => {
                    setMonthlyRuns(v);
                    trackInteraction("slider", "monthly_runs", v);
                  }}
                  min={100}
                  max={10000}
                  step={100}
                />
              </div>

              <div className="p-2 bg-success/10 border border-success/30 rounded text-center">
                <p className="text-xs font-medium text-success">
                  Annual Savings: {formatCost((costs.monthlySingle - costs.monthlyFunnel) * 12)}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Info Footer */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t">
            <Info className="h-3 w-3" />
            <span>Explore while your response loads. Prices are estimates.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoutingIntelligenceLightbox;
