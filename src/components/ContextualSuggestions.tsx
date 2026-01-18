import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatResponse } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import {
  getLocalModeConfig,
  isLocalModeEnabled,
  LocalOpenAICompatibleProvider,
  type LocalMessage,
} from "@/lib/localMode";

interface ContextualSuggestionsProps {
  responses: ChatResponse[];
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  selectedModels: string[];
  modelNames: Record<string, string>;
}

interface Suggestion {
  text: string;
  type: "follow-up" | "deep-dive" | "compare" | "clarify" | "next-chapter";
  targetModels?: string[];
}

const ContextualSuggestions = ({
  responses,
  prompts,
  onSelect,
  disabled,
  selectedModels,
  modelNames,
}: ContextualSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [steeringPrompt, setSteeringPrompt] = useState("");
  const [showSteering, setShowSteering] = useState(false);

  const generateSuggestions = useCallback(
    async (steering?: string) => {
      if (responses.length === 0) return;

      setIsGenerating(true);

      try {
        // Build context from recent conversation
        const recentContext = prompts
          .slice(-3)
          .map((prompt, idx) => {
            const roundResponses = responses.filter(
              (r) => r.prompt === prompt || r.roundIndex === (prompts.length - 3 + idx)
            );
            const modelSummaries = roundResponses
              .filter((r) => !r.isError)
              .map((r) => `${r.modelName}: ${r.response.slice(0, 200)}...`)
              .join("\n");
            return `Q: ${prompt}\n${modelSummaries}`;
          })
          .join("\n\n");

        const systemPrompt = `You are a conversation flow assistant for a multi-model PM session. Your task is to suggest the NEXT prompt to continue the conversation naturally.

Analyze the conversation and suggest 5 contextual follow-up prompts that:
1. Build on what was discussed
2. Help explore different angles
3. Guide specific models to add chapters or perspectives
4. Keep the conversation flowing naturally

${steering ? `User guidance: ${steering}` : ""}

Format your response as JSON array:
[
  {
    "text": "The exact prompt text to use",
    "type": "follow-up" | "deep-dive" | "compare" | "clarify" | "next-chapter",
    "targetModels": ["model1", "model2"] // optional, which models should respond
  }
]

Make prompts:
- Specific and actionable
- Natural conversation starters
- Build on previous context
- Include @mentions when targeting specific models for their expertise`;

        const userPrompt = `Recent conversation:\n${recentContext}\n\nAvailable models: ${selectedModels.map((id) => modelNames[id] || id).join(", ")}\n\nSuggest 5 contextual follow-up prompts.`;

        let suggestionsText = "";

        if (isLocalModeEnabled()) {
          const localConfig = getLocalModeConfig("local");
          if (!localConfig.isValid) {
            throw new Error(localConfig.error || "Local mode configuration is invalid.");
          }

          const provider = new LocalOpenAICompatibleProvider({
            baseUrl: localConfig.baseUrl,
            model: localConfig.model,
            allowRemote: localConfig.allowRemote,
          });

          const agent = provider.createAgent({
            alias: "Suggestion Generator",
            systemPrompt: "",
            params: localConfig.defaultParams || {},
            model: localConfig.model,
          });

          const messages: LocalMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ];

          const result = await provider.send(agent, messages);
          suggestionsText = result.content;
        } else {
          const { data, error } = await supabase.functions.invoke("chat", {
            body: {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              model: "google/gemini-2.5-flash",
            },
          });

          if (error) throw error;

          if (data instanceof ReadableStream) {
            const reader = data.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                  try {
                    const json = JSON.parse(line.slice(6));
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) fullResponse += content;
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }

            suggestionsText = fullResponse;
          } else if (typeof data === "string") {
            suggestionsText = data;
          } else if (data?.choices?.[0]?.message?.content) {
            suggestionsText = data.choices[0].message.content;
          }
        }

        // Parse JSON from response
        const jsonMatch = suggestionsText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Suggestion[];
          setSuggestions(parsed.slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to generate suggestions:", error);
        // Fallback to basic suggestions
        setSuggestions([
          {
            text: "Can you elaborate on that last point?",
            type: "follow-up",
          },
          {
            text: "What are the alternative approaches here?",
            type: "compare",
          },
          {
            text: "Can you provide a concrete example?",
            type: "clarify",
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [responses, prompts, selectedModels, modelNames]
  );

  // Auto-generate suggestions when conversation updates
  useEffect(() => {
    if (responses.length > 0 && suggestions.length === 0 && !isGenerating) {
      generateSuggestions();
    }
  }, [responses.length, suggestions.length, isGenerating, generateSuggestions]);

  const handleRefresh = () => {
    generateSuggestions(steeringPrompt || undefined);
  };

  const getTypeIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "next-chapter":
        return "📖";
      case "deep-dive":
        return "🔍";
      case "compare":
        return "⚖️";
      case "clarify":
        return "💡";
      default:
        return "💬";
    }
  };

  const getTypeColor = (type: Suggestion["type"]) => {
    switch (type) {
      case "next-chapter":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "deep-dive":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "compare":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "clarify":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  if (responses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Smart Suggestions
          </Label>
          {!showSteering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSteering(!showSteering)}
              className="h-6 px-2 text-xs"
            >
              <Target className="h-3 w-3 mr-1" />
              Guide
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isGenerating || disabled}
          className="h-6 w-6 p-0"
          title="Refresh suggestions"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
        </Button>
      </div>

      {showSteering && (
        <div className="flex gap-2">
          <Input
            placeholder="Guide suggestions (e.g., 'focus on technical details', 'ask for code examples')..."
            value={steeringPrompt}
            onChange={(e) => setSteeringPrompt(e.target.value)}
            className="h-8 text-xs"
            disabled={disabled}
          />
          <Button
            size="sm"
            onClick={() => {
              generateSuggestions(steeringPrompt || undefined);
              setShowSteering(false);
            }}
            disabled={isGenerating || disabled}
            className="h-8 px-3"
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isGenerating ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Analyzing conversation...</span>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => onSelect(suggestion.text)}
              disabled={disabled}
              className="h-auto py-2 px-3 text-left justify-start hover:bg-primary/5"
            >
              <div className="flex flex-col gap-1 items-start">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getTypeIcon(suggestion.type)}</span>
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] h-4 px-1.5", getTypeColor(suggestion.type))}
                  >
                    {suggestion.type}
                  </Badge>
                </div>
                <span className="text-xs font-normal">{suggestion.text}</span>
                {suggestion.targetModels && suggestion.targetModels.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {suggestion.targetModels.map((modelId) => (
                      <Badge key={modelId} variant="outline" className="text-[9px] h-4 px-1">
                        @{modelNames[modelId] || modelId}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Button>
          ))
        ) : null}
      </div>
    </div>
  );
};

export default ContextualSuggestions;
