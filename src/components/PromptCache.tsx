import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  BookmarkPlus, Bookmark, Trash2, Search, Clock, Star
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface CachedPrompt {
  id: string;
  text: string;
  title: string;
  createdAt: string;
  usageCount: number;
  isFavorite: boolean;
}

interface PromptCacheProps {
  currentPrompt: string;
  onSelectPrompt: (prompt: string) => void;
  cachedPrompts: CachedPrompt[];
  onSavePrompt: (prompt: string, title?: string) => void;
  onDeletePrompt: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const PromptCache = ({
  currentPrompt,
  onSelectPrompt,
  cachedPrompts,
  onSavePrompt,
  onDeletePrompt,
  onToggleFavorite,
}: PromptCacheProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const filteredPrompts = useMemo(() => {
    if (!search.trim()) return cachedPrompts;
    const lower = search.toLowerCase();
    return cachedPrompts.filter(
      p => p.title.toLowerCase().includes(lower) || p.text.toLowerCase().includes(lower)
    );
  }, [cachedPrompts, search]);

  const sortedPrompts = useMemo(() => {
    return [...filteredPrompts].sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Then by usage count
      return b.usageCount - a.usageCount;
    });
  }, [filteredPrompts]);

  const handleSave = () => {
    if (!currentPrompt.trim()) {
      toast({ title: "Enter a prompt first", variant: "destructive" });
      return;
    }
    
    const title = saveTitle.trim() || currentPrompt.slice(0, 40) + (currentPrompt.length > 40 ? "..." : "");
    onSavePrompt(currentPrompt, title);
    setSaveTitle("");
    setShowSaveInput(false);
    toast({ title: "Prompt saved" });
  };

  const handleSelect = (prompt: CachedPrompt) => {
    onSelectPrompt(prompt.text);
    setIsOpen(false);
  };

  const canSave = currentPrompt.trim().length > 0 && 
    !cachedPrompts.some(p => p.text === currentPrompt.trim());

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  "h-9 gap-2 px-3 transition-all",
                  cachedPrompts.length > 0 ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Bookmark className={cn("h-4 w-4", cachedPrompts.length > 0 && "fill-current")} />
                <span className="hidden sm:inline font-medium">Saved Prompts</span>
                {cachedPrompts.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 min-w-[1.25rem] text-[10px] ml-0.5 bg-background/50">
                    {cachedPrompts.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Save and manage your commonly used prompts</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent 
        className="w-[400px] p-0 shadow-xl" 
        align="start"
        side="top"
      >
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary fill-primary/20" />
              <h4 className="font-semibold text-sm">Prompt Library</h4>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {cachedPrompts.length} saved
            </Badge>
          </div>
          
          {/* Save current prompt - Always visible if can save */}
          {canSave ? (
            <div className="flex gap-2 mb-3">
              <Input
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder={`Name for: "${currentPrompt.slice(0, 20)}..."`}
                className="h-8 text-xs bg-background"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleSave}>
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
            </div>
          ) : (
            <div className="mb-3 text-xs text-muted-foreground italic flex items-center gap-1.5 px-1">
              <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              Type in the chat box to save a new prompt
            </div>
          )}

          {/* Search */}
          {(cachedPrompts.length > 3 || search) && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your prompts..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          )}
        </div>

        {/* Prompt list */}
        <ScrollArea className="h-[300px]">
          {sortedPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bookmark className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium">No saved prompts</p>
              <p className="text-xs mt-1 text-center max-w-[200px]">
                Save prompts you use frequently to access them quickly later.
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sortedPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={cn(
                    "group relative flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-all border border-transparent hover:border-border/50",
                    prompt.isFavorite && "bg-primary/5 border-primary/10"
                  )}
                  onClick={() => handleSelect(prompt)}
                >
                  {/* Favorite Toggle */}
                  <div 
                    className={cn(
                      "mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      prompt.isFavorite && "opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(prompt.id);
                    }}
                  >
                    <Star className={cn(
                      "h-4 w-4 hover:scale-110 transition-transform",
                      prompt.isFavorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate text-foreground">
                        {prompt.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums bg-muted/50 px-1.5 py-0.5 rounded">
                        Used {prompt.usageCount}x
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {prompt.text}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(prompt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Delete Action */}
                  <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePrompt(prompt.id);
                      }}
                      title="Delete prompt"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default PromptCache;
