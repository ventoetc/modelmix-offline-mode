import { Button } from "@/components/ui/button";
import { Twitter, Linkedin, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SocialShareButtonsProps {
  referralMessage?: string;
  className?: string;
}

export function SocialShareButtons({ 
  referralMessage = "I just joined the ModelMix beta waitlist! Compare AI models side-by-side. Join me:", 
  className 
}: SocialShareButtonsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const shareUrl = typeof window !== "undefined" ? window.location.origin + "/waitlist" : "https://modelmix.app/waitlist";
  
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(referralMessage)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share it with friends to spread the word.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <span className="text-sm text-muted-foreground">Share to move up:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(twitterUrl, "_blank", "noopener,noreferrer")}
        className="gap-2"
      >
        <Twitter className="w-4 h-4" />
        Twitter
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(linkedinUrl, "_blank", "noopener,noreferrer")}
        className="gap-2"
      >
        <Linkedin className="w-4 h-4" />
        LinkedIn
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="gap-2"
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Link"}
      </Button>
    </div>
  );
}
