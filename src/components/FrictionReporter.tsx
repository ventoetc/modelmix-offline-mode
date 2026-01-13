import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AlertTriangle, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useActionTracker } from '@/hooks/useActionTracker';
import { toast } from 'sonner';

interface FrictionReporterProps {
  context: string;
  modelId?: string;
  variant?: 'inline' | 'floating';
}

export function FrictionReporter({ context, modelId, variant = 'inline' }: FrictionReporterProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { reportFriction, rateResponse } = useActionTracker();

  const handleSubmitFriction = async () => {
    if (!message.trim()) {
      toast.error('Please describe what went wrong');
      return;
    }

    setIsSubmitting(true);
    const result = await reportFriction(context, message, severity);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Thanks for your feedback! We\'ll look into this.');
      setMessage('');
      setOpen(false);
    } else {
      toast.error('Failed to submit feedback. Please try again.');
    }
  };

  const handleQuickRate = async (helpful: boolean) => {
    if (modelId) {
      await rateResponse(helpful, modelId, context);
      toast.success(helpful ? 'Glad it helped!' : 'Thanks for letting us know');
    }
  };

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-background/80 backdrop-blur-sm shadow-lg"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Report an issue</h4>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <Button
                    key={level}
                    variant={severity === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeverity(level)}
                    className="flex-1 capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>

              <Textarea
                placeholder="What went wrong? What were you trying to do?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />

              <Button 
                onClick={handleSubmitFriction} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {modelId && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleQuickRate(true)}
            title="This was helpful"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleQuickRate(false)}
            title="This wasn't helpful"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Report an issue"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">What went wrong?</h4>
            
            <Textarea
              placeholder="Describe the issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="text-sm"
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmitFriction}
                disabled={isSubmitting}
              >
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
