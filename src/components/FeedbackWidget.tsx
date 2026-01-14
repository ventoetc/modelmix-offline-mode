import { useState } from "react";
import { MessageCircle, X, Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"bug" | "idea" | "love">("idea");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    
    // Store feedback locally (could be sent to a backend later)
    let feedbackLog;
    try {
      feedbackLog = JSON.parse(localStorage.getItem("modelmix-feedback") || "[]");
    } catch {
      feedbackLog = [];
    }
    feedbackLog.push({
      type: feedbackType,
      message: feedback,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    localStorage.setItem("modelmix-feedback", JSON.stringify(feedbackLog));
    
    setSubmitted(true);
    setFeedback("");
    
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
    }, 2000);
    
    toast({ title: "Thanks for your feedback!" });
  };

  return (
    <>
      {/* Floating button - minimized on mobile, subtle styling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-40 rounded-full shadow-sm",
          "bg-muted/60 hover:bg-muted border border-border/30",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-105 active:scale-95",
          // Mobile: smaller and positioned at bottom left corner 
          "bottom-20 left-3 h-8 w-8",
          // Desktop: slightly larger
          "md:bottom-6 md:left-4 md:h-9 md:w-9"
        )}
        title="Send feedback"
      >
        {isOpen ? (
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-32 left-3 z-40 w-64 bg-popover border border-border rounded-lg shadow-xl animate-fade-in md:bottom-18 md:left-4 md:w-72">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-medium">Quick Feedback</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Help shape ModelMix
            </p>
          </div>

          {submitted ? (
            <div className="p-6 text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Thank you!</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Type selector */}
              <div className="flex gap-1">
                {[
                  { value: "bug", label: "🐛 Bug" },
                  { value: "idea", label: "💡 Idea" },
                  { value: "love", label: "❤️ Love it" },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFeedbackType(type.value as typeof feedbackType)}
                    className={cn(
                      "flex-1 px-2 py-1.5 rounded text-xs transition-colors",
                      feedbackType === type.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="What's on your mind?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
              />

              <Button
                onClick={handleSubmit}
                disabled={!feedback.trim()}
                size="sm"
                className="w-full gap-2"
              >
                <Send className="h-3 w-3" />
                Send Feedback
              </Button>
              
              <p className="text-[10px] text-muted-foreground text-center">
                Stored locally • No account needed
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;