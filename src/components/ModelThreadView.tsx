import { X, Copy, Download, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ChatResponse } from "@/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  tokenCount?: number;
  latency?: number;
}

interface ModelThreadViewProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  modelName: string;
  responses: ChatResponse[];
  prompts: string[]; // Array of all prompts in order
}

const ModelThreadView = ({
  isOpen,
  onClose,
  modelId,
  modelName,
  responses,
  prompts,
}: ModelThreadViewProps) => {
  // Build thread from responses for this model
  const buildThread = (): ThreadMessage[] => {
    const thread: ThreadMessage[] = [];
    const modelResponses = responses
      .filter(r => r.model === modelId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Interleave prompts and responses
    prompts.forEach((prompt, idx) => {
      thread.push({
        role: "user",
        content: prompt,
      });

      const response = modelResponses[idx];
      if (response) {
        thread.push({
          role: "assistant",
          content: response.response,
          timestamp: response.timestamp,
          tokenCount: response.tokenCount,
          latency: response.latency,
        });
      }
    });

    return thread;
  };

  const thread = buildThread();

  const handleCopyThread = () => {
    const text = thread
      .map(m => `${m.role === "user" ? "User" : modelName}:\n${m.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Thread copied to clipboard" });
  };

  const handleExportThread = () => {
    const text = `# Conversation with ${modelName}\n\n${thread
      .map(m => `## ${m.role === "user" ? "User" : modelName}\n\n${m.content}`)
      .join("\n\n---\n\n")}`;
    
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modelName.replace(/[^a-zA-Z0-9]/g, "-")}-thread.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Thread exported" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {modelName} Thread
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyThread}
                title="Copy thread"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportThread}
                title="Export thread"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {Math.ceil(thread.length / 2)} turn{thread.length > 2 ? "s" : ""} in this conversation
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4 pb-6">
            {thread.map((message, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-4",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border border-border"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div>
                      <MarkdownRenderer content={message.content} />
                      {(message.tokenCount || message.latency) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                          {message.latency && <span>{message.latency}ms</span>}
                          {message.tokenCount && <span>{message.tokenCount} tokens</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ModelThreadView;
