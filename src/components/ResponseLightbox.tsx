import { Copy, Check, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatResponse } from "@/types";
import { toast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResponseLightboxProps {
  response: ChatResponse | null;
  onClose: () => void;
}

const ResponseLightbox = ({ response, onClose }: ResponseLightboxProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.response);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!response} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl w-[95vw] max-h-[95vh] h-[90vh] overflow-hidden flex flex-col p-0"
        onPointerDownOutside={() => onClose()}
        onEscapeKeyDown={() => onClose()}
      >
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {response?.modelName}
                </DialogTitle>
                {response && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    {response.latency && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{response.latency}ms</span>
                        latency
                      </span>
                    )}
                    {response.tokenCount && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{response.tokenCount.toLocaleString()}</span>
                        tokens
                      </span>
                    )}
                    <span className="text-xs">
                      {new Date(response.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2 mr-8"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="px-6 py-6">
            {/* Prompt Section */}
            <div className="bg-muted/40 rounded-xl p-5 mb-6 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">Q</span>
                </div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Prompt
                </h4>
              </div>
              <p className="text-base text-foreground leading-relaxed">
                {response?.prompt}
              </p>
            </div>

            {/* Response Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">A</span>
                </div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Response
                </h4>
              </div>
              <div className="pl-0">
                <MarkdownRenderer 
                  content={response?.response || ""} 
                  size="lg"
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseLightbox;
