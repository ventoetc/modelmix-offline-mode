import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, ChevronLeft, ChevronRight, Sparkles, 
  Settings, Layers, MessageSquare, Copy, 
  Volume2, Expand, RefreshCw, Key, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "One Question, Every Answer",
    description: "Ask once. Get answers from multiple AI models side-by-side. See which thinks best for YOUR question.",
    icon: <Sparkles className="h-8 w-8" />,
    position: "center",
  },
  {
    id: "panels",
    title: "Compare Side-by-Side",
    description: "Each panel = different AI brain. Same question, different perspectives. You pick the winner.",
    icon: <Layers className="h-6 w-6" />,
    targetSelector: ".chat-panel",
    position: "bottom",
  },
  {
    id: "prompt",
    title: "Type Once, Compare All",
    description: "Your prompt goes to all models simultaneously. Attach images for models that can see.",
    icon: <MessageSquare className="h-6 w-6" />,
    targetSelector: ".prompt-input",
    position: "top",
  },
  {
    id: "challenges",
    title: "Try the Showdowns",
    description: "Use our challenge prompts to expose real differences: logic puzzles, creative writing, code tests. See which AI fumbles.",
    icon: <Expand className="h-6 w-6" />,
    position: "center",
  },
  {
    id: "model-selector",
    title: "Swap Models Anytime",
    description: "Click any model name to switch it. Mix and match: GPT for code, Claude for writing, Gemini for facts.",
    icon: <RefreshCw className="h-6 w-6" />,
    position: "center",
  },
  {
    id: "done",
    title: "Let's Go!",
    description: "Try 'Count the R's in strawberry' — it's a viral test that trips up many AIs. See who gets it right!",
    icon: <Sparkles className="h-8 w-8" />,
    position: "center",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  }, [onSkip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "bg-background/80 backdrop-blur-sm",
        "animate-in fade-in duration-300"
      )}
    >
      {/* Backdrop click to skip */}
      <div 
        className="absolute inset-0" 
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Tour Card */}
      <Card className={cn(
        "relative w-full max-w-md shadow-2xl border-border",
        "animate-in zoom-in-95 duration-300"
      )}>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
        >
          <X className="h-4 w-4" />
        </Button>

        <CardContent className="pt-8 pb-6 px-6">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-lg overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : index < currentStep
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-muted-foreground/30"
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={cn(
              "p-4 rounded-2xl",
              isFirstStep || isLastStep 
                ? "bg-gradient-to-br from-primary/20 to-accent/20" 
                : "bg-muted"
            )}>
              <div className="text-primary">
                {step.icon}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-xl font-semibold text-foreground">
              {step.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirstStep}
              className={cn(
                "flex-1",
                isFirstStep && "invisible"
              )}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {!isFirstStep && !isLastStep && (
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            )}

            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {isLastStep ? "Get Started" : isFirstStep ? "Start Tour" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Hook to manage tour state
export const useOnboardingTour = (userId?: string | null, autoShow: boolean = false) => {
  const storageKey = userId ? `tour-completed-${userId}` : "tour-completed-anon";
  
  const [showTour, setShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    return localStorage.getItem(storageKey) === "true";
  });

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
    setHasSeenTour(true);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  const skipTour = useCallback(() => {
    setShowTour(false);
    setHasSeenTour(true);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasSeenTour(false);
  }, [storageKey]);

  // Auto-show tour for new users only if autoShow is true
  useEffect(() => {
    if (autoShow && !hasSeenTour) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoShow, hasSeenTour]);

  return {
    showTour,
    hasSeenTour,
    startTour,
    completeTour,
    skipTour,
    resetTour,
  };
};

// Button to trigger tour from settings
export const TourTriggerButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    className="gap-2"
  >
    <HelpCircle className="h-4 w-4" />
    Show Tour
  </Button>
);

export default OnboardingTour;
