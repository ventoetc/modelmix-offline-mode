import { forwardRef } from "react";
import { Users } from "lucide-react";
import { useWaitlistCount } from "@/hooks/useWaitlistCount";

interface WaitlistCounterProps {
  className?: string;
}

export const WaitlistCounter = forwardRef<HTMLDivElement, WaitlistCounterProps>(
  ({ className }, ref) => {
    const { count, isLoading } = useWaitlistCount();

    if (isLoading || count === null) {
      return (
        <div 
          ref={ref}
          className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
        >
          <Users className="w-4 h-4" />
          <span className="animate-pulse">Loading...</span>
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
      >
        <Users className="w-4 h-4 text-primary" />
        <span>
          Join <span className="font-semibold text-foreground">{count.toLocaleString()}</span> AI enthusiasts already waiting
        </span>
      </div>
    );
  }
);

WaitlistCounter.displayName = "WaitlistCounter";
