// Simple browser fingerprint for anonymous usage tracking
// This is a lightweight implementation that doesn't require external libraries

export const generateFingerprint = (): string => {
  // Safety check for SSR/non-browser environments
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return `fp_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  try {
    // Check if we already have a fingerprint stored
    const stored = localStorage.getItem("mm-fingerprint");
    if (stored && stored.length > 0) return stored;

    // Generate a new fingerprint based on browser characteristics
    const components: string[] = [];

    // Screen properties
    if (typeof screen !== 'undefined') {
      components.push(`${screen.width || 0}x${screen.height || 0}x${screen.colorDepth || 24}`);
    }
    
    // Timezone
    try {
      components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown');
    } catch {
      components.push('unknown-tz');
    }
    
    // Language
    components.push(navigator?.language || 'en');
    
    // Platform
    components.push(navigator?.platform || 'unknown');
    
    // User agent (truncated for consistency)
    components.push((navigator?.userAgent || 'unknown').substring(0, 100));
    
    // Available fonts (sample check)
    try {
      const testFonts = ["Arial", "Courier New", "Georgia", "Times New Roman", "Verdana"];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const availableFonts = testFonts.filter((font) => {
          ctx.font = `12px "${font}"`;
          return ctx.measureText("test").width > 0;
        });
        components.push(availableFonts.join(","));
      }
    } catch {
      // Font detection failed, skip
    }

    // Combine and hash
    const combined = components.join("|");
    const fingerprint = hashString(combined);
    
    // Store for consistency
    try {
      localStorage.setItem("mm-fingerprint", fingerprint);
    } catch {
      // localStorage write failed, but we still have a fingerprint
    }
    
    return fingerprint;
  } catch (error) {
    // Complete fallback - generate a random but persistent-ish fingerprint
    console.warn("Fingerprint generation failed, using fallback:", error);
    const fallback = `fp_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    try {
      localStorage.setItem("mm-fingerprint", fallback);
    } catch {
      // Ignore localStorage errors
    }
    return fallback;
  }
};

// Simple string hash function
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and add random suffix for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `fp_${Math.abs(hash).toString(16)}_${randomSuffix}`;
};

// Get current usage from localStorage (fallback when offline)
export const getLocalUsage = (): { used: number; date: string } => {
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem("mm-usage");
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.date === today) {
        return data;
      }
    } catch {
      // Invalid data, reset
    }
  }
  
  return { used: 0, date: today };
};

export const incrementLocalUsage = (): void => {
  const current = getLocalUsage();
  const today = new Date().toISOString().split("T")[0];
  
  localStorage.setItem("mm-usage", JSON.stringify({
    used: current.date === today ? current.used + 1 : 1,
    date: today
  }));
};
