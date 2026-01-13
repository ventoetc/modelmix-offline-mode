import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Ban, RefreshCw, Shield, Trash2, UserX, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface UserBan {
  id: string;
  user_id: string | null;
  fingerprint: string | null;
  reason: string;
  severity: string;
  expires_at: string | null;
  banned_at: string;
  banned_by: string | null;
  metadata: unknown;
}

interface AbuseReport {
  id: string;
  user_id: string | null;
  fingerprint: string | null;
  session_id: string | null;
  abuse_type: string;
  severity: string;
  confidence: number;
  detected_by: string;
  resolved: boolean;
  resolved_at: string | null;
  action_taken: string | null;
  created_at: string;
}

export default function UserBansManager() {
  const [bans, setBans] = useState<UserBan[]>([]);
  const [abuseReports, setAbuseReports] = useState<AbuseReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<"bans" | "reports">("bans");
  
  // New ban form
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banTarget, setBanTarget] = useState("");
  const [banTargetType, setBanTargetType] = useState<"email" | "fingerprint">("email");
  const [banReason, setBanReason] = useState("");
  const [banSeverity, setBanSeverity] = useState<"warning" | "temporary" | "permanent">("temporary");
  const [banDuration, setBanDuration] = useState("24");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch bans
      const { data: bansData, error: bansError } = await supabase
        .from("user_bans")
        .select("*")
        .order("banned_at", { ascending: false });

      if (bansError) throw bansError;
      setBans(bansData || []);

      // Fetch abuse reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("abuse_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;
      setAbuseReports(reportsData || []);
    } catch (error) {
      console.error("Failed to fetch ban data:", error);
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBan = async () => {
    if (!banTarget.trim() || !banReason.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      let userId: string | null = null;
      let fingerprint: string | null = null;

      if (banTargetType === "email") {
        // Look up user by email
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", banTarget.trim())
          .single();

        if (!profile) {
          toast({
            title: "User not found",
            description: "No user found with that email address.",
            variant: "destructive",
          });
          return;
        }
        userId = profile.user_id;
      } else {
        fingerprint = banTarget.trim();
      }

      const expiresAt = banSeverity === "permanent" 
        ? null 
        : new Date(Date.now() + parseInt(banDuration) * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("user_bans").insert({
        user_id: userId,
        fingerprint,
        reason: banReason.trim(),
        severity: banSeverity,
        expires_at: expiresAt,
      });

      if (error) throw error;

      toast({ title: "Ban created successfully" });
      setShowBanDialog(false);
      setBanTarget("");
      setBanReason("");
      setBanSeverity("temporary");
      setBanDuration("24");
      fetchData();
    } catch (error) {
      toast({
        title: "Failed to create ban",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRemoveBan = async (banId: string) => {
    try {
      const { error } = await supabase
        .from("user_bans")
        .delete()
        .eq("id", banId);

      if (error) throw error;
      toast({ title: "Ban removed" });
      fetchData();
    } catch (error) {
      toast({
        title: "Failed to remove ban",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleResolveReport = async (reportId: string, action: string) => {
    try {
      const { error } = await supabase
        .from("abuse_reports")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          action_taken: action,
        })
        .eq("id", reportId);

      if (error) throw error;
      toast({ title: "Report resolved" });
      fetchData();
    } catch (error) {
      toast({
        title: "Failed to resolve report",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "permanent": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "temporary": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "critical": return "bg-red-600/20 text-red-300 border-red-600/30";
      case "high": return "bg-orange-600/20 text-orange-300 border-orange-600/30";
      case "medium": return "bg-yellow-600/20 text-yellow-300 border-yellow-600/30";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeBans = bans.filter(b => !b.expires_at || new Date(b.expires_at) > new Date());
  const unresolvedReports = abuseReports.filter(r => !r.resolved);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bans</p>
                <p className="text-2xl font-bold text-foreground">{activeBans.length}</p>
              </div>
              <Ban className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bans</p>
                <p className="text-2xl font-bold text-foreground">{bans.length}</p>
              </div>
              <UserX className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-foreground">{unresolvedReports.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold text-foreground">{abuseReports.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeView === "bans" ? "default" : "outline"}
            onClick={() => setActiveView("bans")}
            size="sm"
          >
            <Ban className="h-4 w-4 mr-2" />
            User Bans
          </Button>
          <Button
            variant={activeView === "reports" ? "default" : "outline"}
            onClick={() => setActiveView("reports")}
            size="sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Abuse Reports
            {unresolvedReports.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unresolvedReports.length}</Badge>
            )}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Ban className="h-4 w-4 mr-2" />
                Create Ban
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create New Ban</DialogTitle>
                <DialogDescription>
                  Ban a user by email or fingerprint. This will prevent them from using the service.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select value={banTargetType} onValueChange={(v: "email" | "fingerprint") => setBanTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">User Email</SelectItem>
                      <SelectItem value="fingerprint">Device Fingerprint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{banTargetType === "email" ? "Email Address" : "Fingerprint"}</Label>
                  <Input
                    value={banTarget}
                    onChange={(e) => setBanTarget(e.target.value)}
                    placeholder={banTargetType === "email" ? "user@example.com" : "fp_xxxxx"}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Describe the reason for this ban..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={banSeverity} onValueChange={(v: "warning" | "temporary" | "permanent") => setBanSeverity(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="temporary">Temporary</SelectItem>
                        <SelectItem value="permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {banSeverity !== "permanent" && (
                    <div className="space-y-2">
                      <Label>Duration (hours)</Label>
                      <Input
                        type="number"
                        value={banDuration}
                        onChange={(e) => setBanDuration(e.target.value)}
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBanDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleCreateBan}>Create Ban</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bans Table */}
      {activeView === "bans" && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">User Bans</CardTitle>
            <CardDescription>Manage banned users and device fingerprints</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No bans found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Banned At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bans.map((ban) => {
                    const isExpired = ban.expires_at && new Date(ban.expires_at) < new Date();
                    return (
                      <TableRow key={ban.id} className={isExpired ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">
                              {ban.user_id ? `User: ${ban.user_id.slice(0, 8)}...` : `FP: ${ban.fingerprint?.slice(0, 12)}...`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{ban.reason}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(ban.severity)}>
                            {ban.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ban.expires_at ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(ban.expires_at), "MMM d, HH:mm")}
                              {isExpired && <Badge variant="outline" className="ml-1 text-xs">Expired</Badge>}
                            </div>
                          ) : (
                            <Badge variant="destructive">Never</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ban.banned_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBan(ban.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Abuse Reports Table */}
      {activeView === "reports" && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Abuse Reports</CardTitle>
            <CardDescription>Review and resolve detected abuse patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : abuseReports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No abuse reports found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Detected By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abuseReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.abuse_type}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(report.severity)}>
                          {report.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{(report.confidence * 100).toFixed(0)}%</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {report.user_id ? `User: ${report.user_id.slice(0, 8)}...` : 
                         report.fingerprint ? `FP: ${report.fingerprint.slice(0, 8)}...` : 
                         report.session_id ? `Session: ${report.session_id.slice(0, 8)}...` : "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm">{report.detected_by}</TableCell>
                      <TableCell>
                        {report.resolved ? (
                          <Badge variant="outline" className="bg-green-500/20 text-green-400">
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        {!report.resolved && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveReport(report.id, "dismissed")}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleResolveReport(report.id, "banned")}
                            >
                              Ban
                            </Button>
                          </div>
                        )}
                        {report.resolved && report.action_taken && (
                          <span className="text-xs text-muted-foreground">{report.action_taken}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
