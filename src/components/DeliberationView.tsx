import React, { useEffect, useRef } from "react";
import {
  Deliberation,
  DeliberationStatus,
  ChatMessage
} from "@/lib/localMode";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, SkipForward, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DeliberationViewProps {
  state: Deliberation | null;
  error?: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAdvance: () => void; // Manually advance round if needed
}

export function DeliberationView({
  state,
  error = null,
  onPause,
  onResume,
  onStop,
  onAdvance
}: DeliberationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state?.rounds]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Deliberation Error</h3>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Deliberation not started
      </div>
    );
  }

  // Flatten messages for transcript view
  const allMessages = state.rounds.flatMap(r => 
    r.messages.map(m => ({ ...m, round: r.roundNumber }))
  );

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Deliberation Mode
            <StatusBadge status={state.status} />
          </h2>
          <p className="text-sm text-muted-foreground">
            Round {state.currentRound} / {state.maxRounds} • {state.agents.length} Agents
          </p>
        </div>
        <div className="flex gap-2">
          {state.status === "running" ? (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="w-4 h-4 mr-2" /> Pause
            </Button>
          ) : state.status === "paused" ? (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="w-4 h-4 mr-2" /> Resume
            </Button>
          ) : null}
          
          <Button variant="destructive" size="sm" onClick={onStop} disabled={state.status === "stopped" || state.status === "completed"}>
            <Square className="w-4 h-4 mr-2" /> Stop
          </Button>
        </div>
      </div>

      {/* Task Description */}
      <div className="p-4 border-b bg-muted/10">
        <h3 className="text-sm font-medium mb-1">Task</h3>
        <p className="text-sm text-muted-foreground">{state.task}</p>
      </div>

      {/* Transcript */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6" ref={scrollRef}>
          {allMessages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {msg.personaId || msg.fromAgentId}
                </span>
                <span className="text-xs text-muted-foreground">
                  Round {msg.round} • {new Date(msg.createdAt).toLocaleTimeString()}
                  {msg.visibility === "private" && " • (Private)"}
                </span>
              </div>
              <div className="pl-4 border-l-2 border-muted">
                <div className="text-sm prose dark:prose-invert max-w-none">
                   <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {allMessages.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              Waiting for agents to start...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: DeliberationStatus }) {
  const styles = {
    idle: "bg-gray-500",
    running: "bg-green-500",
    paused: "bg-yellow-500",
    completed: "bg-blue-500",
    stopped: "bg-red-500"
  };

  return (
    <Badge variant="outline" className="capitalize">
      <span className={`w-2 h-2 rounded-full mr-2 ${styles[status]}`} />
      {status}
    </Badge>
  );
}
