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
          Private to @{mentionedCount}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ReplyModeSelector;
