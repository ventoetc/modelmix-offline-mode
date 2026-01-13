import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Brain, Zap, Eye, MessageSquare, DollarSign, Layers, Clock } from "lucide-react";
import type { OpenRouterModel } from "@/hooks/useOpenRouterModels";

interface ModelInfoModalProps {
  model: OpenRouterModel | null;
  isOpen: boolean;
  onClose: () => void;
}

// Model personality/character descriptions based on common knowledge
const MODEL_PERSONAS: Record<string, {
  personality: string;
  strengths: string[];
  thinkingStyle: string;
  alignment: string;
  bestFor: string[];
}> = {
  "anthropic": {
    personality: "Thoughtful, cautious, and helpful. Known for nuanced responses and strong ethical considerations.",
    strengths: ["Long-form writing", "Analysis", "Safety-conscious responses", "Following complex instructions"],
    thinkingStyle: "Careful, deliberate reasoning with attention to edge cases and potential harms.",
    alignment: "Strongly aligned with being helpful, harmless, and honest. Tends to be more cautious.",
    bestFor: ["Research assistance", "Writing", "Code review", "Nuanced discussions"],
  },
  "google": {
    personality: "Fast, efficient, and knowledge-rich. Excels at factual queries and multimodal tasks.",
    strengths: ["Speed", "Multimodal understanding", "Factual accuracy", "Large context windows"],
    thinkingStyle: "Quick pattern matching with broad knowledge base. Good at synthesizing information.",
    alignment: "Balanced approach between helpfulness and safety. Generally permissive but with guardrails.",
    bestFor: ["Quick answers", "Image analysis", "Research", "Summarization"],
  },
  "openai": {
    personality: "Versatile and conversational. Good at following instructions and creative tasks.",
    strengths: ["Instruction following", "Creative writing", "Code generation", "Reasoning"],
    thinkingStyle: "Structured reasoning with clear step-by-step approaches when needed.",
    alignment: "Moderate safety measures with focus on being useful. Well-balanced for general use.",
    bestFor: ["General assistance", "Coding", "Creative projects", "Tutoring"],
  },
  "meta-llama": {
    personality: "Open and flexible. Community-driven development leads to diverse capabilities.",
    strengths: ["Open weights", "Customizable", "Strong reasoning", "Coding"],
    thinkingStyle: "Direct and efficient. Less filtered responses compared to closed models.",
    alignment: "Lighter safety measures, more direct responses. Good for power users.",
    bestFor: ["Development", "Research", "Custom applications", "Technical tasks"],
  },
  "deepseek": {
    personality: "Technical and precise. Particularly strong at coding and mathematical reasoning.",
    strengths: ["Coding", "Math", "Logical reasoning", "Cost efficiency"],
    thinkingStyle: "Methodical, step-by-step problem solving. Excellent at breaking down complex problems.",
    alignment: "Focused on accuracy and helpfulness. Less emphasis on conversational polish.",
    bestFor: ["Programming", "Math problems", "Technical documentation", "Algorithm design"],
  },
  "x-ai": {
    personality: "Direct and unrestricted. Known for fewer guardrails and more candid responses.",
    strengths: ["Unfiltered responses", "Real-time knowledge", "Speed", "Direct answers"],
    thinkingStyle: "Straightforward reasoning with less hedging. Values directness over caution.",
    alignment: "Minimal safety restrictions. More willing to engage with controversial topics.",
    bestFor: ["Uncensored discussion", "Quick information", "Debate", "Edge cases"],
  },
  "mistralai": {
    personality: "European-designed, efficient and capable. Good balance of size and performance.",
    strengths: ["Efficiency", "Multilingual", "Coding", "Reasoning"],
    thinkingStyle: "Compact but powerful reasoning. Good at extracting key information.",
    alignment: "Moderate approach with European privacy considerations.",
    bestFor: ["Multilingual tasks", "Efficient inference", "Coding", "Business applications"],
  },
  "default": {
    personality: "Each model has unique characteristics based on its training and design philosophy.",
    strengths: ["Varies by model", "Check documentation for specifics"],
    thinkingStyle: "Depends on the model's architecture and training approach.",
    alignment: "Safety and alignment vary significantly between providers.",
    bestFor: ["General tasks", "Experimentation"],
  },
};

const getProviderPersona = (modelId: string) => {
  const provider = modelId.split("/")[0];
  return MODEL_PERSONAS[provider] || MODEL_PERSONAS["default"];
};

const formatPrice = (price: string | undefined): string => {
  if (!price) return "N/A";
  const num = parseFloat(price);
  if (num === 0) return "Free";
  if (num < 0.001) return `$${(num * 1000000).toFixed(2)}/1M tokens`;
  return `$${num.toFixed(6)}/token`;
};

const ModelInfoModal = ({ model, isOpen, onClose }: ModelInfoModalProps) => {
  if (!model) return null;

  const persona = getProviderPersona(model.id);
  const provider = model.id.split("/")[0];
  const supportsVision = model.architecture?.input_modalities?.includes("image");
  const supportsAudio = model.architecture?.input_modalities?.includes("audio");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            {model.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-mono">{model.id}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Capabilities */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Text
                </Badge>
                {supportsVision && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Eye className="h-3 w-3 mr-1" />
                    Vision
                  </Badge>
                )}
                {supportsAudio && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Audio
                  </Badge>
                )}
                {model.context_length && (
                  <Badge variant="outline">
                    <Layers className="h-3 w-3 mr-1" />
                    {(model.context_length / 1000).toFixed(0)}K context
                  </Badge>
                )}
                {model.top_provider?.max_completion_tokens && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {(model.top_provider.max_completion_tokens / 1000).toFixed(0)}K max output
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            {model.pricing && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">Input</p>
                      <p className="font-medium">{formatPrice(model.pricing.prompt)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">Output</p>
                      <p className="font-medium">{formatPrice(model.pricing.completion)}</p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Model Persona */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Character & Personality ({provider})
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.personality}
              </p>
            </div>

            <Separator />

            {/* Thinking Style */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Thinking Style
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.thinkingStyle}
              </p>
            </div>

            <Separator />

            {/* Alignment */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Alignment & Safety
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {persona.alignment}
              </p>
            </div>

            <Separator />

            {/* Strengths */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Key Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.strengths.map((strength, i) => (
                  <Badge key={i} variant="outline" className="bg-background">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Best For */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Best Used For
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.bestFor.map((use, i) => (
                  <Badge key={i} variant="secondary">
                    {use}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
            {model.description && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Official Description
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {model.description}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ModelInfoModal;
