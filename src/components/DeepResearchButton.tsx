import { useState, useEffect } from "react";
import { Brain, Loader2, Sparkles, Users, X, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint } from "@/lib/fingerprint";
import { getBYOKKeys } from "@/components/ApiKeyManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDeepResearchLimit } from "@/hooks/useDeepResearchLimit";

interface DeepResearchButtonProps {
  prompt: string;
  onComplete: (synthesis: string) => void;
  disabled?: boolean;
  className?: string;
  apiKey?: string; // OpenRouter API key for diverse models
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLocalMode?: boolean;
  localModelId?: string;
  localBaseUrl?: string;
  modelSystemPrompts?: Record<string, string>;
}

type ResearchPhase = "idle" | "gathering" | "discussing" | "synthesizing" | "complete";

interface ModelContribution {
  modelId: string;
  modelName: string;
  response: string;
  perspective: string;
}

// Limited set of high-quality models for deep research
const RESEARCH_MODELS = [
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "premium" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "free" },
  { id: "openai/gpt-5", name: "GPT-5", tier: "premium" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", tier: "free" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", tier: "openrouter" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", tier: "openrouter" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", tier: "openrouter" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", tier: "openrouter" },
];

const DeepResearchButton = ({
  prompt: initialPrompt,
  onComplete,
  disabled = false,
  className,
  apiKey,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  isLocalMode,
  localModelId,
  localBaseUrl,
  modelSystemPrompts,
}: DeepResearchButtonProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;
  
  const [phase, setPhase] = useState<ResearchPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [contributions, setContributions] = useState<ModelContribution[]>([]);
  const [discussionRound, setDiscussionRound] = useState(0);
  const [finalSynthesis, setFinalSynthesis] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // Deep research limit tracking
  const { canUse: canUseCloud, remainingToday, dailyLimit, recordUsage, isLoading: limitLoading } = useDeepResearchLimit();
  
  // Bypass limits in local mode
  const canUse = isLocalMode ? true : canUseCloud;

  // Track the actual local model ID to use
  const [activeLocalModelId, setActiveLocalModelId] = useState<string>(localModelId || "local-model");

  useEffect(() => {
    if (isLocalMode && localBaseUrl) {
      if (localModelId && localModelId !== "local-model") {
        setActiveLocalModelId(localModelId);
      } else {
        // Try to fetch available models from the local server
        const fetchModels = async () => {
          try {
            let response = await fetch(`${localBaseUrl}/v1/models`);
            if (!response.ok) response = await fetch(`${localBaseUrl}/models`);
            
            if (response.ok) {
              const data = await response.json();
              // Check standard OpenAI format (data.data array)
              if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                setActiveLocalModelId(data.data[0].id);
              } 
              // Check Ollama format (models array)
              else if (data.models && Array.isArray(data.models) && data.models.length > 0) {
                setActiveLocalModelId(data.models[0].model || data.models[0].name);
              }
            }
          } catch (err) {
            console.warn("Failed to fetch local models list:", err);
          }
        };
        
        fetchModels();
      }
    }
  }, [isLocalMode, localBaseUrl, localModelId]);

  // Editable research question and model selection
  const [researchQuestion, setResearchQuestion] = useState(initialPrompt);
  const [selectedModels, setSelectedModels] = useState<{ id: string; name: string }[]>([]);

  // Initialize fingerprint and session on mount
  useEffect(() => {
    setFingerprint(generateFingerprint());
    
    supabase.auth.getSession().then(({ data }) => {
      setSessionToken(data.session?.access_token || null);
    });
  }, []);

  // Update research question when dialog opens
  useEffect(() => {
    if (isOpen) {
      setResearchQuestion(initialPrompt);
      // Default to 2 free-tier models
      const defaultModels = RESEARCH_MODELS.filter(m => m.tier === "free").slice(0, 2);
      if (selectedModels.length === 0) {
        setSelectedModels(defaultModels.map(m => ({ id: m.id, name: m.name })));
      }
    }
  }, [isOpen, initialPrompt]);

  // Get available models based on API key
  const availableModels = RESEARCH_MODELS.filter(m => {
    if (m.tier === "openrouter") return !!apiKey;
    return true; // free and premium tiers always available
  });

  const toggleModel = (model: { id: string; name: string }) => {
    const isSelected = selectedModels.some(m => m.id === model.id);
    if (isSelected) {
      setSelectedModels(prev => prev.filter(m => m.id !== model.id));
    } else if (selectedModels.length < 4) {
      setSelectedModels(prev => [...prev, model]);
    }
  };

  // Synthesizer model that coordinates and produces the final output
  const SYNTHESIZER_MODEL = "google/gemini-2.5-pro";

  const phaseLabels: Record<ResearchPhase, string> = {
    idle: "Ready to research",
    gathering: "Gathering perspectives from all models...",
    discussing: `Round ${discussionRound}/2: Models are cross-referencing...`,
    synthesizing: "Synthesizing comprehensive analysis...",
    complete: "Research complete!",
  };

  const runDeepResearch = async () => {
    if (!researchQuestion.trim() || selectedModels.length < 2) return;
    
    // Check limit before starting
    if (!canUse) {
      setError(`Daily limit reached (${dailyLimit} per day). Try again tomorrow.`);
      return;
    }
    
    setPhase("gathering");
    setProgress(0);
    setContributions([]);
    setError(null);
    setFinalSynthesis("");
    
    // Record usage immediately to prevent double-runs (only in cloud mode)
    if (!isLocalMode) {
      await recordUsage(
        selectedModels.map(m => m.id),
        researchQuestion.slice(0, 100)
      );
    }

    try {
      // Phase 1: Gather initial perspectives from all models
      const initialContributions: ModelContribution[] = [];
      const totalSteps = selectedModels.length + selectedModels.length + selectedModels.length + 1; // Initial + round1 + round2 + synthesis
      let currentStep = 0;

      for (const model of selectedModels) {
        const perspective = await callModel(model.id, model.name, 
          `You are participating in a deep research session. Provide your unique perspective on this question, focusing on aspects that might be overlooked by other AI models. Be thorough but concise.

Question: ${researchQuestion}

Provide your analysis with:
1. Your main thesis/perspective
2. Key evidence and reasoning
3. Potential counterarguments or limitations
4. Unique insights from your training`
        );
        
        initialContributions.push({
          modelId: model.id,
          modelName: model.name,
          response: perspective,
          perspective: "initial",
        });
        
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }
      
      setContributions(initialContributions);

      // Phase 2: First discussion round - models review each other's responses
      setPhase("discussing");
      setDiscussionRound(1);
      
      const round1Contributions: ModelContribution[] = [];
      for (const model of selectedModels) {
        const othersResponses = initialContributions
          .filter(c => c.modelId !== model.id)
          .map(c => `[${c.modelName}]: ${c.response.slice(0, 500)}...`)
          .join("\n\n");

        const refinedPerspective = await callModel(model.id, model.name,
          `You're in a collaborative research discussion. Here are other AI models' perspectives on the question.

Original question: ${researchQuestion}

Other models' perspectives:
${othersResponses}

Your original perspective:
${initialContributions.find(c => c.modelId === model.id)?.response}

Now, considering these other perspectives:
1. What did others get right that you missed?
2. What do you disagree with and why?
3. What synthesis or new insight emerges from this discussion?
4. Revise and strengthen your analysis.`
        );
        
        round1Contributions.push({
          modelId: model.id,
          modelName: model.name,
          response: refinedPerspective,
          perspective: "round1",
        });
        
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }
      
      setContributions(prev => [...prev, ...round1Contributions]);

      // Phase 3: Second discussion round - deeper synthesis
      setDiscussionRound(2);
      
      const round2Contributions: ModelContribution[] = [];
      for (const model of selectedModels) {
        const allPerspectives = [...initialContributions, ...round1Contributions]
          .filter(c => c.modelId !== model.id)
          .map(c => `[${c.modelName} - ${c.perspective}]: ${c.response.slice(0, 400)}...`)
          .join("\n\n");

        const finalPerspective = await callModel(model.id, model.name,
          `Final round of collaborative research. The question was: ${researchQuestion}

Here's the full discussion so far:
${allPerspectives}

Your contributions so far:
${[...initialContributions, ...round1Contributions]
  .filter(c => c.modelId === model.id)
  .map(c => `[${c.perspective}]: ${c.response}`)
  .join("\n\n")}

Provide your FINAL contribution:
1. The most important conclusion from this discussion
2. Any remaining uncertainties or open questions
3. A concrete, actionable takeaway
4. Your confidence level in the collective conclusions`
        );
        
        round2Contributions.push({
          modelId: model.id,
          modelName: model.name,
          response: finalPerspective,
          perspective: "final",
        });
        
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }
      
      setContributions(prev => [...prev, ...round2Contributions]);

      // Phase 4: Final synthesis by the synthesizer model
      setPhase("synthesizing");
      
      const allContributions = [...initialContributions, ...round1Contributions, ...round2Contributions];
      const formattedDiscussion = allContributions
        .map(c => {
          const persona = modelSystemPrompts?.[c.modelId] 
            ? `\n**Persona/System Prompt**: ${modelSystemPrompts[c.modelId]}\n` 
            : "";
          return `## ${c.modelName} (${c.perspective})${persona}\n${c.response}`;
        })
        .join("\n\n---\n\n");

      const synthesis = await callModel(SYNTHESIZER_MODEL, "Synthesizer",
        `You are the lead researcher synthesizing a multi-model deep research discussion.

ORIGINAL QUESTION: ${researchQuestion}

FULL DISCUSSION (${selectedModels.length} models × 3 rounds):
${formattedDiscussion}

Create a comprehensive, publication-quality research synthesis:

# Executive Summary
(2-3 sentence overview of the key finding)

# Consensus Points
(What all models agreed on)

# Key Debates & Disagreements  
(Where models differed and why)

# Synthesized Analysis
(Your integration of all perspectives into a coherent, nuanced answer)

# Novel Insights
(Ideas that emerged from the discussion that no single model initially had)

# Confidence Assessment
(How reliable are these conclusions, and what would change them)

# Actionable Recommendations
(Clear next steps based on this research)

# Sources of Uncertainty
(What we still don't know and how to find out)

Be thorough, balanced, and cite which models contributed which insights.`
      );

      currentStep++;
      setProgress(100);
      
      setFinalSynthesis(synthesis);
      setPhase("complete");
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Research failed. Please try again.");
      setPhase("idle");
    }
  };

  const callModel = async (modelId: string, modelName: string, promptContent: string): Promise<string> => {
    // Construct messages with system prompt if available
    const messages = [];
    if (modelSystemPrompts?.[modelId]) {
      messages.push({ role: "system", content: modelSystemPrompts[modelId] });
    }
    messages.push({ role: "user", content: promptContent });

    // Handle Local Mode - Simulate all models using the local LLM
    if (isLocalMode && localBaseUrl) {
      try {
        let modelToUse = activeLocalModelId;
        if (modelToUse === "local-model") {
          try {
            let response = await fetch(`${localBaseUrl}/v1/models`);
            if (!response.ok) response = await fetch(`${localBaseUrl}/models`);

            if (response.ok) {
              const data = await response.json();
              const nextId: unknown =
                data?.data?.[0]?.id ||
                data?.models?.[0]?.model ||
                data?.models?.[0]?.name ||
                null;

              if (nextId && typeof nextId === "string") {
                modelToUse = nextId;
                setActiveLocalModelId(nextId);
              }
            }
          } catch {
            void 0;
          }
        }

        if (!modelToUse || modelToUse === "local-model") {
          throw new Error("No local models found. Load a model in LM Studio, then retry.");
        }

        const response = await fetch(`${localBaseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Local model error for ${modelName}:`, errorText);
          throw new Error(`${modelName} (Local) failed to respond`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No response generated";
      } catch (err: unknown) {
        console.error(`Local Deep Research Error (${modelName}):`, err);
        throw new Error(`${modelName} failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // Check if this is a Lovable AI model (free tier)
    const LOVABLE_AI_MODELS = [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro", 
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
    ];
    
    const isLovableModel = LOVABLE_AI_MODELS.includes(modelId);
    
    // Use OpenRouter for non-Lovable models if API key available
    if (!isLovableModel && apiKey) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "ModelMix Deep Research",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${modelName} OpenRouter error:`, errorText);
        throw new Error(`${modelName} failed to respond`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "No response generated";
    }
    
    // Use Lovable AI edge function for free tier models
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }
    
    // Get user API keys for BYOK support
    const userApiKeys = getBYOKKeys();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages,
          model: modelId,
          fingerprint: fingerprint,
          sessionId: `deep_research_${Date.now()}`,
          usageType: "deep_research",
          ...(Object.keys(userApiKeys).length > 0 ? { userApiKeys } : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${modelName} error:`, errorText);
      throw new Error(`${modelName} failed to respond`);
    }

    // Handle streaming response from edge function
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullResponse += content;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return fullResponse || "No response generated";
  };

  const handleComplete = () => {
    onComplete(finalSynthesis);
    setIsOpen(false);
    setPhase("idle");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
          disabled={disabled}
          title="Deep Research: Multiple models collaborate to produce comprehensive analysis"
        >
          <Brain className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Deep Research</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Deep Research Mode
            <Badge 
              variant={canUse ? "secondary" : "destructive"} 
              className="ml-2 text-xs"
            >
              {isLocalMode ? "Local Mode (Unlimited)" : `${remainingToday}/${dailyLimit} remaining today`}
            </Badge>
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>Select 2-4 models to collaborate over 2 rounds for comprehensive, multi-perspective analysis.</span>
            {!canUse && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Daily limit reached. Try again tomorrow.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Editable Research Question */}
          {phase === "idle" && (
            <div className="space-y-2">
              <Label htmlFor="research-question" className="text-sm font-medium">
                Research Question
              </Label>
              <Textarea
                id="research-question"
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                placeholder="Enter your research question..."
                className="min-h-[80px] text-sm"
              />
            </div>
          )}

          {/* Research question preview during research */}
          {phase !== "idle" && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Research Question:</p>
              <p className="text-sm text-muted-foreground">{researchQuestion}</p>
            </div>
          )}

          {/* Model Selection */}
          {phase === "idle" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Models (2-4)
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableModels.map(model => {
                  const isSelected = selectedModels.some(m => m.id === model.id);
                  const isDisabled = !isSelected && selectedModels.length >= 4;
                  return (
                    <Badge 
                      key={model.id} 
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "text-xs cursor-pointer transition-colors",
                        isSelected && "bg-primary text-primary-foreground",
                        isDisabled && "opacity-50 cursor-not-allowed",
                        model.tier === "openrouter" && "border-amber-500/50"
                      )}
                      onClick={() => !isDisabled && toggleModel({ id: model.id, name: model.name })}
                    >
                      {isSelected ? (
                        <X className="h-3 w-3 mr-1" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      {model.name}
                      {model.tier === "openrouter" && (
                        <span className="ml-1 text-[10px] opacity-70">(API)</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedModels.length}/4 selected
                {!apiKey && " • Add OpenRouter API key for more models"}
              </p>
            </div>
          )}

          {/* Selected models during research */}
          {phase !== "idle" && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participating Models
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedModels.map(model => (
                  <Badge key={model.id} variant="secondary" className="text-xs">
                    {model.name}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs border-primary text-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Synthesizer (Gemini 2.5 Pro)
                </Badge>
              </div>
            </div>
          )}

          {/* Progress */}
          {phase !== "idle" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{phaseLabels[phase]}</span>
                <span className="font-mono text-xs">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Model contributions preview */}
          {contributions.length > 0 && phase !== "complete" && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">Latest contributions:</p>
              {contributions.slice(-3).map((c, i) => (
                <div key={`${c.modelId}-${c.perspective}-${i}`} className="p-2 bg-muted/50 rounded text-xs">
                  <span className="font-medium">{c.modelName}</span>
                  <span className="text-muted-foreground ml-1">({c.perspective})</span>
                  <p className="text-muted-foreground line-clamp-2 mt-1">{c.response.slice(0, 150)}...</p>
                </div>
              ))}
            </div>
          )}

          {/* Final synthesis preview */}
          {phase === "complete" && finalSynthesis && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Research Complete!
              </p>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg max-h-60 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{finalSynthesis.slice(0, 1000)}...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {phase === "idle" && (
            <Button 
              onClick={runDeepResearch} 
              disabled={!researchQuestion.trim() || selectedModels.length < 2}
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Deep Research ({selectedModels.length} models)
            </Button>
          )}
          
          {phase !== "idle" && phase !== "complete" && (
            <Button disabled variant="outline">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Researching...
            </Button>
          )}
          
          {phase === "complete" && (
            <Button onClick={handleComplete}>
              <Sparkles className="h-4 w-4 mr-2" />
              Use This Research
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeepResearchButton;
