import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, ChevronDown, Lock, Search } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  models: { id: string; name: string }[];
  onInfoClick?: () => void;
  isFreeTier?: boolean;
  isAnonymous?: boolean;
  slotIndex?: number; // Used to assign different default models per slot for anonymous
}

// Anonymous tier - just 2 models (one per slot)
export const ANONYMOUS_MODEL_IDS = [
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
];

// Free tier models - Lovable AI models (diverse selection)
export const FREE_TIER_MODEL_IDS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

// Top 10 popular models to show by default
const TOP_MODEL_IDS = [
  "google/gemini-2.5-flash",
  "anthropic/claude-4.5-sonnet-20250929",
  "x-ai/grok-code-fast-1",
  "deepseek/deepseek-v3.2-20251201",
  "google/gemini-3-flash-preview-20251217",
  "anthropic/claude-4.5-opus-20251124",
  "openai/gpt-4o",
  "google/gemini-2.0-flash-001",
  "x-ai/grok-4.1-fast",
  "mistralai/mistral-large",
];

const ModelSelector = ({ value, onChange, models, onInfoClick, isFreeTier = false, isAnonymous = false, slotIndex = 0 }: ModelSelectorProps) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const freeModels = useMemo(() => models.filter(m => FREE_TIER_MODEL_IDS.includes(m.id)), [models]);
  const lockedFreeModels = useMemo(() => models.filter(m => !FREE_TIER_MODEL_IDS.includes(m.id)).slice(0, 5), [models]);
  const filteredFreeModels = useMemo(() => {
    if (!searchQuery.trim()) return freeModels;
    const query = searchQuery.toLowerCase();
    return freeModels.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
    );
  }, [freeModels, searchQuery]);

  // Anonymous tier: show assigned model with locked advanced options visible
  if (isAnonymous) {
    const anonymousModels = models.filter(m => ANONYMOUS_MODEL_IDS.includes(m.id));
    const assignedModel = anonymousModels[slotIndex % anonymousModels.length];
    const lockedModels = models.filter(m => !ANONYMOUS_MODEL_IDS.includes(m.id)).slice(0, 5);
    
    return (
      <div className="flex items-center gap-1 w-full">
        <Select value={assignedModel?.id || value} onValueChange={() => {
          // No-op for anonymous - they can't change
        }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Lovable AI" />
          </SelectTrigger>
          <SelectContent>
            {/* Current assigned model */}
            <SelectItem value={assignedModel?.id || ""}>
              {assignedModel?.name || "Lovable AI"}
            </SelectItem>
            
            {/* Show locked preview of other models */}
            <div className="border-t border-border mt-1 pt-1">
              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                Sign up to unlock:
              </div>
              {lockedModels.map((model) => (
                <div 
                  key={model.id}
                  className="px-3 py-1.5 text-sm text-muted-foreground/60 flex items-center justify-between cursor-not-allowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/waitlist");
                  }}
                >
                  <span className="truncate">{model.name}</span>
                  <Lock className="h-3 w-3 shrink-0 ml-2" />
                </div>
              ))}
              <div 
                className="px-3 py-2 text-xs text-primary cursor-pointer hover:bg-primary/10 flex items-center justify-center gap-2 border-t border-border mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/waitlist");
                }}
              >
                + {models.length - lockedModels.length - 2} more models
              </div>
            </div>
          </SelectContent>
        </Select>
        {onInfoClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onInfoClick}
            title="Model information"
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Free tier: show Lovable AI models with search + locked advanced preview
  if (isFreeTier) {
    return (
      <div className="flex items-center gap-1 w-full">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose from 7 Lovable AI models" />
          </SelectTrigger>
          <SelectContent>
            {/* Search input for free tier */}
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-7 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            {/* Available free models */}
            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
              Lovable AI Models
            </div>
            {filteredFreeModels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No matching models
              </div>
            ) : (
              filteredFreeModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))
            )}
            
            {/* Show locked preview of advanced models */}
            <div className="border-t border-border mt-1 pt-1">
              <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                BYOK to unlock:
              </div>
              {lockedFreeModels.map((model) => (
                <div 
                  key={model.id}
                  className="px-3 py-1.5 text-sm text-muted-foreground/60 flex items-center justify-between cursor-not-allowed hover:bg-muted/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{model.name}</span>
                  <Lock className="h-3 w-3 shrink-0 ml-2" />
                </div>
              ))}
              <div 
                className="px-3 py-2 text-xs text-primary cursor-pointer hover:bg-primary/10 flex items-center justify-center gap-2 border-t border-border mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  // Open settings drawer for BYOK
                }}
              >
                <Lock className="h-3 w-3" />
                Add API key for {models.length - lockedFreeModels.length - 7}+ models
              </div>
            </div>
          </SelectContent>
        </Select>
        {onInfoClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onInfoClick}
            title="Model information"
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Get top 10 models from the available models list
  const topModels = models.filter(m => TOP_MODEL_IDS.includes(m.id));
  
  // Make sure current selection is always visible
  const currentModel = models.find(m => m.id === value);
  const isCurrentInTop = TOP_MODEL_IDS.includes(value);
  
  // Models to display
  const displayModels = showAll 
    ? models 
    : [...topModels, ...(currentModel && !isCurrentInTop ? [currentModel] : [])];

  return (
    <div className="flex items-center gap-1 w-full">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Choose from ${models.length}+ AI models`} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {displayModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
          {!showAll && models.length > topModels.length && (
            <div 
              className="px-2 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted flex items-center justify-center gap-1 border-t border-border mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(true);
              }}
            >
              <ChevronDown className="h-3 w-3" />
              Show all {models.length} models
            </div>
          )}
          {showAll && (
            <div 
              className="px-2 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted flex items-center justify-center gap-1 border-t border-border mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(false);
              }}
            >
              Show less
            </div>
          )}
        </SelectContent>
      </Select>
      {onInfoClick && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onInfoClick}
          title="Model information"
        >
          <Info className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ModelSelector;
