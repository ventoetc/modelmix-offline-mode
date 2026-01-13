import { useState, useEffect } from "react";
import { FileText, FileDown, Download, Zap, AlignLeft, FileText as FileTextFull, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getLocalModeConfig, isLocalModeEnabled, LocalOpenAICompatibleProvider, type LocalMessage } from "@/lib/localMode";

interface ResponseData {
  id: string;
  model: string;
  modelName: string;
  prompt: string;
  response: string;
  timestamp: string;
  latency?: number;
  tokenCount?: number;
  isError?: boolean;
  roundIndex?: number;
}

interface ExportDialogProps {
  sessionTitle: string;
  sessionStartTime: string;
  originalPrompt: string;
  responses: ResponseData[];
  prompts: string[];
  disabled?: boolean;
  iconOnly?: boolean;
}

type ExportFormat = "markdown" | "json" | "pdf";
type ExportDepth = "basic" | "in-depth" | "detailed";

// Helper functions for formatting responses
const extractAbstract = (text: string): string => {
  if (!text) return "";
  const withoutCode = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  const sentences = withoutCode.match(/[^.!?]+[.!?]+/g) || [withoutCode];
  const abstract = sentences.slice(0, 4).join(" ").trim();
  const cleaned = abstract
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 350 ? cleaned.slice(0, 347) + "..." : cleaned;
};

const extractKeyPoints = (text: string): string[] => {
  if (!text) return [];
  const headers = text.match(/^#{1,3}\s+.+$/gm) || [];
  if (headers.length > 0) {
    return headers.slice(0, 5).map(h => h.replace(/^#{1,3}\s+/, ""));
  }
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim() && !p.startsWith("```"));
  return paragraphs.slice(1, 5).map(p => {
    const firstSentence = p.split(/[.!?]/)[0].replace(/#{1,6}\s/g, "").trim();
    return firstSentence.length > 100 ? firstSentence.slice(0, 97) + "..." : firstSentence;
  });
};

const extractActionItems = (text: string): string[] => {
  if (!text) return [];
  const actions: string[] = [];
  
  // Look for bullet points that suggest actions
  const bullets = text.match(/^[-*•]\s.+$/gm) || [];
  bullets.forEach(b => {
    const clean = b.replace(/^[-*•]\s+/, "").trim();
    if (clean.length > 10 && clean.length < 150) {
      actions.push(clean);
    }
  });
  
  // Look for numbered lists
  const numbered = text.match(/^\d+\.\s.+$/gm) || [];
  numbered.forEach(n => {
    const clean = n.replace(/^\d+\.\s+/, "").trim();
    if (clean.length > 10 && clean.length < 150) {
      actions.push(clean);
    }
  });
  
  return actions.slice(0, 5);
};

const ExportDialog = ({ 
  sessionTitle, 
  sessionStartTime, 
  originalPrompt, 
  responses, 
  prompts = [],
  disabled,
  iconOnly = false
}: ExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [exportDepth, setExportDepth] = useState<ExportDepth>("detailed");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeAbstracts, setIncludeAbstracts] = useState(true);
  const [includeActions, setIncludeActions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [includeSuperSummary, setIncludeSuperSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [superSummary, setSuperSummary] = useState<string | null>(null);
  const [summarySteeringPrompt, setSummarySteeringPrompt] = useState("");

  // Reset super summary when dialog closes
  useEffect(() => {
    if (!open) {
      setSuperSummary(null);
      setIncludeSuperSummary(false);
    }
  }, [open]);

  // Generate Super Summary using AI
  const generateSuperSummary = async () => {
    if (responses.length === 0) return;
    
    setIsGeneratingSummary(true);
    
    try {
      // Build a comprehensive conversation transcript
      const transcript = orderedPrompts.map((promptText, idx) => {
        const roundResponses = responses.filter(r => 
          r.roundIndex === idx || (r.roundIndex === undefined && r.prompt === promptText)
        );
        
        let section = `## Round ${idx + 1}: ${promptText}\n\n`;
        roundResponses.forEach(r => {
          if (!r.isError) {
            section += `### ${r.modelName}\n${r.response.slice(0, 1000)}${r.response.length > 1000 ? '...' : ''}\n\n`;
          }
        });
        return section;
      }).join('\n---\n\n');

      const systemPrompt = `You are an expert at synthesizing multi-model AI conversations into clear, actionable summaries.
Your task is to create a "Super Summary" that captures:
1. The main topic/question being explored
2. Key insights and consensus points across models
3. Notable disagreements or alternative perspectives
4. Actionable takeaways or conclusions
5. Any patterns in how different models approached the problem

Format your response in clear markdown with headers. Be concise but comprehensive. Focus on what would be most valuable for someone reviewing this conversation later.

${summarySteeringPrompt ? `\nAdditional focus requested by user: ${summarySteeringPrompt}` : ""}`;

      const transcriptForSummary = transcript.length > 25_000 ? transcript.slice(0, 25_000) : transcript;

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
          alias: "Super Summary",
          systemPrompt: "",
          params: localConfig.defaultParams || {},
          model: localConfig.model,
        });

        const summaryMessages: LocalMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please synthesize this multi-model conversation:\n\n${transcriptForSummary}` },
        ];

        const result = await provider.send(agent, summaryMessages);
        setSuperSummary(result.content);
      } else {
        const { data, error } = await supabase.functions.invoke("chat", {
          body: {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Please synthesize this multi-model conversation:\n\n${transcriptForSummary}` },
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

          setSuperSummary(fullResponse);
        } else if (typeof data === "string") {
          setSuperSummary(data);
        } else if (data?.choices?.[0]?.message?.content) {
          setSuperSummary(data.choices[0].message.content);
        }
      }
      
      setIncludeSuperSummary(true);
      toast({ title: "Super Summary generated!" });
    } catch (error) {
      console.error('Super Summary error:', error);
      toast({ 
        title: "Failed to generate summary", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const generateExportTitle = (title: string): string => {
    if (!title) return "modelmix-session";
    return title.toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 40) || "session";
  };

  // Use prompts array to maintain order, fallback to grouping
  const orderedPrompts = prompts.length > 0 ? prompts : [...new Set(responses.map(r => r.prompt))];
  
  // Group responses by their round/prompt
  const getResponsesForPrompt = (promptText: string, roundIndex: number) => {
    return responses.filter(r => 
      r.prompt === promptText || r.roundIndex === roundIndex
    );
  };

  const formatResponseContent = (response: ResponseData, depth: ExportDepth): string => {
    if (response.isError) {
      return `⚠️ **Error:** ${response.response}`;
    }

    let content = "";
    const abstract = extractAbstract(response.response);
    const keyPoints = extractKeyPoints(response.response);
    const actions = extractActionItems(response.response);

    if (depth === "basic") {
      // Just the abstract
      if (includeAbstracts && abstract) {
        content += `> **Summary:** ${abstract}\n`;
      }
      if (includeActions && actions.length > 0) {
        content += `\n**Key Actions:**\n`;
        actions.slice(0, 3).forEach(a => {
          content += `- ${a}\n`;
        });
      }
    } else if (depth === "in-depth") {
      // Abstract + key points
      if (includeAbstracts && abstract) {
        content += `> **Summary:** ${abstract}\n\n`;
      }
      if (keyPoints.length > 0) {
        content += `**Key Points:**\n`;
        keyPoints.forEach(p => {
          content += `- ${p}\n`;
        });
        content += "\n";
      }
      if (includeActions && actions.length > 0) {
        content += `**Actions & Insights:**\n`;
        actions.forEach(a => {
          content += `- ${a}\n`;
        });
        content += "\n";
      }
      // Add first paragraph of full content
      const firstPara = response.response.split(/\n\n+/)[0];
      if (firstPara && firstPara !== abstract) {
        content += `${firstPara}\n`;
      }
    } else {
      // Detailed - everything
      if (includeAbstracts && abstract) {
        content += `> **Summary:** ${abstract}\n\n`;
      }
      if (includeActions && actions.length > 0) {
        content += `**Key Actions:**\n`;
        actions.forEach(a => {
          content += `- ${a}\n`;
        });
        content += "\n---\n\n";
      }
      content += response.response;
    }

    return content;
  };

  const generateMarkdownContent = (): string => {
    const exportDate = new Date().toLocaleString();
    const startDate = sessionStartTime ? new Date(sessionStartTime).toLocaleString() : exportDate;
    const depthLabel = exportDepth === "basic" ? "Summary" : exportDepth === "in-depth" ? "Overview" : "Full";
    
    let markdown = `# ${sessionTitle || "ModelMix Session"}\n\n`;
    markdown += `**Started:** ${startDate}\n`;
    markdown += `**Exported:** ${exportDate}\n`;
    markdown += `**Export Type:** ${depthLabel}\n`;
    markdown += `**Models:** ${[...new Set(responses.map(r => r.modelName))].join(", ")}\n`;
    markdown += `**Rounds:** ${orderedPrompts.length}\n\n`;
    markdown += `---\n\n`;

    orderedPrompts.forEach((promptText, turnIndex) => {
      const turnResponses = responses.filter(r => 
        r.roundIndex === turnIndex || (r.roundIndex === undefined && r.prompt === promptText)
      );
      
      if (turnResponses.length === 0) return;
      
      const isOriginal = turnIndex === 0;
      
      markdown += `## ${isOriginal ? "Initial Prompt" : `Round ${turnIndex + 1}`}\n\n`;
      markdown += `> ${promptText}\n\n`;
      
      if (includeTimestamps && turnResponses[0]?.timestamp) {
        markdown += `*Sent: ${new Date(turnResponses[0].timestamp).toLocaleString()}*\n\n`;
      }

      // Show context if it was a cross-reference round
      const hasContext = promptText.includes("[Context from other models");
      if (hasContext) {
        markdown += `📎 *This round included cross-reference context from other models*\n\n`;
      }

      markdown += `### Responses\n\n`;
      
      turnResponses.forEach((r) => {
        markdown += `#### ${r.modelName}\n\n`;
        
        if (includeMetadata && (r.latency || r.tokenCount)) {
          const meta = [];
          if (r.latency) meta.push(`${r.latency}ms`);
          if (r.tokenCount) meta.push(`${r.tokenCount} tokens`);
          markdown += `*${meta.join(' • ')}*\n\n`;
        }
        
        markdown += formatResponseContent(r, exportDepth);
        markdown += "\n\n";
      });
      
      markdown += `---\n\n`;
    });

    // Add Super Summary at the end if available
    if (includeSuperSummary && superSummary) {
      markdown += `## 🧠 Super Summary\n\n`;
      markdown += `*AI-synthesized overview of the entire conversation*\n\n`;
      markdown += superSummary;
      markdown += `\n\n---\n\n`;
    }

    return markdown;
  };

  const generateJsonContent = (): string => {
    const jsonData: Record<string, unknown> = {
      session: {
        title: sessionTitle,
        startTime: sessionStartTime,
        exportTime: new Date().toISOString(),
        exportDepth,
        models: [...new Set(responses.map(r => r.modelName))],
        totalRounds: orderedPrompts.length,
        totalResponses: responses.length,
      },
      conversation: orderedPrompts.map((promptText, index) => {
        const turnResponses = responses.filter(r => 
          r.roundIndex === index || (r.roundIndex === undefined && r.prompt === promptText)
        );
        
        return {
          round: index + 1,
          isInitial: index === 0,
          prompt: promptText,
          responses: turnResponses.map(r => ({
            model: r.model,
            modelName: r.modelName,
            abstract: includeAbstracts ? extractAbstract(r.response) : undefined,
            keyPoints: exportDepth !== "basic" ? extractKeyPoints(r.response) : undefined,
            actions: includeActions ? extractActionItems(r.response) : undefined,
            response: exportDepth === "detailed" ? r.response : undefined,
            timestamp: includeTimestamps ? r.timestamp : undefined,
            ...(includeMetadata && {
              latency: r.latency,
              tokenCount: r.tokenCount,
            }),
            isError: r.isError || false,
          })),
        };
      }),
    };
    
    // Add super summary if available
    if (includeSuperSummary && superSummary) {
      jsonData.superSummary = superSummary;
    }
    
    return JSON.stringify(jsonData, null, 2);
  };

  const exportMarkdown = () => {
    const markdown = generateMarkdownContent();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generateExportTitle(sessionTitle)}-${exportDepth}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const json = generateJsonContent();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generateExportTitle(sessionTitle)}-${exportDepth}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate PDF by opening print dialog with formatted HTML
  const exportPdf = () => {
    const markdown = generateMarkdownContent();
    
    // Convert markdown to basic HTML
    const htmlContent = markdown
      .replace(/^# (.+)$/gm, '<h1 style="font-size: 24px; margin-bottom: 16px; color: #1a1a1a;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; margin-top: 24px; margin-bottom: 12px; color: #333;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; margin-top: 16px; margin-bottom: 8px; color: #444;">$1</h3>')
      .replace(/^#### (.+)$/gm, '<h4 style="font-size: 14px; margin-top: 12px; margin-bottom: 6px; color: #555; font-weight: 600;">$1</h4>')
      .replace(/^\*\*(.+?)\*\*$/gm, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^> (.+)$/gm, '<blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 12px 0; color: #555; background: #f8f8fc; padding: 8px 12px; border-radius: 4px;">$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li style="margin: 4px 0;">$1</li>')
      .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">')
      .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
        return `<pre style="background: #f4f4f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; font-family: monospace;">${code}</pre>`;
      });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${sessionTitle || 'ModelMix Export'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              color: #1a1a1a;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <p style="margin: 8px 0;">${htmlContent}</p>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format === "markdown") {
        exportMarkdown();
        toast({ title: "Exported as Markdown!" });
      } else if (format === "pdf") {
        exportPdf();
        toast({ title: "Opening PDF preview..." });
      } else {
        exportJson();
        toast({ title: "Exported as JSON!" });
      }
      setOpen(false);
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" disabled={disabled} className="h-8 w-8" title="Export session">
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={disabled}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-[480px] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Export Session</DialogTitle>
          <DialogDescription>
            Export the entire conversation with all {responses.length} responses across {orderedPrompts.length} round{orderedPrompts.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Export Depth */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Depth</Label>
            <RadioGroup value={exportDepth} onValueChange={(v) => setExportDepth(v as ExportDepth)}>
              <div className="grid grid-cols-3 gap-2">
                <div 
                  className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    exportDepth === "basic" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setExportDepth("basic")}
                >
                  <Zap className={`h-5 w-5 mb-1 ${exportDepth === "basic" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Basic</span>
                  <span className="text-[10px] text-muted-foreground">Summaries</span>
                </div>
                <div 
                  className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    exportDepth === "in-depth" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setExportDepth("in-depth")}
                >
                  <AlignLeft className={`h-5 w-5 mb-1 ${exportDepth === "in-depth" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">In-Depth</span>
                  <span className="text-[10px] text-muted-foreground">+ Key Points</span>
                </div>
                <div 
                  className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    exportDepth === "detailed" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setExportDepth("detailed")}
                >
                  <FileTextFull className={`h-5 w-5 mb-1 ${exportDepth === "detailed" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Detailed</span>
                  <span className="text-[10px] text-muted-foreground">Everything</span>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Markdown (.md)</div>
                    <div className="text-xs text-muted-foreground">Readable, easy to share</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileTextFull className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">PDF</div>
                    <div className="text-xs text-muted-foreground">Print-ready document</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileDown className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">JSON</div>
                    <div className="text-xs text-muted-foreground">Structured data, re-importable</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="abstracts" 
                  checked={includeAbstracts}
                  onCheckedChange={(checked) => setIncludeAbstracts(checked as boolean)}
                />
                <Label htmlFor="abstracts" className="text-sm cursor-pointer">
                  Summaries
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="actions" 
                  checked={includeActions}
                  onCheckedChange={(checked) => setIncludeActions(checked as boolean)}
                />
                <Label htmlFor="actions" className="text-sm cursor-pointer">
                  Actions & Insights
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="metadata" 
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata" className="text-sm cursor-pointer">
                  Metadata
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="timestamps" 
                  checked={includeTimestamps}
                  onCheckedChange={(checked) => setIncludeTimestamps(checked as boolean)}
                />
                <Label htmlFor="timestamps" className="text-sm cursor-pointer">
                  Timestamps
                </Label>
              </div>
            </div>
          </div>

          {/* Super Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Super Summary
              </Label>
              {!superSummary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSuperSummary}
                  disabled={isGeneratingSummary || responses.length === 0}
                  className="h-7 text-xs"
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              )}
            </div>
            {superSummary ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">✓ Summary Ready</span>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="supersummary"
                      checked={includeSuperSummary}
                      onCheckedChange={(checked) => setIncludeSuperSummary(checked as boolean)}
                    />
                    <Label htmlFor="supersummary" className="text-xs cursor-pointer">
                      Include in export
                    </Label>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-3">
                  {superSummary.slice(0, 200)}...
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Generate an AI synthesis of all model responses to include in your export.
                </div>
                <Textarea
                  placeholder="Optional: Add specific focus areas (e.g., 'Focus on technical details', 'Emphasize practical examples')..."
                  value={summarySteeringPrompt}
                  onChange={(e) => setSummarySteeringPrompt(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                  disabled={isGeneratingSummary}
                />
              </div>
            )}
          </div>

          {/* Preview summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="font-medium mb-1">Session Summary</div>
            <div className="text-muted-foreground text-xs grid grid-cols-2 gap-1">
              <div>Title: {sessionTitle || "Untitled"}</div>
              <div>Rounds: {orderedPrompts.length}</div>
              <div>Responses: {responses.length}</div>
              <div>Models: {[...new Set(responses.map(r => r.modelName))].length}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 bg-background">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || responses.length === 0}>
            {isExporting ? "Exporting..." : `Export ${exportDepth === "basic" ? "Summary" : exportDepth === "in-depth" ? "Overview" : "Full"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
