import { useRef } from "react";
import { Paperclip, X, ImageIcon, FileText, AlertTriangle, ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Attachment {
  id: string;
  file: File;
  preview?: string;
  content?: string;
  type: "image" | "file";
}

export interface UnsupportedModelInfo {
  id: string;
  name: string;
  alternativeId?: string;
  alternativeName?: string;
}

interface AttachmentInputProps {
  attachments: Attachment[];
  onAttach: (files: FileList) => void;
  onRemove: (id: string) => void;
  unsupportedModels?: UnsupportedModelInfo[];
  onSwapModel?: (oldModelId: string, newModelId: string) => void;
  onRemoveModelSlot?: (modelId: string) => void;
  className?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

const AttachmentInput = ({
  attachments,
  onAttach,
  onRemove,
  unsupportedModels = [],
  onSwapModel,
  onRemoveModelSlot,
  className,
  buttonVariant = "outline",
  buttonSize = "sm",
}: AttachmentInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttach(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.txt,.md,.json,.csv,.py,.js,.ts,.tsx,.jsx,.html,.css"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              onClick={handleClick}
              className="gap-2"
            >
              <Paperclip className="h-4 w-4" />
              {buttonSize !== "icon" && "Attach"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Attach images or files (vision-capable models only)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {attachments.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {attachments.map((attachment) => (
            <Badge
              key={attachment.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {attachment.type === "image" ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="max-w-24 truncate text-xs">
                {attachment.file.name}
              </span>
              <button
                onClick={() => onRemove(attachment.id)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {unsupportedModels.length > 0 && attachments.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-amber-500 hover:text-amber-600 transition-colors">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">{unsupportedModels.length} model(s) lack vision</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <p className="text-sm font-medium mb-2">Models without vision support:</p>
            <p className="text-xs text-muted-foreground mb-3">
              Images will be skipped for these models. You can swap them for vision-capable alternatives.
            </p>
            <div className="space-y-2">
              {unsupportedModels.map((model) => (
                <div 
                  key={model.id} 
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                >
                  <span className="text-xs font-medium truncate flex-1 min-w-0">
                    {model.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {model.alternativeId && onSwapModel && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => onSwapModel(model.id, model.alternativeId!)}
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              Swap
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Switch to {model.alternativeName}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {onRemoveModelSlot && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => onRemoveModelSlot(model.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Remove this model slot</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default AttachmentInput;
