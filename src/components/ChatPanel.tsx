import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Maximize2, Loader2, ImageIcon, Copy, Volume2, VolumeX, Settings2, RefreshCw, AlertCircle, X, MessageSquare, Eye, Lock, MoreHorizontal, FileText, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ResponseAbstract from "@/components/ResponseAbstract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatResponse } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { GroupedModels } from "@/hooks/useOpenRouterModels";


// Vendor display names for top models grouping
const VENDOR_NAMES: Record<string, string> = {
  "openai": "OpenAI",
  "anthropic": "Anthropic",
  "google": "Google",
  "meta-llama": "Meta",
  "mistralai": "Mistral",
  "deepseek": "DeepSeek",
  "x-ai": "xAI",
};

// Top popular models from major providers to show by default in dropdown
const TOP_MODEL_IDS = [
  // OpenAI
  "openai/gpt-4o",
  "openai/gpt-4.5-preview",
  "openai/gpt-4-turbo",
  "openai/o1-preview",
  // Anthropic (Claude)
  "anthropic/claude-4.5-sonnet-20250929",
  "anthropic/claude-4.5-opus-20251124",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
  // Google
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  // Meta (Llama)
  "meta-llama/llama-4-maverick",
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-405b-instruct",
  // Mistral
  "mistralai/mistral-large",
  "mistralai/mistral-medium",
  "mistralai/mixtral-8x22b-instruct",
  // DeepSeek
  "deepseek/deepseek-v3.2-20251201",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-coder",
  // X.AI (Grok)
  "x-ai/grok-code-fast-1",
  "x-ai/grok-4.1-fast",
];

export type ResponseDepth = "basic" | "detailed";

// Anonymous tier - just 2 models (one per slot)
const ANONYMOUS_MODEL_IDS = ["google/gemini-2.5-flash", "openai/gpt-5-mini"];

// Free tier model IDs (7 Lovable AI models)
const FREE_MODEL_IDS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite", 
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

interface ChatPanelProps {
  modelId: string;
  modelName: string;
  response?: ChatResponse;
  isLoading?: boolean;
  isCollapsed?: boolean; // Legacy - keeping for compatibility
  isLocked?: boolean;
  isFreeTier?: boolean; // Whether user is on free tier (no API key)
  isAnonymous?: boolean; // Whether user is anonymous (most limited)
  panelIndex?: number; // Index of this panel for model assignment
  isInvalid?: boolean; // Model has been marked as failed/invalid
  reliabilityPercent?: number | null; // Model health reliability percentage
  supportsVision?: boolean; // Whether the model supports image inputs
  responseDepth: ResponseDepth;
  onDepthChange: (depth: ResponseDepth) => void;
  onToggleCollapse?: () => void; // Legacy
  onOpenLightbox: () => void;
  onOpenThread?: () => void;
  onModelChange: (modelId: string) => void;
  onInfoClick?: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  availableModels: { id: string; name: string }[];
  groupedModels?: GroupedModels[];
  maxHeight?: number;
  hasMultipleTurns?: boolean;
  systemPrompt?: string;
  onSystemPromptChange?: (prompt: string) => void;
  activePersonaLabel?: string | null;
  onActivePersonaLabelChange?: (label: string | null) => void;
  savedPersonas?: Array<{ id: string; name: string; prompt: string }>;
  onSavePersona?: (name: string, prompt: string) => void;
  onDeletePersona?: (id: string) => void;
}

// Helper: Extract first 3-4 sentences as abstract (longer, more engaging)
const extractAbstract = (text: string): string => {
  if (!text) return "";
  
  // Remove code blocks first to avoid extracting code as abstract
  const withoutCode = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  
  // Match sentences ending with . ! or ?
  const sentences = withoutCode.match(/[^.!?]+[.!?]+/g) || [withoutCode];
  
  // Take up to 4 sentences for a more complete summary
  const abstract = sentences.slice(0, 4).join(" ").trim();
  
  // Remove markdown formatting for cleaner abstract
  const cleaned = abstract
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Allow up to 350 characters for a more engaging read
  return cleaned.length > 350 ? cleaned.slice(0, 347) + "..." : cleaned;
};

// Helper: Extract key points (headers or first sentence of paragraphs)
const extractKeyPoints = (text: string): string[] => {
  if (!text) return [];
  
  // Try to extract headers first
  const headers = text.match(/^#{1,3}\s+.+$/gm) || [];
  if (headers.length > 0) {
    return headers.slice(0, 4).map(h => h.replace(/^#{1,3}\s+/, ""));
  }
  
  // Fall back to first sentence of each paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim() && !p.startsWith("```"));
  return paragraphs.slice(1, 4).map(p => {
    const firstSentence = p.split(/[.!?]/)[0].replace(/#{1,6}\s/g, "").trim();
    return firstSentence.length > 80 ? firstSentence.slice(0, 77) + "..." : firstSentence;
  });
};

// Helper: Get in-depth content (first 2 paragraphs)
const extractInDepth = (text: string): string => {
  if (!text) return "";
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.slice(0, 3).join("\n\n");
};

const ChatPanel = ({
  modelId,
  modelName,
  response,
  isLoading,
  isLocked = false,
  isFreeTier = false,
  isAnonymous = false,
  panelIndex = 0,
  isInvalid = false,
  reliabilityPercent,
  supportsVision = false,
  responseDepth,
  onDepthChange,
  onOpenLightbox,
  onOpenThread,
  onModelChange,
  onInfoClick,
  onRetry,
  onRemove,
  availableModels,
  groupedModels = [],
  maxHeight = 300,
  hasMultipleTurns = false,
  systemPrompt,
  onSystemPromptChange,
  activePersonaLabel = null,
  onActivePersonaLabelChange,
  savedPersonas = [],
  onSavePersona,
  onDeletePersona,
}: ChatPanelProps) => {
  const navigate = useNavigate();
  const [showAllModels, setShowAllModels] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Check if current model is a free tier model
  const isCurrentModelFree = FREE_MODEL_IDS.includes(modelId);

  // Free tier models only
  const freeModels = useMemo(() => 
    (availableModels || []).filter(m => FREE_MODEL_IDS.includes(m.id)),
    [availableModels]
  );

  // Handle model change - free tier users can only pick free models
  const handleModelChange = (newModelId: string) => {
    onModelChange(newModelId);
  };


  const handleCopy = () => {
    if (response?.response) {
      navigator.clipboard.writeText(response.response);
      toast({ title: "Copied to clipboard" });
    }
  };

  const handleSpeak = () => {
    if (!response?.response) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(response.response);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Get top models grouped by vendor for initial view
  const topGroupedModels = useMemo(() => {
    const safeAvailableModels = availableModels || [];
    const topModels = safeAvailableModels.filter(m => TOP_MODEL_IDS.includes(m.id));
    const currentModel = safeAvailableModels.find(m => m.id === modelId);
    const isCurrentInTop = TOP_MODEL_IDS.includes(modelId);
    
    // Add current model if not in top
    const modelsToGroup = [...topModels];
    if (currentModel && !isCurrentInTop) {
      modelsToGroup.push(currentModel);
    }
    
    // Group by vendor
    const vendorMap = new Map<string, { id: string; name: string }[]>();
    for (const model of modelsToGroup) {
      const vendor = model.id.split("/")[0];
      if (!vendorMap.has(vendor)) {
        vendorMap.set(vendor, []);
      }
      vendorMap.get(vendor)!.push(model);
    }
    
    // Order by priority
    const vendorOrder = ["openai", "anthropic", "google", "x-ai", "deepseek", "meta-llama", "mistralai"];
    return vendorOrder
      .filter(v => vendorMap.has(v))
      .map(vendor => ({
        vendor,
        vendorDisplayName: VENDOR_NAMES[vendor] || vendor,
        models: vendorMap.get(vendor)!,
      }));
  }, [availableModels, modelId]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[role='combobox']") ||
      target.closest("[role='listbox']") ||
      target.closest("[role='menu']")
    ) {
      return;
    }
    
    // Toggle between summary and detail on click
    if (response && !isTransitioning) {
      setIsTransitioning(true);
      
      if (responseDepth === "basic") {
        onDepthChange("detailed");
      } else {
        onDepthChange("basic");
      }
      
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[role='combobox']") ||
      target.closest("[role='listbox']")
    ) {
      return;
    }
    
    if (response) {
      onOpenLightbox();
    }
  };

  // Extract content based on depth
  const abstract = response ? extractAbstract(response.response) : "";
  const keyPoints = response ? extractKeyPoints(response.response) : [];
  const inDepthContent = response ? extractInDepth(response.response) : "";

  // Calculate height based on depth
  const getCardHeight = () => {
    if (!response) return "auto";
    switch (responseDepth) {
      case "basic": return "auto"; // Compact summary
      case "detailed": return "auto"; // Full scrollable
    }
  };

  // Get depth indicator for visual feedback
  const nextDepthHint = responseDepth === "basic" ? "Tap for full response" : "Tap to collapse";

  return (
    <Card
      className={cn(
        "transition-all duration-300 overflow-hidden cursor-pointer group/card",
        "hover:shadow-md hover:border-primary/30",
        responseDepth === "basic" && "h-auto",
        isInvalid && "border-destructive/50 bg-destructive/5",
        isTransitioning && "scale-[0.99] opacity-90",
        response && "active:scale-[0.98]"
      )}
      onClick={handleCardClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Invalid model warning banner */}
      {isInvalid && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-1.5 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>This model was auto-swapped due to errors</span>
        </div>
      )}
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
            {isLocked || isAnonymous ? (
              // Locked display (during conversation) or anonymous (fixed model per slot)
              <div className="px-2 sm:px-3 h-8 flex items-center text-xs sm:text-sm font-medium text-foreground bg-muted rounded-md border border-border max-w-full overflow-hidden gap-2">
                <span
                  className="truncate block max-w-[100px] sm:max-w-[160px]"
                  title={`${response?.personaName || activePersonaLabel || modelName}${(response?.personaName || activePersonaLabel) ? ` • ${modelName}` : ""}`}
                >
                  {response?.personaName || activePersonaLabel || modelName}
                </span>
                {supportsVision && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Eye className="h-3 w-3 text-primary shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Supports image inputs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {isAnonymous && !isLocked && (
                  <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                {/* Private/Isolated Indicator */}
                {(isLocked || response?.visibility === 'private' || response?.visibility === 'mentioned') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20">
                          <Lock className="h-2.5 w-2.5" />
                          <span className="text-[10px] font-medium">Private</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Private Context - Isolated from other models</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ) : isFreeTier ? (
              // Free tier: dropdown with 7 Lovable AI models
              <Select value={modelId} onValueChange={handleModelChange}>
                <SelectTrigger className="w-[120px] sm:w-[160px] md:w-[180px] h-8 text-xs sm:text-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Choose from 7 models" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover z-50">
                  {freeModels?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex items-center gap-2">
                        {model.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">
                          FREE
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                  <div 
                    className="px-3 py-2.5 text-xs cursor-pointer hover:bg-primary/10 flex items-center justify-center gap-2 border-t border-border mt-1 text-primary font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/waitlist");
                    }}
                  >
                    <Lock className="h-3 w-3" />
                    Sign up for 50+ AI models
                  </div>
                </SelectContent>
              </Select>
            ) : (
              // Authenticated/BYOK: full model selection
              <Select value={modelId} onValueChange={handleModelChange}>
                <SelectTrigger className="w-[120px] sm:w-[160px] md:w-[180px] h-8 text-xs sm:text-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Select model" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover z-50">
                  {!showAllModels ? (
                    // Show grouped top models
                    <>
                      {topGroupedModels?.map((group) => (
                        <SelectGroup key={group.vendor}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                            {group.vendorDisplayName}
                          </SelectLabel>
                          {group.models.map((model) => {
                            const isFree = FREE_MODEL_IDS.includes(model.id);
                            return (
                              <SelectItem key={model.id} value={model.id} className="pl-4" textValue={model.name}>
                      <span className="flex items-center gap-2">
                        {model.name}
                        {isFree && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">
                            FREE
                          </span>
                        )}
                      </span>
                    </SelectItem>
                            );
                          })}
                        </SelectGroup>
                      ))}
                          {availableModels?.length > TOP_MODEL_IDS.length && (
                        <div 
                          className="px-2 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted flex items-center justify-center gap-1 border-t border-border mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAllModels(true);
                          }}
                        >
                          <ChevronDown className="h-3 w-3" />
                          Show all {availableModels?.length} models
                        </div>
                      )}
                    </>
                  ) : (
                    // Show all models grouped by vendor
                    <>
                      {groupedModels?.map((group) => (
                        <SelectGroup key={group.vendor}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5 sticky top-0 bg-popover">
                            {group.vendorDisplayName}
                          </SelectLabel>
                          {group.models.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="pl-4" textValue={model.name}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      <div 
                        className="px-2 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted flex items-center justify-center gap-1 border-t border-border mt-1 sticky bottom-0 bg-popover"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllModels(false);
                        }}
                      >
                        <ChevronUp className="h-3 w-3" />
                        Show less
                      </div>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            
            {/* Model reliability indicator */}
            {isLoading && !response ? (
              <div className="flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Processing...</span>
                <span className="hidden sm:inline opacity-70 border-l border-primary/20 pl-2 ml-1">GPU Active</span>
              </div>
            ) : (
              reliabilityPercent !== null && reliabilityPercent !== undefined && (
                <div 
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                    reliabilityPercent >= 80 ? "bg-success/10 text-success" :
                    reliabilityPercent >= 50 ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  )}
                  title={`Reliability: ${reliabilityPercent}%`}
                >
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    reliabilityPercent >= 80 ? "bg-success" :
                    reliabilityPercent >= 50 ? "bg-warning" :
                    "bg-destructive"
                  )} />
                  {reliabilityPercent}%
                </div>
              )
            )}
          </div>
        </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {/* Primary actions - always visible */}
            {onSystemPromptChange && (
              <Popover>
                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      systemPrompt ? "text-primary" : "text-muted-foreground"
                    )}
                    title="Edit System Prompt"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">System Prompt</h4>
                      <p className="text-sm text-muted-foreground">
                        Override the system prompt for this model.
                      </p>
                      <Textarea
                        value={systemPrompt || ""}
                        onChange={(e) => {
                          onActivePersonaLabelChange?.(null);
                          onSystemPromptChange?.(e.target.value);
                        }}
                        placeholder="Enter a custom system prompt..."
                        className="min-h-[100px] text-xs"
                      />
                    </div>

                    {onSavePersona && (
                      <div className="pt-2 border-t space-y-2">
                        <Label className="text-xs font-medium">Saved Presets</Label>
                        
                        {(savedPersonas?.length || 0) > 0 ? (
                          <div className="max-h-[120px] overflow-y-auto space-y-1 border rounded-md p-1">
                            {savedPersonas?.map((persona) => (
                              <div key={persona.id} className="flex items-center justify-between gap-2 p-1.5 hover:bg-muted rounded group text-xs">
                                <span 
                                  className="truncate flex-1 cursor-pointer font-medium"
                                  onClick={() => {
                                    onSystemPromptChange?.(persona.prompt);
                                    onActivePersonaLabelChange?.(persona.name);
                                    toast({ description: `Loaded preset: ${persona.name}` });
                                  }}
                                  title={persona.prompt}
                                >
                                  {persona.name}
                                </span>
                                {onDeletePersona && !persona.isReadOnly && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeletePersona(persona.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">No saved presets yet.</p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Input 
                            placeholder="New preset name..." 
                            value={newPersonaName} 
                            onChange={(e) => setNewPersonaName(e.target.value)}
                            className="h-7 text-xs" 
                          />
                          <Button 
                            size="sm" 
                            className="h-7 px-2"
                            disabled={!newPersonaName.trim() || !systemPrompt?.trim()}
                            onClick={() => {
                              if (onSavePersona && newPersonaName.trim() && systemPrompt) {
                                onSavePersona(newPersonaName, systemPrompt);
                                setNewPersonaName("");
                              }
                            }}
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {response && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}

            {response && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onOpenLightbox(); }}
                title="Expand"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Overflow menu for secondary actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {response && (
                  <>
                    <DropdownMenuItem onClick={handleSpeak}>
                      {isSpeaking ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                      {isSpeaking ? "Stop speaking" : "Read aloud"}
                    </DropdownMenuItem>

                    {onInfoClick && (
                      <DropdownMenuItem onClick={onInfoClick}>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Model info
                      </DropdownMenuItem>
                    )}

                    {hasMultipleTurns && onOpenThread && (
                      <DropdownMenuItem onClick={onOpenThread}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View thread
                      </DropdownMenuItem>
                    )}

                    {(onInfoClick || hasMultipleTurns) && onRemove && <DropdownMenuSeparator />}
                  </>
                )}

                {/* Remove model - moved from header to prevent accidental taps */}
                {onRemove && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRemoveConfirm(true);
                    }}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove from session
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Attachment indicator */}
            {response?.hasAttachment && (
              <div className="flex items-center text-muted-foreground" title="Included image">
                <ImageIcon className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>

        {response && (
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-3">
              {response.latency && <span>{response.latency}ms</span>}
              {response.tokenCount !== undefined && <span>{response.tokenCount} tokens</span>}
              {!response.isError && typeof response.tokenDelta === "number" && (
                <span>
                  Δ {response.tokenDelta >= 0 ? `+${response.tokenDelta}` : response.tokenDelta} tokens
                </span>
              )}
              {!response.isError && typeof response.cumulativeTokens === "number" && (
                <span>Σ {response.cumulativeTokens} tokens</span>
              )}
              {response.isError && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Error
                </span>
              )}
              {!response.isError && (
                <span className="text-green-600 dark:text-green-500 text-[10px]">✓</span>
              )}
            </div>
            
            {response?.agentId && (
              <Badge variant="outline" className="text-[10px] font-mono">
                Agent {response.agentId.slice(0, 8)}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            {modelId.includes("local") || modelId === "local-model" ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground font-medium animate-pulse">
                  Processing on local GPU...
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  This may heat up your device
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground animate-pulse">
                Generating response...
              </span>
            )}
          </div>
        ) : response?.isError ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive text-center max-w-xs">
              {response.response}
            </p>
            <div className="flex gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Swap Model
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Switch to a different model
                  </div>
                  <DropdownMenuSeparator />
                  {(availableModels || []).slice(0, 15).map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModelChange(model.id);
                        // Retry immediately after swapping model
                        setTimeout(() => {
                          if (onRetry) onRetry();
                        }, 100);
                      }}
                    >
                      {model.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : response ? (
          <div className="space-y-3 relative">
            {/* Tap hint indicator */}
            <div className="absolute -top-1 right-0 text-[10px] text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
              {nextDepthHint}
            </div>
            
            {/* Basic Mode: Just the abstract */}
            {responseDepth === "basic" && (
              <ResponseAbstract abstract={abstract} />
            )}

            {/* Detailed Mode: Abstract (collapsible) + Full Response */}
            {responseDepth === "detailed" && (
              <>
                <ResponseAbstract 
                  abstract={abstract} 
                  isCollapsible 
                  isPinned 
                />
                
                <div 
                  className="overflow-y-auto border-t border-border pt-3"
                  style={{ maxHeight: `${maxHeight}px` }}
                >
                  <MarkdownRenderer content={response.response} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Send a prompt to see the response
          </div>
        )}
      </CardContent>

      {/* Removal Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {modelName} from session?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasMultipleTurns
                ? "This model has conversation history in this session. Removing it will hide its responses, but you can add it back later."
                : "This model hasn't responded yet. You can add it back anytime."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
                setShowRemoveConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ChatPanel;