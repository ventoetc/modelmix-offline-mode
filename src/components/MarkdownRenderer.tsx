import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  size?: "sm" | "base" | "lg";
}

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Code copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border">
      {/* Language label */}
      <div className="flex items-center justify-between bg-muted/80 px-4 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>

      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: "1rem",
          fontSize: "0.875rem",
          lineHeight: "1.6",
          background: "hsl(var(--muted) / 0.3)",
        }}
        showLineNumbers={value.split("\n").length > 3}
        wrapLines
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

const MarkdownRenderer = ({ content, className, size = "base" }: MarkdownRendererProps) => {
  const sizeClasses = {
    sm: "prose-sm",
    base: "prose-base",
    lg: "prose-lg",
  };

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        sizeClasses[size],
        // Headings
        "prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-border",
        "prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3",
        "prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2",
        "prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2 prose-h4:font-semibold",
        // Paragraphs
        "prose-p:text-foreground prose-p:leading-7 prose-p:my-4",
        // Strong/Bold
        "prose-strong:text-foreground prose-strong:font-bold",
        // Emphasis/Italic
        "prose-em:text-foreground prose-em:italic",
        // Inline code
        "prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-code:font-medium",
        // Pre (handled by CodeBlock)
        "prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none prose-pre:my-0",
        // Blockquote
        "prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:text-foreground prose-blockquote:not-italic prose-blockquote:pl-4 prose-blockquote:pr-4 prose-blockquote:py-3 prose-blockquote:rounded-r-lg prose-blockquote:my-4",
        // Lists
        "prose-ul:text-foreground prose-ol:text-foreground prose-ul:my-4 prose-ol:my-4",
        "prose-ul:pl-6 prose-ol:pl-6",
        "prose-li:text-foreground prose-li:my-2 prose-li:leading-7",
        "prose-li:marker:text-primary prose-li:marker:font-bold",
        // Links
        "prose-a:text-primary prose-a:font-medium prose-a:underline prose-a:underline-offset-2 prose-a:decoration-primary/50 hover:prose-a:decoration-primary prose-a:transition-colors",
        // Horizontal rule
        "prose-hr:border-border prose-hr:my-8",
        // Tables
        "prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-table:overflow-hidden prose-table:rounded-lg prose-table:border prose-table:border-border",
        "prose-thead:bg-muted",
        "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground",
        "prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-3 prose-td:text-foreground",
        "prose-tr:border-b prose-tr:border-border last:prose-tr:border-0",
        // Images
        "prose-img:rounded-lg prose-img:shadow-md prose-img:my-6",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Wrap pre to avoid double styling
          pre: ({ children }) => <>{children}</>,
          
          // Code blocks and inline code
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const value = String(children).replace(/\n$/, "");
            
            // Check if this looks like a code block (has newlines or language class)
            if (match || value.includes("\n")) {
              return <CodeBlock language={match?.[1] || ""} value={value} />;
            }
            
            // Inline code
            return (
              <code className="bg-muted text-primary px-1.5 py-0.5 rounded-md text-sm font-mono font-medium" {...props}>
                {children}
              </code>
            );
          },

          // Enhanced links with external indicator
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a 
                href={href} 
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2 decoration-primary/50 hover:decoration-primary transition-colors"
                {...props}
              >
                {children}
                {isExternal && <ExternalLink className="h-3 w-3 inline-block" />}
              </a>
            );
          },

          // Enhanced blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 bg-muted/30 pl-4 pr-4 py-3 my-4 rounded-r-lg not-italic">
              {children}
            </blockquote>
          ),

          // Enhanced lists
          ul: ({ children }) => (
            <ul className="my-4 pl-6 space-y-2 list-disc marker:text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-primary marker:font-bold">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7 pl-1">
              {children}
            </li>
          ),

          // Enhanced headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-border text-foreground tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-6 mb-3 text-foreground tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-5 mb-2 text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-4 mb-2 text-foreground">
              {children}
            </h4>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="border-border my-8" />
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="leading-7 my-4 text-foreground">
              {children}
            </p>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-foreground">
              {children}
            </em>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-foreground border-b border-border last:border-b-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
