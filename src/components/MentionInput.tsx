import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MentionedModel {
  id: string;
  name: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  mentionedModels: MentionedModel[];
  onMentionAdd: (model: MentionedModel) => void;
  onMentionRemove: (modelId: string) => void;
  availableModels: MentionedModel[];
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

const MentionInput = ({
  value,
  onChange,
  mentionedModels,
  onMentionAdd,
  onMentionRemove,
  availableModels,
  placeholder = "Follow-up... (type @ to mention a model)",
  disabled = false,
  onKeyDown,
}: MentionInputProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter models based on mention query
  const filteredModels = availableModels.filter(
    (m) =>
      !mentionedModels.some((mentioned) => mentioned.id === m.id) &&
      m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Detect @ symbol and show dropdown
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    // Look for @ symbol before cursor
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Check if there's a space before @ (or it's at start)
      const charBeforeAt = atIndex > 0 ? newValue[atIndex - 1] : " ";
      
      if ((charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) && !textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt);
        setShowDropdown(true);
        setSelectedIndex(0);
        
        // Position dropdown near cursor
        if (textareaRef.current && containerRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setCursorPosition({
            top: rect.height + 4,
            left: Math.min(atIndex * 8, containerRect.width - 200),
          });
        }
        return;
      }
    }
    
    setShowDropdown(false);
    setMentionQuery("");
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDownInternal = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredModels.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredModels.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        selectModel(filteredModels[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        selectModel(filteredModels[selectedIndex]);
        return;
      }
    }
    
    // Pass through to parent handler
    onKeyDown?.(e);
  };

  const selectModel = useCallback((model: MentionedModel) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      // Remove the @query and just leave the text
      const newValue = value.slice(0, atIndex) + value.slice(cursorPos);
      onChange(newValue);
      
      // Add to mentioned models
      onMentionAdd(model);
    }
    
    setShowDropdown(false);
    setMentionQuery("");
    textareaRef.current.focus();
  }, [value, onChange, onMentionAdd]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[50px] max-h-[100px] text-sm resize-none pr-2"
      />
      
      {/* Mentioned models chips */}
      {mentionedModels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {mentionedModels.map((model) => (
            <Badge
              key={model.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              @{model.name.split("/").pop()?.split(":")[0] || model.name}
              <button
                type="button"
                onClick={() => onMentionRemove(model.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Mention dropdown */}
      {showDropdown && filteredModels.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto w-64"
          style={{
            top: cursorPosition?.top ?? "100%",
            left: cursorPosition?.left ?? 0,
          }}
        >
          {filteredModels.slice(0, 8).map((model, index) => (
            <button
              key={model.id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => selectModel(model)}
            >
              <span className="font-medium">{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;