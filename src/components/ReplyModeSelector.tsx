import { Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReplyMode = "all" | "mentioned-only" | "private-mentioned";

interface ReplyModeSelectorProps {
  mode: ReplyMode;
  onModeChange: (mode: ReplyMode) => void;
  mentionedCount: number;
  disabled?: boolean;
}

const ReplyModeSelector = ({
  mode,
  onModeChange,
  mentionedCount,
  disabled = false,
}: ReplyModeSelectorProps) => {
  // Only show if there are mentioned models
  if (mentionedCount === 0) return null;

  // If strict 1:1, show static badge
  if (mentionedCount === 1) {
    return (
        <div className="h-[50px] w-[110px] px-3 flex flex-col justify-center gap-1 bg-muted/50 border rounded-md cursor-not-allowed" title="1:1 conversations are always private">
            <div className="flex items-center gap-1.5 text-primary">
                <Lock className="h-3 w-3" />
                <span className="text-xs font-medium">Private</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-none">1:1 Isolated</span>
        </div>
    );
  }

  return (
    <Select
      value={mode}
      onValueChange={(value) => onModeChange(value as ReplyMode)}
      disabled={disabled}
    >
      <SelectTrigger className="h-[50px] w-[110px] text-xs shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover">
        <SelectItem value="all" className="text-xs">
          All reply
        </SelectItem>
        <SelectItem value="mentioned-only" className="text-xs">
          Only @{mentionedCount}
        </SelectItem>
        <SelectItem value="private-mentioned" className="text-xs">
          {mentionedCount === 1 ? "1:1 Private (Isolated)" : `Private to @${mentionedCount}`}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ReplyModeSelector;
