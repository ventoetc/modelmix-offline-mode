import { 
  HelpCircle, 
  Lightbulb, 
  Code, 
  ArrowRight,
  Scale,
  MoreHorizontal,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDeepResearchLimit } from "@/hooks/useDeepResearchLimit";
interface FollowUpShortcut {
  label: string;
  prompt: string;
  icon: React.ReactNode;
  primary?: boolean;
}

const SHORTCUTS: FollowUpShortcut[] = [
  // Primary - always visible
  {
    label: "Explain",
    prompt: "Can you explain that in more detail?",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
    primary: true,
  },
  {
    label: "Examples",
    prompt: "Can you provide some concrete examples?",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    primary: true,
  },
  {
    label: "Code",
    prompt: "Can you show me a code example for this?",
    icon: <Code className="h-3.5 w-3.5" />,
    primary: true,
  },
  {
    label: "Compare",
    prompt: "What are the pros and cons of this approach?",
    icon: <Scale className="h-3.5 w-3.5" />,
    primary: true,
  },
  // Secondary - in dropdown
  {
    label: "Simplify it",
    prompt: "Can you explain this more simply, like I'm a beginner?",
    icon: null,
  },
  {
    label: "Why is that?",
    prompt: "Why is that the case? What's the reasoning behind it?",
    icon: null,
  },
  {
    label: "Alternatives",
    prompt: "What are some alternative approaches or perspectives?",
    icon: null,
  },
  {
    label: "Next steps",
    prompt: "What should I do next? What are the action items?",
    icon: <ArrowRight className="h-3.5 w-3.5" />,
  },
  {
    label: "Challenge this",
    prompt: "Play devil's advocate and challenge this response. What might be wrong or incomplete?",
    icon: null,
  },
  {
    label: "Summarize",
    prompt: "Can you summarize the key points in 3 bullet points?",
    icon: null,
  },
  {
    label: "Go deeper",
    prompt: "Let's go deeper on this. What are the nuances I might be missing?",
    icon: null,
  },
  {
    label: "Real-world use",
    prompt: "How would this be used in a real-world scenario?",
    icon: null,
  },
  {
    label: "Debug this",
    prompt: "What could go wrong with this? What are potential edge cases or bugs?",
    icon: null,
  },
  {
    label: "Continue",
    prompt: "Continue where you left off and expand on this further.",
    icon: null,
  },
  {
    label: "Sources?",
    prompt: "What sources or evidence support this? How confident are you?",
    icon: null,
  },
];

interface FollowUpShortcutsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  onDeepResearchClick?: () => void;
}

const FollowUpShortcuts = ({ onSelect, disabled, onDeepResearchClick }: FollowUpShortcutsProps) => {
  const primaryShortcuts = SHORTCUTS.filter(s => s.primary);
  const secondaryShortcuts = SHORTCUTS.filter(s => !s.primary);
  const { remainingToday, dailyLimit, canUse, isLoading } = useDeepResearchLimit();

  return (
    <div className="flex items-center gap-1.5">
      {/* Deep Research Link - Special tracked action */}
      {onDeepResearchClick && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canUse || isLoading}
          onClick={onDeepResearchClick}
          className={cn(
            "h-7 px-2.5 text-xs gap-1.5 rounded-full",
            canUse ? "border-primary/50 hover:border-primary hover:bg-primary/5" : "opacity-50"
          )}
          title={canUse 
            ? `Deep Research: Multi-model collaborative analysis (${remainingToday}/${dailyLimit} remaining today)`
            : `Daily limit reached (${dailyLimit} per day)`
          }
        >
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Deep Research</span>
          <Badge 
            variant="secondary" 
            className="h-4 px-1 text-[10px] ml-0.5 bg-primary/10 text-primary"
          >
            {remainingToday}
          </Badge>
        </Button>
      )}

      {/* Primary shortcuts - always visible */}
      {primaryShortcuts.map((shortcut, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(shortcut.prompt)}
          className="h-7 px-2.5 text-xs gap-1.5 rounded-full"
          title={shortcut.prompt}
        >
          {shortcut.icon}
          <span className="hidden sm:inline">{shortcut.label}</span>
        </Button>
      ))}
      
      {/* More dropdown for secondary shortcuts */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-7 w-7 p-0 rounded-full"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {secondaryShortcuts.map((shortcut, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => onSelect(shortcut.prompt)}
              className="text-xs cursor-pointer"
            >
              {shortcut.icon && <span className="mr-2">{shortcut.icon}</span>}
              {shortcut.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FollowUpShortcuts;
