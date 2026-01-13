import * as React from "react";
import { Circle, MessageSquare, Clock, RotateCcw } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Round {
  index: number;
  prompt: string;
  timestamp: string;
  responseCount: number;
}

interface RoundNavigatorProps {
  rounds: Round[];
  currentRound: number | "all";
  onSelectRound: (round: number | "all") => void;
  onOpenTimeline?: () => void;
  failedModelsCount?: number;
  onClearFailedModels?: () => void;
}

const RoundNavigator = React.forwardRef<HTMLDivElement, RoundNavigatorProps>(
  ({ rounds, currentRound, onSelectRound, onOpenTimeline, failedModelsCount = 0, onClearFailedModels }, ref) => {
  if (rounds.length <= 1) return null;

  const truncatePrompt = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + "...";
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="border-b border-border bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 py-3">
      <div className="container mx-auto px-4">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0 pb-2 min-w-max">
            {/* Current/Latest Node */}
            <button
              onClick={() => onSelectRound("all")}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 group",
                currentRound === "all" 
                  ? "bg-primary/10" 
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all duration-200",
                currentRound === "all"
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "border-muted-foreground/30 bg-background text-muted-foreground group-hover:border-primary/50"
              )}>
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors",
                currentRound === "all" ? "text-primary" : "text-muted-foreground"
              )}>
                Latest
              </span>
            </button>

            {/* Timeline connector */}
            <div className="flex items-center h-10">
              <div className="w-8 h-0.5 bg-gradient-to-r from-primary/50 to-muted-foreground/30" />
            </div>

            {/* Round Nodes */}
            {rounds.map((round, idx) => (
              <div key={round.index} className="flex items-center">
                <button
                  onClick={() => onSelectRound(round.index)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 group min-w-[80px]",
                    currentRound === round.index 
                      ? "bg-primary/10" 
                      : "hover:bg-muted"
                  )}
                  title={round.prompt}
                >
                  {/* Node circle */}
                  <div className={cn(
                    "relative flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all duration-200",
                    currentRound === round.index
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "border-muted-foreground/30 bg-background text-muted-foreground group-hover:border-primary/50"
                  )}>
                    <span className="text-sm font-bold">{idx + 1}</span>
                    {/* Response count badge */}
                    {round.responseCount > 0 && (
                      <span className={cn(
                        "absolute -top-1 -right-1 h-4 w-4 rounded-full text-[10px] font-medium flex items-center justify-center",
                        currentRound === round.index
                          ? "bg-background text-primary border border-primary"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {round.responseCount}
                      </span>
                    )}
                  </div>
                  
                  {/* Prompt preview */}
                  <span className={cn(
                    "text-[10px] max-w-[100px] truncate text-center transition-colors leading-tight",
                    currentRound === round.index 
                      ? "text-foreground font-medium" 
                      : "text-muted-foreground"
                  )}>
                    {truncatePrompt(round.prompt, 20)}
                  </span>
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-muted-foreground/60">
                    {formatTime(round.timestamp)}
                  </span>
                </button>

                {/* Connector line to next node */}
                {idx < rounds.length - 1 && (
                  <div className="flex items-center h-10">
                    <div className={cn(
                      "w-6 h-0.5 transition-colors",
                      currentRound === round.index || currentRound === rounds[idx + 1]?.index
                        ? "bg-primary/50"
                        : "bg-muted-foreground/20"
                    )} />
                    <Circle className={cn(
                      "h-1.5 w-1.5 -mx-0.5",
                      currentRound === round.index || currentRound === rounds[idx + 1]?.index
                        ? "text-primary/50 fill-primary/50"
                        : "text-muted-foreground/30 fill-muted-foreground/30"
                    )} />
                    <div className={cn(
                      "w-6 h-0.5 transition-colors",
                      currentRound === rounds[idx + 1]?.index
                        ? "bg-primary/50"
                        : "bg-muted-foreground/20"
                    )} />
                  </div>
                )}
              </div>
            ))}
            
            {/* Clear failed models button */}
            {failedModelsCount > 0 && onClearFailedModels && (
              <div className="flex items-center ml-2 pl-2 border-l border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFailedModels}
                  className="gap-2 text-xs text-destructive hover:text-destructive"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear {failedModelsCount} Failed
                </Button>
              </div>
            )}
            
            {/* Timeline button */}
            {onOpenTimeline && (
              <div className="flex items-center ml-2 pl-2 border-l border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenTimeline}
                  className="gap-2 text-xs"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Timeline
                </Button>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
});

RoundNavigator.displayName = "RoundNavigator";

export default RoundNavigator;
