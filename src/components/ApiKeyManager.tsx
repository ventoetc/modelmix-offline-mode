import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PROVIDERS = [
  { key: "openai", name: "OpenAI", placeholder: "sk-..." },
  { key: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
  { key: "google", name: "Google Gemini", placeholder: "AI..." },
  { key: "xai", name: "xAI (Grok)", placeholder: "xai-..." },
  { key: "mistral", name: "Mistral", placeholder: "..." },
  { key: "deepseek", name: "DeepSeek", placeholder: "sk-..." },
  { key: "openrouter", name: "OpenRouter", placeholder: "sk-or-..." },
] as const;

const STORAGE_KEY = "modelmix_byok_keys";

type ProviderKey = typeof PROVIDERS[number]["key"];
type ApiKeys = Partial<Record<ProviderKey, string>>;

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<ProviderKey>>(new Set());
  const [testingKeys, setTestingKeys] = useState<Set<ProviderKey>>(new Set());
  const [verifiedKeys, setVerifiedKeys] = useState<Set<ProviderKey>>(new Set());
  const [failedKeys, setFailedKeys] = useState<Set<ProviderKey>>(new Set());
  const { toast } = useToast();

  // Load keys from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setKeys(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load API keys:", error);
      }
    }
  }, []);

  const saveKeys = (newKeys: ApiKeys) => {
    setKeys(newKeys);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
  };

  const handleKeyChange = (provider: ProviderKey, value: string) => {
    const newKeys = { ...keys };
    if (value.trim()) {
      newKeys[provider] = value.trim();
    } else {
      delete newKeys[provider];
    }
    saveKeys(newKeys);
  };

  const handleDeleteKey = (provider: ProviderKey) => {
    const newKeys = { ...keys };
    delete newKeys[provider];
    saveKeys(newKeys);
    toast({
      title: "API Key Removed",
      description: `${PROVIDERS.find(p => p.key === provider)?.name} API key has been removed.`,
    });
  };

  const toggleVisibility = (provider: ProviderKey) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  const clearAllKeys = () => {
    setKeys({});
    localStorage.removeItem(STORAGE_KEY);
    setVerifiedKeys(new Set());
    setFailedKeys(new Set());
    toast({
      title: "All Keys Removed",
      description: "All API keys have been cleared from local storage.",
    });
  };

  const testKey = async (provider: ProviderKey) => {
    const key = keys[provider];
    if (!key) return;

    setTestingKeys(prev => new Set(prev).add(provider));
    setVerifiedKeys(prev => {
      const next = new Set(prev);
      next.delete(provider);
      return next;
    });
    setFailedKeys(prev => {
      const next = new Set(prev);
      next.delete(provider);
      return next;
    });

    try {
      // Test with a minimal request to the chat endpoint
      const testKeys: ApiKeys = { [provider]: key };

      // Map provider key to the model to test
      const testModels: Record<ProviderKey, string> = {
        openai: "openai/gpt-4o-mini",
        anthropic: "anthropic/claude-3-haiku",
        google: "google/gemini-2.0-flash-001",
        xai: "x-ai/grok-2-mini",
        mistral: "mistralai/ministral-8b",
        deepseek: "deepseek/deepseek-chat",
        openrouter: "google/gemini-2.0-flash-001", // OpenRouter supports many models
      };

      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [{ role: "user", content: "test" }],
            model: testModels[provider],
            userApiKeys: testKeys,
            sessionId: `test_${Date.now()}`,
            fingerprint: `test_${Date.now()}`,
          }),
        }
      );

      if (response.ok) {
        // Consume the response stream to complete the request
        const reader = response.body?.getReader();
        if (reader) {
          try {
            // Read a small amount to verify streaming works
            await reader.read();
            reader.releaseLock();
          } catch (e) {
            // Ignore streaming errors for test
          }
        }

        setVerifiedKeys(prev => new Set(prev).add(provider));
        toast({
          title: "API Key Verified",
          description: `${PROVIDERS.find(p => p.key === provider)?.name} key is working!`,
        });
      } else {
        const errorText = await response.text();
        let errorMsg = `Status ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch {
          errorMsg = errorText || errorMsg;
        }
        console.error(`${provider} test failed:`, errorMsg);
        setFailedKeys(prev => new Set(prev).add(provider));
        toast({
          title: "API Key Failed",
          description: `${PROVIDERS.find(p => p.key === provider)?.name}: ${errorMsg.slice(0, 100)}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Failed to test ${provider} key:`, error);
      setFailedKeys(prev => new Set(prev).add(provider));
      toast({
        title: "Test Failed",
        description: `Failed to test ${PROVIDERS.find(p => p.key === provider)?.name} key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setTestingKeys(prev => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bring Your Own Key (BYOK)</CardTitle>
        <CardDescription>
          Add your own API keys to access models directly. Keys are stored locally in your browser.
          <br />
          <span className="text-yellow-600 font-medium">⚠️ Temporary storage - for testing only</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map(provider => {
          const hasKey = !!keys[provider.key];
          const isVisible = visibleKeys.has(provider.key);

          const isTesting = testingKeys.has(provider.key);
          const isVerified = verifiedKeys.has(provider.key);
          const isFailed = failedKeys.has(provider.key);

          return (
            <div key={provider.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`key-${provider.key}`}>{provider.name}</Label>
                {isVerified && (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Verified</span>
                  </div>
                )}
                {isFailed && (
                  <div className="flex items-center gap-1 text-red-600 text-xs">
                    <XCircle className="h-3 w-3" />
                    <span>Failed</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id={`key-${provider.key}`}
                  type={isVisible ? "text" : "password"}
                  placeholder={provider.placeholder}
                  value={keys[provider.key] || ""}
                  onChange={(e) => handleKeyChange(provider.key, e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleVisibility(provider.key)}
                  type="button"
                  title="Toggle visibility"
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {hasKey && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => testKey(provider.key)}
                      type="button"
                      disabled={isTesting}
                      title="Test API key"
                    >
                      {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteKey(provider.key)}
                      type="button"
                      title="Delete API key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {Object.keys(keys).length > 0 && (
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={clearAllKeys}
              className="w-full"
            >
              Clear All Keys
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export utility function to get keys for use in API calls
export function getBYOKKeys(): ApiKeys {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error("Failed to load BYOK keys:", error);
      return {};
    }
  }
  return {};
}
