import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  Brain, 
  ThumbsDown,
  Check
} from 'lucide-react';
import { useActionTracker } from '@/hooks/useActionTracker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FrictionTag {
  id: string;
  label: string;
  icon: React.ReactNode;
  severity: 'low' | 'medium' | 'high';
}

const FRICTION_TAGS: FrictionTag[] = [
  { id: 'hallucination', label: 'Hallucination', icon: <AlertTriangle className="h-3 w-3" />, severity: 'high' },
  { id: 'slow', label: 'Slow', icon: <Clock className="h-3 w-3" />, severity: 'medium' },
  { id: 'poor_logic', label: 'Poor Logic', icon: <Brain className="h-3 w-3" />, severity: 'medium' },
  { id: 'off_topic', label: 'Off Topic', icon: <ThumbsDown className="h-3 w-3" />, severity: 'low' },
];

interface FrictionTagsProps {
  modelId: string;
  modelName: string;
  roundIndex: number;
  contextId?: string;
  compact?: boolean;
}

export function FrictionTags({ 
  modelId, 
  modelName, 
  roundIndex,
  contextId,
  compact = false 
}: FrictionTagsProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { reportFriction } = useActionTracker();

  const handleTagClick = async (tag: FrictionTag) => {
    // Toggle selection
    const newSelection = new Set(selectedTags);
    if (newSelection.has(tag.id)) {
      newSelection.delete(tag.id);
    } else {
      newSelection.add(tag.id);
    }
    setSelectedTags(newSelection);

    // If selecting a tag, immediately report it
    if (!selectedTags.has(tag.id)) {
      setIsSubmitting(true);
      const context = `Round ${roundIndex + 1} - ${modelName}`;
      const message = `${tag.label} detected`;
      
      const result = await reportFriction(context, message, tag.severity);
      
      if (result.success) {
        setSubmitted(true);
        toast.success(`Flagged: ${tag.label}`, {
          description: `Thanks for helping improve ${modelName.split('/')[1] || modelName}`,
        });
      }
      setIsSubmitting(false);
    }
  };

  if (submitted && selectedTags.size > 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-success" />
        <span>Feedback recorded</span>
        {Array.from(selectedTags).map(tagId => {
          const tag = FRICTION_TAGS.find(t => t.id === tagId);
          return tag ? (
            <Badge 
              key={tagId} 
              variant="outline" 
              className={cn(
                "text-[10px] px-1.5 py-0",
                tag.severity === 'high' && "border-destructive/50 text-destructive",
                tag.severity === 'medium' && "border-warning/50 text-warning",
                tag.severity === 'low' && "border-muted-foreground/50"
              )}
            >
              {tag.label}
            </Badge>
          ) : null;
        })}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {FRICTION_TAGS.slice(0, 3).map(tag => (
          <Button
            key={tag.id}
            variant={selectedTags.has(tag.id) ? "secondary" : "ghost"}
            size="icon"
            className={cn(
              "h-6 w-6",
              selectedTags.has(tag.id) && tag.severity === 'high' && "bg-destructive/10 text-destructive",
              selectedTags.has(tag.id) && tag.severity === 'medium' && "bg-warning/10 text-warning"
            )}
            onClick={() => handleTagClick(tag)}
            disabled={isSubmitting}
            title={tag.label}
          >
            {tag.icon}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Flag:</span>
      {FRICTION_TAGS.map(tag => (
        <Button
          key={tag.id}
          variant={selectedTags.has(tag.id) ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "h-6 text-[10px] px-2 gap-1",
            selectedTags.has(tag.id) && tag.severity === 'high' && "bg-destructive/10 text-destructive border-destructive/30",
            selectedTags.has(tag.id) && tag.severity === 'medium' && "bg-warning/10 text-warning border-warning/30",
            selectedTags.has(tag.id) && tag.severity === 'low' && "bg-muted"
          )}
          onClick={() => handleTagClick(tag)}
          disabled={isSubmitting}
        >
          {tag.icon}
          {tag.label}
        </Button>
      ))}
    </div>
  );
}
