import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Users, Activity, Coins, TrendingUp, Eye, 
  MessageSquare, Clock, RefreshCw, AlertCircle,
  UserPlus, Zap, DollarSign, Calendar, FileText, Download,
  Copy, Check, ExternalLink
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  waitlistCount: number;
  creditsInCirculation: number;
  creditsSpentTotal: number;
  sessions24h: number;
  events24h: number;
  transactions24h: number;
  auditEvents24h: number;
  recentSignups: { email: string; created_at: string }[];
  recentTransactions: { amount: number; source: string; created_at: string }[];
  topSessions: { session_id: string; message_count: number; total_tokens: number }[];
}

interface CreatedTester {
  email: string;
  password: string;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isCreatingTester, setIsCreatingTester] = useState(false);
  const [createdTester, setCreatedTester] = useState<CreatedTester | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [emailPrefix, setEmailPrefix] = useState("");

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch aggregate stats
      const [
        { data: users },
        { data: waitlist },
        { data: credits },
        { data: sessions },
        { data: events },
        { data: transactions },
        { data: recentSignups },
        { data: recentTx },
        { data: topSessions }
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
        supabase.from("user_credits").select("balance, lifetime_spent"),
        supabase.from("shadow_sessions").select("id", { count: "exact", head: true }).gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("shadow_events").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("credit_transactions").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("profiles").select("email, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("credit_transactions").select("amount, source, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("shadow_sessions").select("session_id, message_count, total_tokens").order("message_count", { ascending: false }).limit(5)
      ]);

      const totalBalance = credits?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0;
      const totalSpent = credits?.reduce((sum, c) => sum + (c.lifetime_spent || 0), 0) || 0;

      setStats({
        totalUsers: users?.length || 0,
        waitlistCount: waitlist?.length || 0,
        creditsInCirculation: totalBalance,
        creditsSpentTotal: totalSpent,
        sessions24h: sessions?.length || 0,
        events24h: events?.length || 0,
        transactions24h: transactions?.length || 0,
        auditEvents24h: 0,
        recentSignups: recentSignups || [],
        recentTransactions: recentTx || [],
        topSessions: topSessions || []
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQuickCreateTester = async () => {
    setIsCreatingTester(true);
    try {
      // Generate email with optional custom prefix
      const timestamp = Date.now();
      const prefix = emailPrefix.trim() 
        ? emailPrefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
        : 'tester';
      const email = `${prefix}-${timestamp}@modelmix.test`;
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke("create-test-user", {
        body: { email, startingCredits: 100 }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { password } = response.data;
      setCreatedTester({ email, password });
      setEmailPrefix(""); // Clear prefix after creation
      toast.success("Tester account created!");
      fetchStats();
    } catch (err) {
      console.error("Failed to create tester:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create tester");
    } finally {
      setIsCreatingTester(false);
    }
  };

  const handleLoginAsTester = () => {
    if (!createdTester) return;
    
    // Store credentials in sessionStorage for auto-fill
    sessionStorage.setItem('impersonation_email', createdTester.email);
    sessionStorage.setItem('impersonation_password', createdTester.password);
    
    // Open auth page in new tab
    window.open('/auth?impersonate=true', '_blank');
    toast.success("Opening login page in new tab - credentials will auto-fill");
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh and quick actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">System Overview</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="tester prefix..."
            value={emailPrefix}
            onChange={(e) => setEmailPrefix(e.target.value)}
            className="w-32 h-9 text-sm"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleQuickCreateTester}
            disabled={isCreatingTester}
            className="bg-green-600 hover:bg-green-700"
          >
            <UserPlus className={`h-4 w-4 mr-2 ${isCreatingTester ? "animate-pulse" : ""}`} />
            {isCreatingTester ? "Creating..." : "Create Tester"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStats}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Created Tester Credentials Card */}
      {createdTester && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Check className="h-5 w-5" />
              Tester Account Created
            </CardTitle>
            <CardDescription>Copy these credentials now - password won't be shown again!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono">
                    {createdTester.email}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdTester.email, "Email")}
                  >
                    {copiedField === "Email" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Password</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono">
                    {createdTester.password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdTester.password, "Password")}
                  >
                    {copiedField === "Password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 self-start mt-5">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleLoginAsTester}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Login as Tester
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreatedTester(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Waitlist</span>
            </div>
            <div className="text-3xl font-bold">{stats?.waitlistCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Waiting for beta</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Credits Active</span>
            </div>
            <div className="text-3xl font-bold">{stats?.creditsInCirculation?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">In user balances</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Credits Spent</span>
            </div>
            <div className="text-3xl font-bold">{stats?.creditsSpentTotal?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime usage</p>
          </CardContent>
        </Card>
      </div>

      {/* 24-Hour Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Last 24 Hours
          </CardTitle>
          <CardDescription>Real-time activity metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats?.sessions24h || 0}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <MessageSquare className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats?.events24h || 0}</div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <DollarSign className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats?.transactions24h || 0}</div>
              <div className="text-xs text-muted-foreground">Transactions</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {stats?.creditsSpentTotal && stats?.totalUsers 
                  ? Math.round(stats.creditsSpentTotal / Math.max(stats.totalUsers, 1)) 
                  : 0}
              </div>
              <div className="text-xs text-muted-foreground">Avg Credits/User</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSignups && stats.recentSignups.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSignups.map((signup, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                      {signup.email || "No email"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(signup.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent signups</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentTransactions.slice(0, 5).map((tx, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={tx.amount > 0 ? "default" : "secondary"}
                        className={tx.amount > 0 ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                      >
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </Badge>
                      <span className="text-muted-foreground capitalize">{tx.source}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Most Active Sessions
          </CardTitle>
          <CardDescription>Sessions with highest engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.topSessions && stats.topSessions.length > 0 ? (
            <div className="space-y-2">
              {stats.topSessions.map((session, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                    <code className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {session.session_id}
                    </code>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-bold">{session.message_count}</div>
                      <div className="text-xs text-muted-foreground">messages</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{session.total_tokens?.toLocaleString() || 0}</div>
                      <div className="text-xs text-muted-foreground">tokens</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No session data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Documentation Downloads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Admin Documentation
          </CardTitle>
          <CardDescription>Reference guides and system documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/docs/ADMIN_GUIDE.md" 
              download 
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Admin Guide</p>
                <p className="text-xs text-muted-foreground">Bans, enforcement, tiers</p>
              </div>
            </a>
            <a 
              href="/docs/MODELMIX_TECHNICAL_DOCUMENTATION.md" 
              download 
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Technical Docs</p>
                <p className="text-xs text-muted-foreground">Architecture, API, schema</p>
              </div>
            </a>
            <a 
              href="/docs/USER_GUIDE.md" 
              download 
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">User Guide</p>
                <p className="text-xs text-muted-foreground">End-user documentation</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* System Health (placeholder for future) */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">System Status: Healthy</p>
              <p className="text-sm">All services operational • Auto-refresh every 30s</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
