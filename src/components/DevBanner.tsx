import { useState, useEffect } from "react";
import { X, RefreshCw, Github, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DevBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    const stored = localStorage.getItem("dev-banner-dismissed");
    if (!stored) return false;
    // Auto-show again after 24 hours
    const dismissedAt = parseInt(stored, 10);
    return Date.now() - dismissedAt < 24 * 60 * 60 * 1000;
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("dev-banner-dismissed", Date.now().toString());
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (dismissed) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-primary">
          <Construction className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">
            <strong>Active Development</strong> — Features change frequently. Refresh for latest updates.
          </span>
          <span className="sm:hidden">
            <strong>Dev Mode</strong> — Refresh often!
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <div className="hidden md:flex items-center gap-1 text-muted-foreground px-2 border-l border-primary/20">
            <Github className="h-3 w-3" />
            <span>GitHub coming soon</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 text-primary/60 hover:text-primary"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DevBanner;