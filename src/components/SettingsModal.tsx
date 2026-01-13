import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Menu, Coins, MessageSquare,
  User, LogOut, Share2, Copy, Shield, ExternalLink,
  Activity, ChevronDown, Github, Key, HardDrive, RefreshCw, Settings
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import ModelPerformanceDashboard from "./ModelPerformanceDashboard";
import { ApiKeyManager } from "./ApiKeyManager";
import MarkdownRenderer from "./MarkdownRenderer";
import changelogContent from "../../CHANGELOG.md?raw";

interface ModelStats {
  success: number;
  failure: number;
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Credits
  balance: number;
  isRegistered: boolean;
  referralCode: string | null;
  getReferralLink: () => Promise<string | null>;
  refreshBalance: () => void;
  
  // System Prompt
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  
  // User
  user: { email?: string } | null;
  onSignOut: () => void;
  isAdmin?: boolean;
  isLocalMode?: boolean;
  onNavigateAdmin?: () => void;
  
  // Model Performance
  modelHealth?: Record<string, ModelStats>;
  failedModels?: Set<string>;
  onClearHealth?: () => void;
  onClearFailed?: () => void;
  onSwapRecommended?: (modelId: string) => void;

  // Local Mode
  localModelId?: string;
  onLocalModelIdChange?: (nextId: string) => void;
  onRefreshLocalModelId?: () => void;
  localModels?: Array<{ id: string; name?: string; maxContextLength?: number }>;
}

const SettingsModal = ({
  open,
  onOpenChange,
  balance,
  isRegistered,
  referralCode,
  getReferralLink,
  refreshBalance,
  systemPrompt,
  onSystemPromptChange,
  user,
  onSignOut,
  isAdmin,
  isLocalMode,
  onNavigateAdmin,
  modelHealth = {},
  failedModels = new Set(),
  onClearHealth,
  onClearFailed,
  onSwapRecommended,
  localModelId,
  onLocalModelIdChange,
  onRefreshLocalModelId,
  localModels = [],
}: SettingsModalProps) => {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [showFullChangelog, setShowFullChangelog] = useState(false);

  const handleCopyReferral = async () => {
    const link = await getReferralLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Referral link copied",
        description: "Share this link with friends to earn free credits!",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasHealthIssues = failedModels.size > 0;
  const healthIssueCount = failedModels.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            Settings & Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Account Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</h3>
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user?.email || "Guest User"}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{isRegistered ? "Registered Account" : "Guest Access"}</span>
                      {isAdmin && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                    </div>
                  </div>
                </div>
                {user ? (
                  <Button variant="outline" size="sm" onClick={onSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <a href="/auth">Sign In / Sign Up</a>
                  </Button>
                )}
              </div>

              {isRegistered && (
                <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{balance.toFixed(2)} Credits</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshBalance} title="Refresh Balance">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyReferral}>
                      {copied ? <Copy className="h-3.5 w-3.5 mr-1.5" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
                      Refer & Earn
                    </Button>
                  </div>
                </div>
              )}

              {isAdmin && onNavigateAdmin && (
                <Button variant="secondary" className="w-full" onClick={onNavigateAdmin}>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Button>
              )}
            </div>
          </section>

          {/* Local Mode Configuration */}
          {isLocalMode && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5" />
                Local Mode
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Selected Local Model</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs gap-1"
                      onClick={onRefreshLocalModelId}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh List
                    </Button>
                  </div>
                  <Select 
                    value={localModelId} 
                    onValueChange={onLocalModelIdChange}
                    disabled={!localModels.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={localModels.length ? "Select a model" : "No models found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {localModels.length > 0 ? (
                        localModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col items-start text-left">
                              <span className="font-medium">{model.name || model.id}</span>
                              <span className="text-xs text-muted-foreground">
                                {model.id} • {model.maxContextLength ? `${Math.round(model.maxContextLength / 1024)}k ctx` : "Unknown ctx"}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-center text-muted-foreground">
                          No models detected on local server
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Connects to local OpenAI-compatible server (e.g., LM Studio, Ollama)
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* API Keys Section */}
          <ApiKeyManager />

          {/* System Prompt Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Prompt</h3>
            <div className="space-y-2">
              <Textarea
                placeholder="You are a helpful AI assistant..."
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                className="min-h-[100px] font-mono text-sm bg-muted/30"
              />
              <p className="text-xs text-muted-foreground">
                This instruction is sent to all models to define their behavior and persona.
              </p>
            </div>
          </section>

          {/* Model Health Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" />
                Model Health
                {hasHealthIssues && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                    {healthIssueCount} Issue{healthIssueCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </h3>
              {(Object.keys(modelHealth).length > 0 || hasHealthIssues) && (
                <div className="flex gap-2">
                  {hasHealthIssues && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={onClearFailed}
                    >
                      Clear Issues
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={onClearHealth}
                  >
                    Reset Stats
                  </Button>
                </div>
              )}
            </div>
            
            <ModelPerformanceDashboard 
              modelHealth={modelHealth} 
              failedModels={failedModels}
              onSwapRecommended={onSwapRecommended}
            />
          </section>

          {/* Changelog Section */}
          <section className="space-y-3">
            <Collapsible open={changelogOpen} onOpenChange={setChangelogOpen}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Changelog & Updates
                </h3>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", changelogOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent className="mt-2">
                <div className="bg-muted/30 rounded-lg border p-4">
                  <div className={cn("prose prose-sm dark:prose-invert max-w-none", !showFullChangelog && "max-h-[200px] overflow-hidden relative")}>
                    <MarkdownRenderer content={changelogContent} />
                    {!showFullChangelog && (
                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted/30 to-transparent flex items-end justify-center pb-2">
                        <Button variant="secondary" size="sm" onClick={() => setShowFullChangelog(true)}>
                          Read More
                        </Button>
                      </div>
                    )}
                  </div>
                  {showFullChangelog && (
                    <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowFullChangelog(false)}>
                      Show Less
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* Links Section */}
          <section className="pt-2 flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <a href="https://github.com/mrlost" target="_blank" rel="noreferrer" className="flex items-center hover:text-foreground transition-colors">
              <Github className="h-3.5 w-3.5 mr-1.5" />
              GitHub
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
