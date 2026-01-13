import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Use matchMedia result directly to avoid forced reflow from reading window.innerWidth
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Use the media query result instead of window.innerWidth to avoid forced reflow
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    
    // Set initial value using matches property (no reflow)
    onChange(mql);
    
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
