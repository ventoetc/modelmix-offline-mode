import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Fingerprint, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContextIdBadgeProps {
  contextId: string;
  isTester?: boolean;
  usageValue?: number;
  sessionTokens?: number;
  className?: string;
}

export function ContextIdBadge({ 
  contextId, 
  isTester = false,
  usageValue = 0,
  sessionTokens = 0,
  className 
}: ContextIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contextId);
    setCopied(true);
    toast.success('Context ID copied', {
      description: 'Use this in bug reports for faster debugging',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Truncate context ID for display
  const displayId = contextId.length > 16 
    ? `${contextId.slice(0, 8)}...${contextId.slice(-4)}`
    : contextId;

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {isTester && (
        <Badge 
          variant="outline" 
          className="bg-primary/5 text-primary border-primary/20 gap-1"
        >
          <FlaskConical className="h-3 w-3" />
          Tester
        </Badge>
      )}
      
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Fingerprint className="h-3 w-3" />
        <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
          {displayId}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleCopy}
          title="Copy Context ID for bug reports"
        >
          {copied ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      {isTester && sessionTokens > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground border-l border-border pl-2">
          <span className="text-[10px]">
            {sessionTokens.toLocaleString()} tokens
          </span>
          {usageValue > 0 && (
            <span className="text-[10px] text-success">
              (~${usageValue.toFixed(3)} value)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
