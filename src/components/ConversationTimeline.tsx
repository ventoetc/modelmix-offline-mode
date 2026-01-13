import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Bot, User, Copy, MessageSquare, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ChatResponse } from "@/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ConversationTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: string[];
  responses: ChatResponse[];
  sessionTitle?: string;
  sessionStartTime?: string;
}

const ConversationTimeline = ({
  isOpen,
  onClose,
  prompts,
  responses,
  sessionTitle,
  sessionStartTime,
}: ConversationTimelineProps) => {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([0]));
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  const toggleRound = (index: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        // Optional: Close others for "Accordion" behavior if requested, 
        // but user asked for "cleanly minimize", which implies manual control.
        // We'll keep multiple open support but make the minimizing clean.
        next.add(index);
      }
      return next;
    });
  };

  const toggleModel = (key: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRounds(new Set(prompts.map((_, i) => i)));
    const allModelKeys = prompts.flatMap((_, roundIdx) =>
      responses
        .filter((r) => r.roundIndex === roundIdx)
        .map((r) => `${roundIdx}-${r.model}`)
    );
    setExpandedModels(new Set(allModelKeys));
  };

  const collapseAll = () => {
    setExpandedRounds(new Set());
    setExpandedModels(new Set());
  };

  const copyTimeline = () => {
    const text = prompts
      .map((prompt, idx) => {
        const roundResponses = responses.filter((r) => r.roundIndex === idx);
        const responsesText = roundResponses
          .map((r) => `### ${r.modelName}\n${r.response}`)
          .join("\n\n");
        return `## Round ${idx + 1}\n\n**User:** ${prompt}\n\n${responsesText}`;
      })
      .join("\n\n---\n\n");
    
    navigator.clipboard.writeText(text);
    toast({ title: "Timeline copied to clipboard" });
  };

  const getResponsesForRound = (roundIndex: number) => {
    return responses
      .filter((r) => r.roundIndex === roundIndex)
      .sort((a, b) => a.modelName.localeCompare(b.modelName));
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl p-0 flex flex-col bg-muted/10">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Conversation Timeline
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll} title="Expand All">
                <Maximize2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Expand</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll} title="Collapse All">
                <Minimize2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Collapse</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={copyTimeline} title="Copy timeline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {sessionTitle && (
            <p className="text-sm text-muted-foreground">
              {sessionTitle}
              {sessionStartTime && (
                <span className="ml-2 text-xs">
                  • Started {new Date(sessionStartTime).toLocaleDateString()}
                </span>
              )}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span>{prompts.length} round{prompts.length !== 1 ? "s" : ""}</span>
            <span>{responses.length} response{responses.length !== 1 ? "s" : ""}</span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-6 space-y-4">
            {prompts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversation yet</p>
                <p className="text-sm">Send a prompt to start</p>
              </div>
            ) : (
              prompts.map((prompt, roundIdx) => {
                const roundResponses = getResponsesForRound(roundIdx);
                const isExpanded = expandedRounds.has(roundIdx);
                const firstResponse = roundResponses[0];

                return (
                  <Card key={roundIdx} className={cn(
                    "transition-all duration-200 border shadow-sm overflow-hidden",
                    isExpanded ? "ring-1 ring-primary/20" : "hover:bg-muted/50"
                  )}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleRound(roundIdx)}>
                      <CollapsibleTrigger asChild>
                        <div className="w-full text-left cursor-pointer">
                          <CardHeader className="p-4 flex flex-row items-start space-y-0 gap-4">
                            {/* Round Number Badge */}
                            <div className={cn(
                              "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                              isExpanded 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {roundIdx + 1}
                            </div>

                            {/* Summary Content */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">You</span>
                                  {firstResponse?.timestamp && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(firstResponse.timestamp)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                    {roundResponses.length} model{roundResponses.length !== 1 ? "s" : ""}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              <p className={cn(
                                "text-sm text-foreground/90 transition-all",
                                isExpanded ? "font-medium" : "line-clamp-1 text-muted-foreground"
                              )}>
                                {prompt}
                              </p>
                            </div>
                          </CardHeader>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="p-4 pt-0 bg-muted/5 border-t">
                          {/* Full Prompt Display (if long) */}
                          <div className="mb-4 mt-4 p-3 bg-background rounded-md border text-sm leading-relaxed whitespace-pre-wrap">
                            {prompt}
                          </div>

                          {/* Responses List */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Model Responses
                            </h4>
                            {roundResponses.map((response) => {
                              const modelKey = `${roundIdx}-${response.model}`;
                              const isModelExpanded = expandedModels.has(modelKey);

                              return (
                                <Card key={response.id} className={cn(
                                  "border transition-all",
                                  response.isError ? "border-destructive/30 bg-destructive/5" : "border-border"
                                )}>
                                  <Collapsible
                                    open={isModelExpanded}
                                    onOpenChange={() => toggleModel(modelKey)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" className="w-full p-3 h-auto justify-start hover:bg-transparent">
                                        <div className="flex items-center gap-3 w-full">
                                          <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Bot className="h-3.5 w-3.5 text-primary" />
                                          </div>
                                          <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium truncate">
                                                {response.personaName || response.modelName}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                {response.latency && (
                                                  <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal text-muted-foreground">
                                                    {response.latency}ms
                                                  </Badge>
                                                )}
                                                {response.tokenCount !== undefined && (
                                                  <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal text-muted-foreground">
                                                    {response.tokenCount}t
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            {!isModelExpanded && (
                                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-normal opacity-80">
                                                {response.response.slice(0, 120).replace(/\n/g, " ")}...
                                              </p>
                                            )}
                                          </div>
                                          <div className="shrink-0 ml-2">
                                            {isModelExpanded ? (
                                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            )}
                                          </div>
                                        </div>
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="px-3 pb-3 pt-0">
                                        <div className="border-t border-border/50 pt-3 mt-1">
                                          <MarkdownRenderer content={response.response} />
                                        </div>
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationTimeline;
