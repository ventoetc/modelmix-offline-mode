import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Loader2, Users, QrCode, Copy, ExternalLink, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import PrintableQRCard from "./PrintableQRCard";

interface PendingApproval {
  id: string;
  email: string;
  team_name: string;
  invite_code: string;
  status: string;
  created_at: string;
}

interface InviteCode {
  id: string;
  invite_code: string;
  team_name: string;
  description: string;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

const TesterApprovals = () => {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [{ data: approvals }, { data: codes }] = await Promise.all([
      supabase
        .from("pending_tester_approvals")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("tester_invites")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    setPendingApprovals(approvals || []);
    setInviteCodes(codes || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproval = async (approvalId: string, action: "approve" | "reject") => {
    setProcessingId(approvalId);
    
    try {
      const { data, error } = await supabase.functions.invoke("approve-tester", {
        body: { approvalId, action }
      });

      if (error) throw error;

      toast({
        title: action === "approve" ? "✅ Approved!" : "❌ Rejected",
        description: `${data.email} has been ${action === "approve" ? "approved as tester" : "rejected"}`,
      });

      fetchData();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process approval",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getQRCodeUrl = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/tester-invite?code=${inviteCode}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`;
  };

  const copyInviteUrl = (inviteCode: string) => {
    const url = `${window.location.origin}/tester-invite?code=${inviteCode}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Invite URL copied to clipboard" });
  };

  const pendingCount = pendingApprovals.filter(a => a.status === "pending").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-2">
            <QrCode className="h-4 w-4" />
            Invite Codes
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Users className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Review and approve tester requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApprovals.filter(a => a.status === "pending").length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending approvals</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals
                      .filter(a => a.status === "pending")
                      .map((approval) => (
                        <TableRow key={approval.id}>
                          <TableCell className="font-medium">{approval.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{approval.team_name}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(approval.created_at), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={processingId === approval.id}
                              onClick={() => handleApproval(approval.id, "approve")}
                            >
                              {processingId === approval.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processingId === approval.id}
                              onClick={() => handleApproval(approval.id, "reject")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {inviteCodes.map((code) => (
              <Card key={code.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{code.team_name}</CardTitle>
                    <Badge variant={code.is_active ? "default" : "secondary"}>
                      {code.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>{code.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <img 
                      src={getQRCodeUrl(code.invite_code)} 
                      alt={`QR Code for ${code.team_name}`}
                      className="w-32 h-32 rounded-lg border"
                    />
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Invite Code</p>
                        <code className="text-lg font-mono font-bold">{code.invite_code}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Usage</p>
                        <p className="font-medium">{code.uses_count} / {code.max_uses}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyInviteUrl(code.invite_code)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy URL
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/tester-invite?code=${code.invite_code}`, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default">
                              <Printer className="h-3 w-3 mr-1" />
                              Print Card
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Printable QR Card</DialogTitle>
                            </DialogHeader>
                            <PrintableQRCard 
                              inviteCode={code.invite_code} 
                              teamName={code.team_name} 
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>All processed tester requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals
                    .filter(a => a.status !== "pending")
                    .map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">{approval.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{approval.team_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={approval.status === "approved" ? "default" : "destructive"}>
                            {approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(approval.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TesterApprovals;
