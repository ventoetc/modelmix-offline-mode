import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface PrintableQRCardProps {
  inviteCode: string;
  teamName: string;
}

const PrintableQRCard = ({ inviteCode, teamName }: PrintableQRCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const inviteUrl = `${window.location.origin}/tester-invite?code=${inviteCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(inviteUrl)}&color=7c3aed&bgcolor=fdfcfa`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ModelMix Tester Invite - ${teamName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: #fdfcfa;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            
            .card {
              width: 400px;
              background: linear-gradient(135deg, #fdfcfa 0%, #f8f6f3 100%);
              border-radius: 24px;
              padding: 40px 32px;
              box-shadow: 0 8px 32px rgba(124, 58, 237, 0.12);
              border: 2px solid #e8e4df;
              text-align: center;
            }
            
            .logo {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-bottom: 24px;
            }
            
            .logo-icon {
              width: 48px;
              height: 48px;
              background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: 20px;
            }
            
            .logo-text {
              font-size: 28px;
              font-weight: 700;
              color: #2d2a26;
            }
            
            .team-badge {
              display: inline-block;
              background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%);
              color: white;
              padding: 8px 20px;
              border-radius: 100px;
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 0.5px;
              margin-bottom: 28px;
            }
            
            .qr-container {
              background: white;
              padding: 20px;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 28px;
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            }
            
            .qr-code {
              width: 200px;
              height: 200px;
            }
            
            .instructions {
              margin-bottom: 24px;
            }
            
            .instructions h3 {
              font-size: 18px;
              font-weight: 600;
              color: #2d2a26;
              margin-bottom: 12px;
            }
            
            .instructions ol {
              text-align: left;
              padding-left: 24px;
              color: #5c574f;
              font-size: 14px;
              line-height: 1.8;
            }
            
            .instructions li {
              margin-bottom: 4px;
            }
            
            .code-display {
              background: #f3f1ee;
              padding: 12px 24px;
              border-radius: 12px;
              display: inline-block;
            }
            
            .code-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #8a857d;
              margin-bottom: 4px;
            }
            
            .code-value {
              font-family: 'SF Mono', 'Monaco', monospace;
              font-size: 20px;
              font-weight: 700;
              color: #7c3aed;
              letter-spacing: 2px;
            }
            
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #8a857d;
            }
            
            @media print {
              body { 
                background: white;
                padding: 0;
              }
              .card {
                box-shadow: none;
                border: 1px solid #e8e4df;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">
              <div class="logo-icon">M²</div>
              <span class="logo-text">ModelMix</span>
            </div>
            
            <div class="team-badge">${teamName} Beta Access</div>
            
            <div class="qr-container">
              <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
            </div>
            
            <div class="instructions">
              <h3>Join the Beta</h3>
              <ol>
                <li>Scan the QR code with your phone</li>
                <li>Create your account</li>
                <li>Wait for admin approval</li>
                <li>Start comparing AI models!</li>
              </ol>
            </div>
            
            <div class="code-display">
              <div class="code-label">Invite Code</div>
              <div class="code-value">${inviteCode}</div>
            </div>
            
            <div class="footer">
              Compare AI minds. One prompt, many answers.
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div 
        ref={cardRef}
        className="bg-gradient-to-br from-background to-secondary/50 rounded-2xl p-8 border-2 border-border shadow-lg max-w-sm mx-auto text-center"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold text-lg">
            M²
          </div>
          <span className="text-2xl font-bold text-foreground">ModelMix</span>
        </div>

        {/* Team Badge */}
        <div className="inline-block bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold mb-6">
          {teamName} Beta Access
        </div>

        {/* QR Code */}
        <div className="bg-card p-4 rounded-xl inline-block mb-6 shadow-md">
          <img 
            src={qrCodeUrl} 
            alt={`QR Code for ${teamName}`}
            className="w-40 h-40"
          />
        </div>

        {/* Instructions */}
        <div className="mb-6 text-left">
          <h3 className="text-base font-semibold text-foreground mb-3 text-center">Join the Beta</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Scan the QR code with your phone</li>
            <li>Create your account</li>
            <li>Wait for admin approval</li>
            <li>Start comparing AI models!</li>
          </ol>
        </div>

        {/* Code Display */}
        <div className="bg-secondary/80 px-6 py-3 rounded-xl inline-block">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Invite Code</p>
          <code className="text-lg font-bold font-mono text-primary tracking-wider">{inviteCode}</code>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-6">
          Compare AI minds. One prompt, many answers.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Card
        </Button>
      </div>
    </div>
  );
};

export default PrintableQRCard;
