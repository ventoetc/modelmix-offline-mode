import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Trash2, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export interface ConversationSummary {
  id: string;
  prompt: string;
  timestamp: string;
  modelCount: number;
  responseCount: number;
}

interface ConversationHistoryProps {
  conversations: ConversationSummary[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

const ConversationHistory = ({
  conversations,
  onLoad,
  onDelete,
  onClearAll,
  className,
}: ConversationHistoryProps) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4" />
          History
          {conversations.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {conversations.length}
            </Badge>
          )}
        </h3>
        {conversations.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearAll}
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            title="Clear All History"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No saved conversations</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="group relative border border-transparent hover:border-border rounded-md p-2 hover:bg-muted/50 transition-all cursor-pointer text-left"
                onClick={() => onLoad(conv.id)}
              >
                <p className="text-sm font-medium line-clamp-1 mb-1 pr-6">
                  {conv.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(conv.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal bg-background/50">
                    {conv.modelCount} models
                  </Badge>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationHistory;
