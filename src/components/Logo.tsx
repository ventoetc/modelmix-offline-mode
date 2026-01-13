import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
};

const textSizeClasses = {
  sm: "text-base",
  md: "text-lg md:text-xl",
  lg: "text-xl md:text-2xl",
};

const taglineSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ size = "md", showText = false, showTagline = false, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center gap-2.5", className)}>
        <div
          className={cn(
            "rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm",
            sizeClasses[size]
          )}
        >
          <span className="text-primary-foreground font-bold tracking-tight">M²</span>
        </div>
        {showText && (
          <div className="flex flex-col">
            <h1 className={cn("font-semibold text-foreground tracking-tight leading-tight", textSizeClasses[size])}>
              ModelMix
            </h1>
            {showTagline && (
              <span className={cn("text-muted-foreground font-medium tracking-wide", taglineSizeClasses[size])}>
                Compare AI minds
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Logo.displayName = "Logo";

export default Logo;
