import { useState, useEffect } from "react";
import { Cookie, X, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ConsentPreferences {
  essential: boolean; // Always true, can't be disabled
  functional: boolean;
  analytics: boolean;
  timestamp: number;
}

const defaultPreferences: ConsentPreferences = {
  essential: true,
  functional: true,
  analytics: false,
  timestamp: 0,
};

const PrivacyBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem("privacy-consent");
    if (!stored) {
      // Small delay for smoother UX
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      } catch {
        setVisible(true);
      }
    }
  }, []);

  const savePreferences = (prefs: ConsentPreferences) => {
    const updated = { ...prefs, timestamp: Date.now() };
    localStorage.setItem("privacy-consent", JSON.stringify(updated));
    setPreferences(updated);
    setVisible(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      functional: true,
      analytics: true,
      timestamp: Date.now(),
    });
  };

  const handleAcceptEssential = () => {
    savePreferences({
      essential: true,
      functional: false,
      analytics: false,
      timestamp: Date.now(),
    });
  };

  const handleSaveSettings = () => {
    savePreferences(preferences);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-card border border-border rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Cookie className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium mb-1">Privacy & Data Consent</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use local storage to save your preferences and session data. 
                  Your prompts are processed through Lovable AI's gateway to third-party AI providers.
                  <strong className="text-foreground"> We do not train on your data.</strong>
                  {" "}Read our{" "}
                  <Link to="/privacy" className="underline hover:text-primary">
                    Privacy Policy
                  </Link>
                  {" "}and{" "}
                  <Link to="/terms" className="underline hover:text-primary">
                    Terms of Service
                  </Link>.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Button size="sm" onClick={handleAcceptAll} className="h-7 text-xs">
                    Accept All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleAcceptEssential} 
                    className="h-7 text-xs"
                  >
                    Essential Only
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowSettings(true)} 
                    className="h-7 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Customize
                  </Button>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                    <Shield className="h-3 w-3" />
                    <span>GDPR Compliant</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAcceptEssential}
                className="h-6 w-6 shrink-0"
                aria-label="Close and accept essential only"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Privacy Settings
            </DialogTitle>
            <DialogDescription>
              Choose which data storage you consent to. Essential storage is required 
              for the app to function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Essential - Always on */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Essential Storage</Label>
                <p className="text-xs text-muted-foreground">
                  Authentication, session management, privacy preferences
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <Separator />

            {/* Functional */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Functional Storage</Label>
                <p className="text-xs text-muted-foreground">
                  Theme preferences, model selection, UI settings
                </p>
              </div>
              <Switch 
                checked={preferences.functional}
                onCheckedChange={(checked) => 
                  setPreferences(p => ({ ...p, functional: checked }))
                }
              />
            </div>

            <Separator />

            {/* Analytics */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Analytics</Label>
                <p className="text-xs text-muted-foreground">
                  Anonymized usage patterns to improve the service (no prompt content)
                </p>
              </div>
              <Switch 
                checked={preferences.analytics}
                onCheckedChange={(checked) => 
                  setPreferences(p => ({ ...p, analytics: checked }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save Preferences
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            You can change these settings anytime. See our{" "}
            <Link to="/privacy" className="underline hover:text-primary" onClick={() => setShowSettings(false)}>
              Privacy Policy
            </Link>
            {" "}for details.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PrivacyBanner;

// Export utility to check consent
export const getConsentPreferences = (): ConsentPreferences | null => {
  const stored = localStorage.getItem("privacy-consent");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const hasAnalyticsConsent = (): boolean => {
  const prefs = getConsentPreferences();
  return prefs?.analytics ?? false;
};
