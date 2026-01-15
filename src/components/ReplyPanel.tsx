import { useEffect, useState, KeyboardEvent } from "react";
import { Send, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttachmentInput, { Attachment, UnsupportedModelInfo } from "@/components/AttachmentInput";
import FollowUpShortcuts from "@/components/FollowUpShortcuts";
import MentionInput, { MentionedModel } from "@/components/MentionInput";
import ReplyModeSelector, { ReplyMode } from "@/components/ReplyModeSelector";
import { RoutingPicker } from "@/components/RoutingPicker";
import { AgentIdentity } from "@/lib/localMode/types";

interface ReplyPanelProps {
  onSend: (
    message: string,
    attachments: Attachment[],
    mentionedModels: string[],
    mode: ReplyMode,
    targetAgentId?: string
  ) => Promise<void>;
  isLoading: boolean;
  unsupportedModels?: UnsupportedModelInfo[];
  availableModels: MentionedModel[];
  onSwapModel?: (oldModelId: string, newModelId: string) => void;
  onRemoveModelSlot?: (modelId: string) => void;
  agents?: AgentIdentity[];
}

const ReplyPanel = ({
  onSend,
  isLoading,
  unsupportedModels = [],
  availableModels = [],
  onSwapModel,
  onRemoveModelSlot,
  agents,
}: ReplyPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mentionedModels, setMentionedModels] = useState<MentionedModel[]>([]);
  const [replyMode, setReplyMode] = useState<ReplyMode>("all");
  const [targetAgentId, setTargetAgentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (mentionedModels.length === 0) {
      setReplyMode("all");
      return;
    }
    // If only 1 model is mentioned, force strict 1:1 privacy
    if (mentionedModels.length === 1) {
      setReplyMode("private-mentioned");
      return;
    }
    setReplyMode((prev) => (prev === "all" ? "mentioned-only" : prev));
  }, [mentionedModels.length]);

  const handleAttach = async (files: FileList) => {
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      let preview: string | undefined;
      let content: string | undefined;

      if (isImage) {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        const name = file.name.toLowerCase();
        const isLikelyText =
          file.type.startsWith("text/") ||
          file.type.includes("json") ||
          file.type === "application/pdf" ||
          [".txt", ".md", ".json", ".csv", ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css"].some((ext) =>
            name.endsWith(ext)
          );

        if (file.type === "application/pdf" && file.size <= 5 * 1024 * 1024) {
          try {
            const [{ getDocument, GlobalWorkerOptions }, workerSrc] = await Promise.all([
              import("pdfjs-dist/build/pdf"),
              import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
            ]);
            GlobalWorkerOptions.workerSrc = workerSrc.default;

            const data = await file.arrayBuffer();
            const pdf = await getDocument({ data }).promise;
            const pagesToRead = Math.min(pdf.numPages, 10);
            const parts: string[] = [];

            for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
              const page = await pdf.getPage(pageNumber);
              const textContent = await page.getTextContent();
              const pageText = (textContent.items as Array<{ str?: string }>)
                .map((item) => item.str || "")
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
              if (pageText) parts.push(pageText);
              if (parts.join("\n").length >= 200_000) break;
            }

            content = parts.join("\n\n");
            if (!content) content = undefined;
          } catch {
            content = undefined;
          }
        } else if (isLikelyText && file.size <= 200 * 1024) {
          try {
            const raw = await file.text();
            content = raw.length > 200_000 ? raw.slice(0, 200_000) : raw;
          } catch {
            content = undefined;
          }
        }
      }

      newAttachments.push({
        id: `${Date.now()}-${file.name}`,
        file,
        preview,
        content,
        type: isImage ? "image" : "file",
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMentionAdd = (model: MentionedModel) => {
    setMentionedModels((prev) => [...prev, model]);
  };

  const handleMentionRemove = (modelId: string) => {
    setMentionedModels((prev) => prev.filter((m) => m.id !== modelId));
  };

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    const mentionedIds = mentionedModels.map((m) => m.id);
    const mode: ReplyMode = mentionedIds.length === 0 ? "all" : replyMode;

    await onSend(
      message,
      attachments,
      mentionedIds,
      mode,
      targetAgentId
    );
    setMessage("");
    setAttachments([]);
    setMentionedModels([]);
    setTargetAgentId(undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleShortcutSelect = (prompt: string) => {
    setMessage(prompt);
  };

  return (
    <div className="fixed bottom-12 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm z-30">
      {/* Collapse toggle button */}
      <Button
        variant="ghost"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 h-8 rounded-t-md rounded-b-none bg-background/95 border border-b-0 border-border text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>Show follow-up</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>Hide</span>
          </>
        )}
      </Button>

      {!isCollapsed && (
        <div className="container mx-auto px-4 py-3 pb-4">
          {/* Follow-up shortcuts */}
          <div className="mb-2">
            <FollowUpShortcuts
              onSelect={handleShortcutSelect}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <MentionInput
                value={message}
                onChange={setMessage}
                mentionedModels={mentionedModels}
                onMentionAdd={handleMentionAdd}
                onMentionRemove={handleMentionRemove}
                availableModels={availableModels}
                placeholder="Follow-up... (Ctrl+Enter to send, @ to mention)"
                disabled={isLoading}
                onKeyDown={handleKeyDown}
              />
              <AttachmentInput
                attachments={attachments}
                onAttach={handleAttach}
                onRemove={handleRemoveAttachment}
                unsupportedModels={unsupportedModels}
                onSwapModel={onSwapModel}
                onRemoveModelSlot={onRemoveModelSlot}
              />
            </div>
            
            {agents && agents.length > 0 ? (
              <RoutingPicker
                agents={agents}
                selectedAgentId={targetAgentId}
                onSelect={setTargetAgentId}
                disabled={isLoading}
              />
            ) : (
              <ReplyModeSelector
                mode={replyMode}
                onModeChange={setReplyMode}
                mentionedCount={mentionedModels.length}
                disabled={isLoading}
              />
            )}
            <Button
              onClick={handleSubmit}
              size="icon"
              disabled={!message.trim() || isLoading}
              className="h-[50px] w-[50px] shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplyPanel;
