import { useState, useEffect } from "react";
import { ArrowDown, Zap, AlignLeft, FileText, ChevronUp, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingNavProps {
  globalDepth: "basic" | "in-depth" | "detailed";
  onDepthChange: (depth: "basic" | "in-depth" | "detailed") => void;
  showDepthControls?: boolean;
  compareMode?: boolean;
  onToggleCompareMode?: () => void;
}

const FloatingNav = ({ globalDepth, onDepthChange, showDepthControls = true, compareMode = false, onToggleCompareMode }: FloatingNavProps) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      
      setIsAtTop(scrollY < 100);
      setShowScrollTop(scrollY > 200);
      setShowScrollBottom(scrollY + windowHeight < docHeight - 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case "1":
          onDepthChange("basic");
          break;
        case "2":
          onDepthChange("in-depth");
          break;
        case "3":
          onDepthChange("detailed");
          break;
        case "t":
        case "T":
          if (!e.metaKey && !e.ctrlKey) scrollToTop();
          break;
        case "b":
        case "B":
          if (!e.metaKey && !e.ctrlKey) scrollToBottom();
          break;
        case "c":
        case "C":
          if (!e.metaKey && !e.ctrlKey && onToggleCompareMode) onToggleCompareMode();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDepthChange]);

  return (
    <>
      {/* Floating Controls - Hidden on mobile, visible on large screens */}
      <div className="fixed bottom-6 right-4 z-40 hidden lg:flex flex-col items-end gap-2 lg:right-6">
        {/* Depth Controls - desktop only */}
        {showDepthControls && (
          <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full p-1 shadow-md">
            <Button
              size="icon"
              variant={globalDepth === "basic" ? "default" : "ghost"}
              className="h-8 w-8 rounded-full"
              onClick={() => onDepthChange("basic")}
              title="Basic view (1)"
            >
              <Zap className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={globalDepth === "in-depth" ? "default" : "ghost"}
              className="h-8 w-8 rounded-full"
              onClick={() => onDepthChange("in-depth")}
              title="In-depth view (2)"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={globalDepth === "detailed" ? "default" : "ghost"}
              className="h-8 w-8 rounded-full"
              onClick={() => onDepthChange("detailed")}
              title="Detailed view (3)"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            {onToggleCompareMode && (
              <Button
                size="icon"
                variant={compareMode ? "default" : "ghost"}
                className="h-8 w-8 rounded-full"
                onClick={onToggleCompareMode}
                title="Compare mode - expand multiple (C)"
              >
                <Columns className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Scroll to Top - Small Chevron - desktop only */}
        {showScrollTop && (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background/80 transition-all"
            onClick={scrollToTop}
            title="Scroll to top (T)"
          >
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Bottom indicator when not at bottom */}
      {showScrollBottom && !isAtTop && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-36 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in md:bottom-28 lg:hidden"
        >
          <ArrowDown className="h-4 w-4" />
          <span>More below</span>
        </button>
      )}

    </>
  );
};

export default FloatingNav;
