import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ResponseAbstractProps {
  abstract: string;
  isPinned?: boolean;
  isCollapsible?: boolean;
  className?: string;
}

const ResponseAbstract = ({
  abstract,
  isPinned = false,
  isCollapsible = false,
  className,
}: ResponseAbstractProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(abstract);
    toast({ title: "Abstract copied" });
  };

  if (!abstract) return null;

  return (
    <div
      className={cn(
        "relative group",
        isPinned && "sticky top-0 z-10 bg-card",
        className
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-muted/50 to-muted/30 transition-all duration-200 shadow-sm",
          isCollapsed && "py-2"
        )}
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0">
          <Quote className="h-4 w-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Summary
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
          </div>
          
          {!isCollapsed && (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {abstract}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            title="Copy abstract"
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {isCollapsible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              title={isCollapsed ? "Expand abstract" : "Collapse abstract"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponseAbstract;
