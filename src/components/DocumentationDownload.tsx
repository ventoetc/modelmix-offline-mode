import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";

export const DocumentationDownload = () => {
  const handleDownload = () => {
    window.open('/docs/MODELMIX_TECHNICAL_DOCUMENTATION.md', '_blank');
  };

  return (
    <Button 
      onClick={handleDownload}
      variant="outline"
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      Download Documentation
    </Button>
  );
};
