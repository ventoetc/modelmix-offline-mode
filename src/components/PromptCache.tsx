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
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0",
                  cachedPrompts.length > 0 && "text-primary"
                )}
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Saved prompts ({cachedPrompts.length})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="top"
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Prompt Library</h4>
            <Badge variant="secondary" className="text-xs">
              {cachedPrompts.length} saved
            </Badge>
          </div>
          
          {/* Save current prompt */}
          {canSave && (
            <div className="mb-2">
              {showSaveInput ? (
                <div className="flex gap-1.5">
                  <Input
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    autoFocus
                  />
                  <Button size="sm" className="h-8 px-2" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setShowSaveInput(true)}
                >
                  <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
                  Save current prompt
                </Button>
              )}
            </div>
          )}

          {/* Search */}
          {cachedPrompts.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Prompt list */}
        <ScrollArea className="h-[240px]">
          {sortedPrompts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No saved prompts</p>
              <p className="text-xs mt-1">Save prompts to quickly reuse them</p>
            </div>
          ) : (
            <div className="p-1.5">
              {sortedPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={cn(
                    "group p-2 rounded-md hover:bg-accent cursor-pointer transition-colors",
                    prompt.isFavorite && "bg-primary/5"
                  )}
                  onClick={() => handleSelect(prompt)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {prompt.isFavorite && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium truncate">
                          {prompt.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {prompt.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(prompt.createdAt).toLocaleDateString()}
                        </span>
                        <span>Used {prompt.usageCount}x</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(prompt.id);
                        }}
                      >
                        <Star className={cn(
                          "h-3 w-3",
                          prompt.isFavorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePrompt(prompt.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
