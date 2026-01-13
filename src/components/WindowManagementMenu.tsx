import { 
  Columns, 
  Minimize2, 
  Maximize2, 
  Zap, 
  AlignLeft, 
  FileText,
  LayoutGrid,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ResponseDepth = "basic" | "in-depth" | "detailed";

interface WindowManagementMenuProps {
  globalDepth: ResponseDepth;
  onDepthChange: (depth: ResponseDepth) => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
  panelCount: number;
}

const WindowManagementMenu = ({
  globalDepth,
  onDepthChange,
  compareMode,
  onToggleCompareMode,
  panelCount,
}: WindowManagementMenuProps) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 px-2.5"
          title="Window management"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Windows</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Panel View
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={() => onDepthChange("basic")}
          className={cn(globalDepth === "basic" && "bg-primary/10")}
        >
          <Zap className="h-4 w-4 mr-2" />
          Collapse All (Basic)
          <DropdownMenuShortcut>1</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onDepthChange("in-depth")}
          className={cn(globalDepth === "in-depth" && "bg-primary/10")}
        >
          <AlignLeft className="h-4 w-4 mr-2" />
          Expand All (In-Depth)
          <DropdownMenuShortcut>2</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onDepthChange("detailed")}
          className={cn(globalDepth === "detailed" && "bg-primary/10")}
        >
          <FileText className="h-4 w-4 mr-2" />
          Expand All (Detailed)
          <DropdownMenuShortcut>3</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Comparison
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={onToggleCompareMode}>
          <Columns className="h-4 w-4 mr-2" />
          {compareMode ? "Exit Compare Mode" : "Compare Mode"}
          <DropdownMenuShortcut>C</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Navigation
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={scrollToTop}>
          <ChevronUp className="h-4 w-4 mr-2" />
          Scroll to Top
          <DropdownMenuShortcut>T</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={scrollToBottom}>
          <ChevronDown className="h-4 w-4 mr-2" />
          Scroll to Bottom
          <DropdownMenuShortcut>B</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
          {panelCount} panels active • Tap panels to cycle views
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WindowManagementMenu;
