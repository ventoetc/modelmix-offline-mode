import { useState, useMemo } from "react";
import Logo from "@/components/Logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Eye,
  Brain,
  Zap,
  DollarSign,
  Check,
  Plus,
  MessageSquare,
  Code,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Star,
  Minus,
} from "lucide-react";
import type { OpenRouterModel } from "@/hooks/useOpenRouterModels";

interface ModelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: OpenRouterModel[];
  selectedModels: string[];
  panelCount: number;
  maxPanels: number;
  onSelectModel: (modelId: string, slotIndex: number) => void;
  onPanelCountChange?: (count: number) => void;
  availableModelIds?: string[]; // Tier-restricted model IDs
  userTier?: "anonymous" | "authenticated" | "tester" | "byok";
}

// Lovable AI models (available to all users)
const LOVABLE_AI_MODEL_IDS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

// Featured models for free users (Lovable AI only)
const FREE_FEATURED_MODELS = [
  {
    id: "google/gemini-2.5-flash",
    description: "Fast & efficient, great all-rounder",
    tags: ["fast", "vision", "coding"],
  },
  {
    id: "google/gemini-2.5-pro",
    description: "Most capable Gemini, complex tasks",
    tags: ["powerful", "reasoning", "vision"],
  },
  {
    id: "openai/gpt-5-mini",
    description: "Balanced speed & capability",
    tags: ["fast", "creative", "coding"],
  },
  {
    id: "openai/gpt-5",
    description: "Most powerful GPT model",
    tags: ["powerful", "reasoning", "vision"],
  },
  {
    id: "google/gemini-2.5-flash-lite",
    description: "Ultra-fast for simple tasks",
    tags: ["fast", "chat"],
  },
  {
    id: "google/gemini-3-pro-preview",
    description: "Latest Gemini, cutting edge",
    tags: ["new", "powerful", "vision"],
  },
  {
    id: "openai/gpt-5-nano",
    description: "Quick & efficient for chat",
    tags: ["fast", "chat"],
  },
];

// Tiny & efficient models - great for specific use cases with comparison metrics
const TINY_MODELS = [
  {
    id: "google/gemini-2.5-flash-lite",
    description: "Ultra-fast Gemini, simple tasks",
    tags: ["tiny", "fast", "chat"],
    speed: 95,
    cost: 0.01,
    quality: 65,
  },
  {
    id: "openai/gpt-5-nano",
    description: "Fastest GPT for quick responses",
    tags: ["tiny", "fast"],
    speed: 90,
    cost: 0.02,
    quality: 60,
  },
  {
    id: "meta-llama/llama-3.2-1b-instruct",
    description: "1B params, perfect for edge devices",
    tags: ["tiny", "fast", "chat"],
    speed: 98,
    cost: 0.001,
    quality: 45,
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct",
    description: "3B params, balanced tiny model",
    tags: ["tiny", "fast", "chat"],
    speed: 92,
    cost: 0.003,
    quality: 55,
  },
  {
    id: "qwen/qwen-2.5-7b-instruct",
    description: "7B params, excellent for size",
    tags: ["tiny", "coding", "multilingual"],
    speed: 85,
    cost: 0.01,
    quality: 70,
  },
  {
    id: "mistralai/ministral-3b",
    description: "3B Mistral, edge-optimized",
    tags: ["tiny", "fast", "multilingual"],
    speed: 94,
    cost: 0.002,
    quality: 50,
  },
  {
    id: "mistralai/ministral-8b",
    description: "8B Mistral, great quality/size ratio",
    tags: ["tiny", "fast", "coding"],
    speed: 88,
    cost: 0.008,
    quality: 68,
  },
  {
    id: "google/gemma-3-4b-it",
    description: "4B Google Gemma, efficient & capable",
    tags: ["tiny", "fast", "vision"],
    speed: 91,
    cost: 0.004,
    quality: 58,
  },
  {
    id: "microsoft/phi-4",
    description: "14B Phi-4, punches above its weight",
    tags: ["tiny", "reasoning", "coding"],
    speed: 80,
    cost: 0.015,
    quality: 75,
  },
  {
    id: "deepseek/deepseek-r1-distill-qwen-7b",
    description: "7B distilled reasoning, math-focused",
    tags: ["tiny", "reasoning", "math"],
    speed: 82,
    cost: 0.012,
    quality: 72,
  },
];

// Top featured models for BYOK/tester users (full access) - agentic-compatible
const FULL_FEATURED_MODELS = [
  {
    id: "anthropic/claude-sonnet-4",
    description: "Latest Claude, exceptional reasoning",
    tags: ["agentic", "reasoning", "vision"],
  },
  {
    id: "anthropic/claude-4.5-sonnet-20250929",
    description: "Excellent reasoning & creative writing",
    tags: ["creative", "reasoning", "vision"],
  },
  {
    id: "x-ai/grok-4.1",
    description: "Full Grok, complex agentic tasks",
    tags: ["agentic", "reasoning", "coding"],
  },
  {
    id: "x-ai/grok-4.1-fast",
    description: "Fast Grok for quick agentic work",
    tags: ["agentic", "fast", "chat"],
  },
  {
    id: "x-ai/grok-code-fast-1",
    description: "Optimized for code generation",
    tags: ["coding", "agentic", "fast"],
  },
  {
    id: "deepseek/deepseek-r1",
    description: "Deep reasoning model, math & logic",
    tags: ["reasoning", "math", "agentic"],
  },
  {
    id: "deepseek/deepseek-chat",
    description: "Strong coding & chat capabilities",
    tags: ["coding", "chat", "agentic"],
  },
  {
    id: "openai/o3",
    description: "Advanced reasoning model",
    tags: ["reasoning", "powerful", "agentic"],
  },
  {
    id: "openai/o4-mini",
    description: "Fast reasoning, vision & coding",
    tags: ["reasoning", "fast", "vision"],
  },
  {
    id: "openai/gpt-4o",
    description: "Versatile multimodal model",
    tags: ["vision", "creative", "coding"],
  },
  {
    id: "google/gemini-2.5-flash",
    description: "Fast & efficient, great all-rounder",
    tags: ["fast", "vision", "coding"],
  },
  {
    id: "google/gemini-3-flash-preview-20251217",
    description: "Latest Google model, multimodal",
    tags: ["fast", "vision", "new"],
  },
  {
    id: "meta-llama/llama-4-maverick",
    description: "Latest Llama, strong general use",
    tags: ["powerful", "coding", "chat"],
  },
  {
    id: "mistralai/mistral-large",
    description: "European leader, strong reasoning",
    tags: ["reasoning", "multilingual"],
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    description: "Specialist coding model",
    tags: ["coding", "fast"],
  },
  // Add tiny models to full featured list as well
  ...TINY_MODELS,
];

// Provider info for quick filtering
const PROVIDERS = [
  { id: "all", name: "All", icon: Zap },
  { id: "anthropic", name: "Anthropic", icon: Brain },
  { id: "google", name: "Google", icon: Zap },
  { id: "openai", name: "OpenAI", icon: MessageSquare },
  { id: "meta-llama", name: "Meta", icon: Code },
  { id: "deepseek", name: "DeepSeek", icon: BookOpen },
  { id: "x-ai", name: "xAI", icon: Lightbulb },
  { id: "mistralai", name: "Mistral", icon: Zap },
  { id: "microsoft", name: "Microsoft", icon: Code },
  { id: "qwen", name: "Qwen", icon: Zap },
];

// Use cases for filtering
const USE_CASES = [
  { id: "all", name: "All Models" },
  { id: "tiny", name: "Tiny & Fast" },
  { id: "agentic", name: "Agentic" },
  { id: "vision", name: "Vision/Images" },
  { id: "coding", name: "Coding" },
  { id: "creative", name: "Creative Writing" },
  { id: "fast", name: "Fast & Cheap" },
  { id: "powerful", name: "Most Powerful" },
];

const TAG_STYLES: Record<string, string> = {
  fast: "bg-green-500/10 text-green-600 border-green-500/20",
  vision: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  coding: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  creative: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  reasoning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  powerful: "bg-red-500/10 text-red-600 border-red-500/20",
  math: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  new: "bg-primary/10 text-primary border-primary/20",
  chat: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  multilingual: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  agentic: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  tiny: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const ModelPickerModal = ({
  isOpen,
  onClose,
  models,
  selectedModels,
  panelCount,
  maxPanels,
  onSelectModel,
  onPanelCountChange,
  availableModelIds,
  userTier = "anonymous",
}: ModelPickerModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedUseCase, setSelectedUseCase] = useState("all");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showAllModels, setShowAllModels] = useState(false);

  // Get featured models based on tier
  const featuredModels = useMemo(() => {
    if (userTier === "tester" || userTier === "byok") {
      return FULL_FEATURED_MODELS;
    }
    return FREE_FEATURED_MODELS;
  }, [userTier]);

  // Get active slots
  const activeSlots = selectedModels.slice(0, panelCount);

  // Filter models - limit based on tier availability
  const filteredModels = useMemo(() => {
    // Start with available models based on tier
    let filtered = availableModelIds 
      ? models.filter(m => availableModelIds.includes(m.id))
      : models.slice(0, 100);
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query)
      );
    }

    // Provider filter
    if (selectedProvider !== "all") {
      filtered = filtered.filter((m) => m.id.startsWith(selectedProvider + "/"));
    }

    // Use case filter
    if (selectedUseCase !== "all") {
      switch (selectedUseCase) {
        case "vision":
          filtered = filtered.filter((m) =>
            m.architecture?.input_modalities?.includes("image")
          );
          break;
        case "coding":
          filtered = filtered.filter(
            (m) =>
              m.name.toLowerCase().includes("code") ||
              m.id.includes("deepseek") ||
              m.id.includes("codestral") ||
              m.name.toLowerCase().includes("coder")
          );
          break;
        case "creative":
          filtered = filtered.filter(
            (m) =>
              m.id.includes("claude") ||
              m.id.includes("gpt") ||
              m.name.toLowerCase().includes("creative")
          );
          break;
        case "fast":
          filtered = filtered.filter(
            (m) =>
              m.name.toLowerCase().includes("flash") ||
              m.name.toLowerCase().includes("fast") ||
              m.name.toLowerCase().includes("mini") ||
              m.name.toLowerCase().includes("lite") ||
              m.id.includes("free")
          );
          break;
        case "powerful":
          filtered = filtered.filter(
            (m) =>
              m.name.toLowerCase().includes("opus") ||
              m.name.toLowerCase().includes("pro") ||
              m.id.includes("gpt-4") ||
              m.id.includes("gemini-2.5-pro") ||
              m.id.includes("claude-4")
          );
          break;
        case "agentic":
          filtered = filtered.filter(
            (m) =>
              m.id.includes("claude-sonnet-4") ||
              m.id.includes("claude-4") ||
              m.id.includes("grok-4") ||
              m.id.includes("deepseek") ||
              m.id.includes("o3") ||
              m.id.includes("o4") ||
              m.id.includes("o1")
          );
          break;
        case "tiny":
          // Filter for tiny/small models
          {
            const tinyModelIds = TINY_MODELS.map(m => m.id);
            filtered = filtered.filter(
              (m) =>
                tinyModelIds.includes(m.id) ||
                m.name.toLowerCase().includes("mini") ||
                m.name.toLowerCase().includes("nano") ||
                m.name.toLowerCase().includes("lite") ||
                m.name.toLowerCase().includes("small") ||
                m.id.includes("1b") ||
                m.id.includes("3b") ||
                m.id.includes("4b") ||
                m.id.includes("7b") ||
                m.id.includes("8b") ||
                m.id.includes("ministral") ||
                m.id.includes("gemma") ||
                m.id.includes("phi-")
            );
          }
          break;
      }
    }

    return filtered;
  }, [models, searchQuery, selectedProvider, selectedUseCase]);

  const handleSelectModel = (modelId: string) => {
    if (activeSlot !== null) {
      onSelectModel(modelId, activeSlot);
      setActiveSlot(null);
    }
  };

  const supportsVision = (model: OpenRouterModel) =>
    model.architecture?.input_modalities?.includes("image");

  const getProviderColor = (modelId: string) => {
    const provider = modelId.split("/")[0];
    switch (provider) {
      case "anthropic":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "google":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "openai":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "meta-llama":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "deepseek":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
      case "x-ai":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      case "mistralai":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "microsoft":
        return "bg-sky-500/10 text-sky-600 border-sky-500/20";
      case "qwen":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  // Get model capabilities warnings
  const getModelWarnings = (model: OpenRouterModel) => {
    const warnings: string[] = [];
    if (!model.architecture?.input_modalities?.includes("image")) {
      warnings.push("Text only - no image support");
    }
    return warnings;
  };

  // Get tiny model metrics for comparison
  const getTinyModelMetrics = (modelId: string) => {
    const tinyModel = TINY_MODELS.find(m => m.id === modelId);
    return tinyModel ? { speed: tinyModel.speed, cost: tinyModel.cost, quality: tinyModel.quality } : null;
  };

  // Check if viewing landing vs browse mode
  const isLandingView = !showAllModels && !searchQuery && selectedProvider === "all" && selectedUseCase === "all";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Logo size="md" />
            {isLandingView ? "Welcome to ModelMix" : "Browse All Models"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isLandingView 
              ? "Compare AI models side-by-side. Start with our top picks or browse all models."
              : "Select models to compare. Click a slot, then choose a model."}
          </p>
        </DialogHeader>

        {/* Slot Selection & Panel Count */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Your Model Slots ({panelCount})</p>
            {onPanelCountChange && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onPanelCountChange(Math.max(1, panelCount - 1))}
                  disabled={panelCount <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm w-6 text-center">{panelCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onPanelCountChange(Math.min(maxPanels, panelCount + 1))}
                  disabled={panelCount >= maxPanels}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSlots.map((modelId, index) => {
              const model = models.find((m) => m.id === modelId);
              const isActive = activeSlot === index;
              return (
                <Button
                  key={index}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`h-auto py-2 px-3 ${isActive ? "" : "hover:bg-muted"}`}
                  onClick={() => setActiveSlot(isActive ? null : index)}
                >
                  <span className="font-medium mr-2">Slot {index + 1}:</span>
                  <span className="text-xs opacity-80 truncate max-w-[120px]">
                    {model?.name || modelId}
                  </span>
                  {isActive && <Check className="h-3 w-3 ml-2" />}
                </Button>
              );
            })}
          </div>
          {activeSlot === null && (
            <p className="text-xs text-muted-foreground mt-2">
              👆 Click a slot to change its model
            </p>
          )}
          {activeSlot !== null && (
            <p className="text-xs text-primary mt-2">
              ✓ Now select a model from the list below for Slot {activeSlot + 1}
            </p>
          )}
        </div>

        {/* Landing View - Featured Models Table */}
        {isLandingView ? (
          <>
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Top 10 Recommended Models</h3>
                </div>
                
                {/* Table Layout */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Model</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Description</th>
                        <th className="px-4 py-3 font-medium">Capabilities</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Metrics</th>
                        <th className="px-4 py-3 font-medium text-center w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {featuredModels.map((featured) => {
                        const model = models.find((m) => m.id === featured.id);
                        if (!model) return null;
                        
                        const isSelected = activeSlots.includes(model.id);
                        const hasVision = supportsVision(model);
                        const warnings = getModelWarnings(model);
                        const provider = model.id.split("/")[0];
                        const metrics = getTinyModelMetrics(model.id);

                        return (
                          <tr
                            key={model.id}
                            className={`
                              transition-all cursor-pointer
                              ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}
                              ${activeSlot === null ? "opacity-60 cursor-not-allowed" : ""}
                            `}
                            onClick={() => activeSlot !== null && handleSelectModel(model.id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm">{model.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">{provider}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <p className="text-sm text-muted-foreground">{featured.description}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {featured.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className={`text-xs ${TAG_STYLES[tag] || "bg-muted"}`}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {warnings.length > 0 && (
                                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    text only
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              {metrics ? (
                                <div className="flex gap-2 text-xs">
                                  <span className="flex items-center gap-1" title="Speed">
                                    <Zap className="h-3 w-3 text-green-500" />
                                    {metrics.speed}%
                                  </span>
                                  <span className="flex items-center gap-1" title="Quality">
                                    <Star className="h-3 w-3 text-amber-500" />
                                    {metrics.quality}%
                                  </span>
                                  <span className="flex items-center gap-1" title="Cost/1K tokens">
                                    <DollarSign className="h-3 w-3 text-emerald-500" />
                                    ${metrics.cost}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isSelected ? (
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Slot {activeSlots.indexOf(model.id) + 1}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollArea>

            {/* Footer with Browse All */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setShowAllModels(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Browse Top 100 Models
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        ) : (
          <>
            {/* Filters */}
            <div className="px-6 py-4 space-y-4 border-b border-border">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Provider Tabs */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {PROVIDERS.map((provider) => {
                    const Icon = provider.icon;
                    return (
                      <Button
                        key={provider.id}
                        variant={selectedProvider === provider.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedProvider(provider.id)}
                        className="shrink-0"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {provider.name}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Use Case Tabs */}
              <Tabs value={selectedUseCase} onValueChange={setSelectedUseCase}>
                <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
                  {USE_CASES.map((uc) => (
                    <TabsTrigger
                      key={uc.id}
                      value={uc.id}
                      className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {uc.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Model Grid */}
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredModels.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No models found matching your criteria
                  </div>
                ) : (
                  filteredModels.map((model) => {
                    const isSelected = activeSlots.includes(model.id);
                    const hasVision = supportsVision(model);
                    const provider = model.id.split("/")[0];
                    const warnings = getModelWarnings(model);

                    return (
                      <div
                        key={model.id}
                        className={`
                          relative border rounded-lg p-4 transition-all cursor-pointer
                          ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
                          ${activeSlot === null ? "opacity-60 cursor-not-allowed" : ""}
                        `}
                        onClick={() => activeSlot !== null && handleSelectModel(model.id)}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Slot {activeSlots.indexOf(model.id) + 1}
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate pr-16">
                              {model.name}
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {model.id}
                            </p>

                            {/* Capabilities */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getProviderColor(model.id)}`}
                              >
                                {provider}
                              </Badge>
                              {hasVision && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Vision
                                </Badge>
                              )}
                              {model.context_length && (
                                <Badge variant="outline" className="text-xs">
                                  {(model.context_length / 1000).toFixed(0)}K ctx
                                </Badge>
                              )}
                              {model.pricing?.prompt === "0" && (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                                  <DollarSign className="h-3 w-3 mr-0.5" />
                                  Free
                                </Badge>
                              )}
                            </div>

                            {/* Warnings */}
                            {warnings.length > 0 && !hasVision && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                                <AlertTriangle className="h-3 w-3" />
                                {warnings[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAllModels(false);
                    setSearchQuery("");
                    setSelectedProvider("all");
                    setSelectedUseCase("all");
                  }}
                >
                  ← Back to Featured
                </Button>
                <p className="text-sm text-muted-foreground">
                  {filteredModels.length} models
                </p>
              </div>
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModelPickerModal;
