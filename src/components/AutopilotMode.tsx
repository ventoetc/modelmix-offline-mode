import { useState, useCallback, useEffect } from "react";
import { Play, Pause, Settings2, Zap, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChatResponse } from "@/types";
import { toast } from "@/hooks/use-toast";

interface AutopilotModeProps {
  isActive: boolean;
  onToggle: () => void;
  onNextPrompt: (prompt: string, targetModels?: string[]) => void;
  responses: ChatResponse[];
  availableModels: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

interface AutopilotConfig {
  enabled: boolean;
  strategy: "round-robin" | "sequential" | "broadcast";
  rounds: number;
  delaySeconds: number;
  autoGenerate: boolean;
  promptTemplate: string;
}

const DEFAULT_CONFIG: AutopilotConfig = {
  enabled: false,
  strategy: "round-robin",
  rounds: 5,
  delaySeconds: 3,
  autoGenerate: true,
  promptTemplate: "Continue writing the next chapter...",
};

const AutopilotMode = ({
  isActive,
  onToggle,
  onNextPrompt,
  responses,
  availableModels,
  disabled,
}: AutopilotModeProps) => {
  const [config, setConfig] = useState<AutopilotConfig>(() => {
    const saved = localStorage.getItem("modelmix-autopilot-config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [currentRound, setCurrentRound] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem("modelmix-autopilot-config", JSON.stringify(config));
  }, [config]);

  const getNextModelInRotation = useCallback(() => {
    if (availableModels.length === 0) return null;
    const lastResponse = responses[responses.length - 1];
    if (!lastResponse) return availableModels[0].id;

    const currentIndex = availableModels.findIndex((m) => m.id === lastResponse.model);
    const nextIndex = (currentIndex + 1) % availableModels.length;
    return availableModels[nextIndex].id;
  }, [availableModels, responses]);

  const generateContextualPrompt = useCallback(
    (targetModel?: string) => {
      const recentResponses = responses.slice(-2);
      const lastTopic = recentResponses[0]?.prompt || "";

      if (config.autoGenerate && recentResponses.length > 0) {
        // Smart prompt generation based on last responses
        const prompts = [
          `@${targetModel} Continue the discussion from your last point`,
          `@${targetModel} Expand on that with a specific example`,
          `@${targetModel} What's the next logical step?`,
          `@${targetModel} Provide an alternative perspective`,
          `@${targetModel} Deep dive into the technical details`,
          `@${targetModel} Write the next chapter of this story`,
        ];
        return prompts[Math.floor(Math.random() * prompts.length)];
      }

      return config.promptTemplate;
    },
    [responses, config]
  );

  const executeNextRound = useCallback(async () => {
    if (currentRound >= config.rounds) {
      toast({ title: "Autopilot Complete", description: `Completed ${config.rounds} rounds.` });
      onToggle();
      setCurrentRound(0);
      return;
    }

    setIsProcessing(true);

    try {
      let targetModels: string[] = [];
      const modelName = availableModels[0]?.name || "model";

      switch (config.strategy) {
        case "round-robin": {
          const nextModelId = getNextModelInRotation();
          if (nextModelId) {
            targetModels = [nextModelId];
            const prompt = generateContextualPrompt(nextModelId);
            await onNextPrompt(prompt, targetModels);
          }
          break;
        }
        case "sequential": {
          // Send to each model one by one in sequence
          const modelIndex = currentRound % availableModels.length;
          const model = availableModels[modelIndex];
          targetModels = [model.id];
          const prompt = generateContextualPrompt(model.id);
          await onNextPrompt(prompt, targetModels);
          break;
        }
        case "broadcast": {
          // Send to all models
          targetModels = availableModels.map((m) => m.id);
          const prompt = generateContextualPrompt();
          await onNextPrompt(prompt, targetModels);
          break;
        }
      }

      setCurrentRound((prev) => prev + 1);

      // Wait before next round
      if (currentRound + 1 < config.rounds) {
        setTimeout(() => {
          if (isActive) {
            executeNextRound();
          }
        }, config.delaySeconds * 1000);
      }
    } catch (error) {
      console.error("Autopilot error:", error);
      toast({
        title: "Autopilot Error",
        description: error instanceof Error ? error.message : "Failed to execute round",
        variant: "destructive",
      });
      onToggle();
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentRound,
    config,
    isActive,
    availableModels,
    generateContextualPrompt,
    getNextModelInRotation,
    onNextPrompt,
    onToggle,
  ]);

  useEffect(() => {
    if (isActive && !isProcessing && currentRound === 0) {
      executeNextRound();
    }
  }, [isActive, isProcessing, currentRound, executeNextRound]);

  const handleToggle = () => {
    if (isActive) {
      setCurrentRound(0);
      setIsProcessing(false);
    }
    onToggle();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={disabled || availableModels.length === 0}
        className={cn(
          "h-8 gap-2",
          isActive && "bg-primary text-primary-foreground animate-pulse"
        )}
      >
        {isActive ? (
          <>
            <Pause className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stop Autopilot</span>
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Autopilot</span>
          </>
        )}
        {isActive && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {currentRound}/{config.rounds}
          </Badge>
        )}
      </Button>

      {isActive && isProcessing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Processing round {currentRound + 1}...</span>
        </div>
      )}

      <Popover open={showSettings} onOpenChange={setShowSettings}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isActive}
            title="Configure autopilot"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Autopilot Configuration</h4>
              <p className="text-xs text-muted-foreground">
                Automatically run multiple conversation rounds with smart prompt generation.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Routing Strategy</Label>
              <Select
                value={config.strategy}
                onValueChange={(value: AutopilotConfig["strategy"]) =>
                  setConfig({ ...config, strategy: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3" />
                      <div>
                        <div className="font-medium">Round Robin</div>
                        <div className="text-[10px] text-muted-foreground">
                          Alternate between models
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="sequential">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">Sequential</div>
                        <div className="text-[10px] text-muted-foreground">
                          Each model in order, repeat
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="broadcast">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">Broadcast</div>
                        <div className="text-[10px] text-muted-foreground">
                          All models respond each round
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Number of Rounds</Label>
                <Badge variant="secondary" className="text-[10px]">
                  {config.rounds}
                </Badge>
              </div>
              <Slider
                value={[config.rounds]}
                onValueChange={([value]) => setConfig({ ...config, rounds: value })}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Delay Between Rounds</Label>
                <Badge variant="secondary" className="text-[10px]">
                  {config.delaySeconds}s
                </Badge>
              </div>
              <Slider
                value={[config.delaySeconds]}
                onValueChange={([value]) => setConfig({ ...config, delaySeconds: value })}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-generate"
                checked={config.autoGenerate}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, autoGenerate: checked as boolean })
                }
              />
              <Label htmlFor="auto-generate" className="text-xs cursor-pointer">
                Auto-generate contextual prompts
              </Label>
            </div>

            {!config.autoGenerate && (
              <div className="space-y-2">
                <Label className="text-xs">Prompt Template</Label>
                <Input
                  value={config.promptTemplate}
                  onChange={(e) => setConfig({ ...config, promptTemplate: e.target.value })}
                  placeholder="Enter prompt template..."
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AutopilotMode;
