import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FinancialsTab from "@/components/admin/FinancialsTab";
import DashboardOverview from "@/components/admin/DashboardOverview";
import UsageLogsView from "@/components/admin/UsageLogsView";
import UserBansManager from "@/components/admin/UserBansManager";
import SessionDetailView from "@/components/admin/SessionDetailView";
import BYOKTelemetryDashboard from "@/components/admin/BYOKTelemetryDashboard";
import TesterApprovals from "@/components/admin/TesterApprovals";
import ModelGroupsManager from "@/components/admin/ModelGroupsManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, Shield, Users, Settings, Coins, 
  RefreshCw, UserPlus, Trash2, Check, X, AlertTriangle,
  FlaskConical, Copy, LogIn, DollarSign, Mail, ClipboardList,
  Download, Send, CheckSquare, Square, LayoutDashboard, FileText, BookOpen,
  Menu
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "user" | "tester";
  email?: string;
}

interface TestAccount {
  id: string;
  email: string;
  description: string | null;
  starting_credits: number;
  created_at: string;
}

interface CreditConfigItem {
  id: string;
  key: string;
  value: number;
  description: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  tier: string | null;
  created_at: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string;
  use_case: string;
  profession: string | null;
  referral_source: string | null;
  preferred_models: string[] | null;
  notified: boolean;
  converted_to_user: boolean;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // User management
  const [users, setUsers] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  
  // Credit config
  const [creditConfig, setCreditConfig] = useState<CreditConfigItem[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configValue, setConfigValue] = useState("");
  
  // Test accounts
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [newTestEmail, setNewTestEmail] = useState("");
  const [newTestDescription, setNewTestDescription] = useState("");
  const [newTestCredits, setNewTestCredits] = useState("100");
  
  // Credit adjustment
  const [userCredits, setUserCredits] = useState<Map<string, number>>(new Map());
  const [adjustingUser, setAdjustingUser] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  
  // Created test user password display
  const [createdTestUser, setCreatedTestUser] = useState<{ email: string; password: string } | null>(null);
  const [isCreatingTestUser, setIsCreatingTestUser] = useState(false);
  
  // Waitlist
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [selectedWaitlist, setSelectedWaitlist] = useState<Set<string>>(new Set());
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  
  // Store passwords for impersonation (session only)
  const [storedPasswords, setStoredPasswords] = useState<Map<string, string>>(new Map());

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!error && data) {
        setIsAdmin(true);
      }
      setIsLoading(false);
    };
    
    checkAdmin();
  }, [user]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (profilesData) {
      setUsers(profilesData as Profile[]);
    }
    
    // Fetch user roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("*");
    
    if (rolesData) {
      // Enrich with email from profiles
      const enrichedRoles = rolesData.map(role => {
        const profile = profilesData?.find(p => p.user_id === role.user_id);
        return {
          ...role,
          email: profile?.email || "Unknown"
        } as UserRole;
      });
      setUserRoles(enrichedRoles);
    }
    
    // Fetch credit config
    const { data: configData } = await supabase
      .from("credit_config")
      .select("*")
      .order("key");
    
    if (configData) {
      setCreditConfig(configData as CreditConfigItem[]);
    }
    
    // Fetch test accounts
    const { data: testData } = await supabase
      .from("test_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (testData) {
      setTestAccounts(testData as TestAccount[]);
    }
    
    // Fetch user credits for all users
    const { data: creditsData } = await supabase
      .from("user_credits")
      .select("user_id, balance");
    
    if (creditsData) {
      const creditsMap = new Map<string, number>();
      creditsData.forEach(c => {
        if (c.user_id) creditsMap.set(c.user_id, c.balance);
      });
      setUserCredits(creditsMap);
    }
    
    // Fetch waitlist entries
    const { data: waitlistData } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (waitlistData) {
      setWaitlistEntries(waitlistData as WaitlistEntry[]);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add admin role
  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    
    // Find user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newAdminEmail.trim())
      .single();
    
    if (!profile) {
      toast({
        title: "User not found",
        description: "No user found with that email address.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if already admin
    const existingRole = userRoles.find(r => r.user_id === profile.user_id && r.role === "admin");
    if (existingRole) {
      toast({
        title: "Already admin",
        description: "This user is already an admin."
      });
      return;
    }
    
    // Add admin role
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "admin" });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "Admin added", description: `${newAdminEmail} is now an admin.` });
    setNewAdminEmail("");
    fetchData();
  };

  // Remove admin role
  const handleRemoveAdmin = async (roleId: string, email: string) => {
    if (email === user?.email) {
      toast({
        title: "Cannot remove yourself",
        description: "You cannot remove your own admin role.",
        variant: "destructive"
      });
      return;
    }
    
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "Admin removed" });
    fetchData();
  };

  // Update credit config
  const handleUpdateConfig = async (configId: string) => {
    const numValue = parseFloat(configValue);
    if (isNaN(numValue)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number.",
        variant: "destructive"
      });
      return;
    }
    
    const { error } = await supabase
      .from("credit_config")
      .update({ value: numValue, updated_at: new Date().toISOString() })
      .eq("id", configId);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "Config updated" });
    setEditingConfig(null);
    fetchData();
  };

  // Update user tier
  const handleUpdateUserTier = async (userId: string, tier: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ tier })
      .eq("user_id", userId);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "User tier updated" });
    fetchData();
  };

  // Adjust user credits
  const handleAdjustCredits = async (userId: string) => {
    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a non-zero number.",
        variant: "destructive"
      });
      return;
    }
    
    const { data, error } = await supabase.rpc("admin_adjust_credits", {
      target_user_id: userId,
      adjustment: amount,
      reason: adjustmentReason.trim() || "Admin adjustment"
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ 
      title: "Credits adjusted", 
      description: `New balance: ${data} credits`
    });
    setAdjustingUser(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    fetchData();
  };

  // Switch to test account identity (with auto-login if password is stored)
  const handleSwitchIdentity = (email: string) => {
    const password = storedPasswords.get(email);
    if (password) {
      // Store password in sessionStorage for auto-login
      sessionStorage.setItem("impersonate_password", password);
      navigate(`/auth?tab=login&email=${encodeURIComponent(email)}&impersonate=true`);
    } else {
      // Just navigate to login with email pre-filled
      navigate(`/auth?tab=login&email=${encodeURIComponent(email)}`);
    }
  };

  // Create test user with password (using edge function)
  const handleCreateTestUser = async () => {
    if (!newTestEmail.trim()) return;
    
    setIsCreatingTestUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-test-user", {
        body: {
          email: newTestEmail.trim(),
          startingCredits: parseInt(newTestCredits) || 100
        }
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
        return;
      }
      
      // Also register in test_accounts table
      await supabase.from("test_accounts").insert({
        email: newTestEmail.trim(),
        description: newTestDescription.trim() || null,
        starting_credits: parseInt(newTestCredits) || 100,
        created_by: user?.id
      });
      
      // Show the password and store for impersonation
      setCreatedTestUser({
        email: data.email,
        password: data.password
      });
      
      // Store password for this session so we can impersonate
      setStoredPasswords(prev => new Map(prev).set(data.email, data.password));
      
      toast({ 
        title: "Test user created!", 
        description: "Copy the password below - it won't be shown again." 
      });
      
      setNewTestEmail("");
      setNewTestDescription("");
      setNewTestCredits("100");
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create test user",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTestUser(false);
    }
  };

  // Add test account (register only, no user creation)
  const handleAddTestAccount = async () => {
    if (!newTestEmail.trim()) return;
    
    const { error } = await supabase
      .from("test_accounts")
      .insert({
        email: newTestEmail.trim(),
        description: newTestDescription.trim() || null,
        starting_credits: parseInt(newTestCredits) || 100,
        created_by: user?.id
      });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "Test account registered", description: newTestEmail });
    setNewTestEmail("");
    setNewTestDescription("");
    setNewTestCredits("100");
    fetchData();
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (createdTestUser) {
      navigator.clipboard.writeText(createdTestUser.password);
      toast({ title: "Password copied!" });
    }
  };

  // Remove test account
  const handleRemoveTestAccount = async (id: string) => {
    const { error } = await supabase
      .from("test_accounts")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "Test account removed" });
    fetchData();
  };

  // Copy test account email for quick login
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({ title: "Email copied", description: "Use this to sign in as the test user." });
  };

  // Check if current user is a test account
  const isCurrentUserTest = testAccounts.some(t => t.email === user?.email);

  // Add tester role to a user
  const handleAddTester = async (email: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .single();
    
    if (!profile) {
      toast({
        title: "User not registered",
        description: "This test email hasn't signed up yet.",
        variant: "destructive"
      });
      return;
    }
    
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "tester" });
    
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already a tester", description: "This user already has the tester role." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    
    toast({ title: "Tester role added" });
    fetchData();
  };

  // Waitlist bulk actions
  const handleToggleWaitlistSelection = (id: string) => {
    setSelectedWaitlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllWaitlist = () => {
    if (selectedWaitlist.size === waitlistEntries.length) {
      setSelectedWaitlist(new Set());
    } else {
      setSelectedWaitlist(new Set(waitlistEntries.map(e => e.id)));
    }
  };

  const handleMarkAsNotified = async () => {
    if (selectedWaitlist.size === 0) return;
    
    const { error } = await supabase
      .from("waitlist")
      .update({ notified: true })
      .in("id", Array.from(selectedWaitlist));
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Marked as notified", description: `${selectedWaitlist.size} entries updated.` });
    setSelectedWaitlist(new Set());
    fetchData();
  };

  const handleExportWaitlistCSV = () => {
    const entriesToExport = selectedWaitlist.size > 0 
      ? waitlistEntries.filter(e => selectedWaitlist.has(e.id))
      : waitlistEntries;
    
    const headers = ["Name", "Email", "Use Case", "Profession", "Referral Source", "Notified", "Converted", "Joined"];
    const rows = entriesToExport.map(e => [
      e.full_name,
      e.email,
      `"${e.use_case.replace(/"/g, '""')}"`,
      e.profession || "",
      e.referral_source || "",
      e.notified ? "Yes" : "No",
      e.converted_to_user ? "Yes" : "No",
      new Date(e.created_at).toISOString()
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exported", description: `${entriesToExport.length} entries exported to CSV.` });
  };

  const handleSendInvites = async () => {
    if (selectedWaitlist.size === 0) {
      toast({ title: "No selection", description: "Select entries to send invites.", variant: "destructive" });
      return;
    }
    
    const entriesToInvite = waitlistEntries
      .filter(e => selectedWaitlist.has(e.id) && !e.notified)
      .map(e => ({ id: e.id, email: e.email, full_name: e.full_name }));
    
    if (entriesToInvite.length === 0) {
      toast({ title: "Already notified", description: "All selected entries have already been notified." });
      return;
    }
    
    setIsSendingInvites(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-waitlist-invite", {
        body: { entries: entriesToInvite }
      });
      
      if (error) throw error;
      
      toast({ 
        title: "Invites sent!", 
        description: `Successfully sent ${data.sent} invites${data.errors > 0 ? `, ${data.errors} failed` : ""}.`
      });
      setSelectedWaitlist(new Set());
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsSendingInvites(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to access this page.
            </p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />;
      case "sessions":
        return <SessionDetailView />;
      case "usage-logs":
        return <UsageLogsView />;
      case "users":
        return (
          <div className="space-y-6">
            {/* Admin Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Administrators
                </CardTitle>
                <CardDescription>
                  Manage admin access to this dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add admin */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
                  />
                  <Button onClick={handleAddAdmin}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
                
                {/* Admin list */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.filter(r => r.role === "admin").map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>{role.email}</TableCell>
                        <TableCell>
                          <Badge>Admin</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAdmin(role.id, role.email || "")}
                            disabled={role.email === user?.email}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* User List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users
                </CardTitle>
                <CardDescription>
                  Manage user tiers and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-mono text-sm">
                          {profile.email || "—"}
                        </TableCell>
                        <TableCell>{profile.display_name || "—"}</TableCell>
                        <TableCell>
                          {adjustingUser === profile.user_id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="+100 or -50"
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                                className="w-24 h-8 text-sm"
                              />
                              <Input
                                placeholder="Reason"
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                className="w-32 h-8 text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleAdjustCredits(profile.user_id)}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setAdjustingUser(null);
                                  setAdjustmentAmount("");
                                  setAdjustmentReason("");
                                }}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-mono">
                                {userCredits.get(profile.user_id) ?? 0}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => setAdjustingUser(profile.user_id)}
                              >
                                Adjust
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={profile.tier || "free"}
                            onValueChange={(value) => handleUpdateUserTier(profile.user_id, value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {testAccounts.some(t => t.email === profile.email) && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                              Test
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case "model-groups":
        return <ModelGroupsManager />;
      case "config":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Credit System Configuration
              </CardTitle>
              <CardDescription>
                Adjust credit values, bonuses, and rate limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditConfig.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-mono text-sm">
                        {config.key}
                      </TableCell>
                      <TableCell>
                        {editingConfig === config.id ? (
                          <Input
                            type="number"
                            value={configValue}
                            onChange={(e) => setConfigValue(e.target.value)}
                            className="w-32"
                            autoFocus
                          />
                        ) : (
                          <Badge variant="secondary">{config.value}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {config.description || "—"}
                      </TableCell>
                      <TableCell>
                        {editingConfig === config.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateConfig(config.id)}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingConfig(null)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingConfig(config.id);
                              setConfigValue(config.value.toString());
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      case "testers":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Register Test Account
                </CardTitle>
                <CardDescription>
                  Add email addresses that should be treated as test accounts for validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="test-email">Email</Label>
                    <Input
                      id="test-email"
                      placeholder="test@modelmix.app"
                      value={newTestEmail}
                      onChange={(e) => setNewTestEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-desc">Description</Label>
                    <Input
                      id="test-desc"
                      placeholder="Credit deduction test"
                      value={newTestDescription}
                      onChange={(e) => setNewTestDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-credits">Starting Credits</Label>
                    <Input
                      id="test-credits"
                      type="number"
                      value={newTestCredits}
                      onChange={(e) => setNewTestCredits(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateTestUser} disabled={isCreatingTestUser}>
                    {isCreatingTestUser ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Create Test User
                  </Button>
                  <Button variant="outline" onClick={handleAddTestAccount}>
                    Register Only
                  </Button>
                </div>
                
                {/* Password display after creation */}
                {createdTestUser && (
                  <div className="mt-4 p-4 border border-primary/50 rounded-lg bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Test user created: {createdTestUser.email}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreatedTestUser(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-background border rounded font-mono text-sm">
                        {createdTestUser.password}
                      </code>
                      <Button size="sm" onClick={handleCopyPassword}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" variant="default" onClick={() => handleSwitchIdentity(createdTestUser.email)}>
                        <LogIn className="h-4 w-4 mr-1" />
                        Impersonate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Save this password - it won't be shown again! Click "Impersonate" to log in as this user.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registered Test Accounts</CardTitle>
                <CardDescription>
                  Copy email to sign in as that user. Use "Forgot Password" if needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No test accounts registered yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      testAccounts.map((account) => {
                        const hasUserSignedUp = users.some(u => u.email === account.email);
                        const hasTesterRole = userRoles.some(r => 
                          r.email === account.email && r.role === "tester"
                        );
                        
                        return (
                          <TableRow key={account.id}>
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                {account.email}
                                {hasUserSignedUp && (
                                  <Badge variant="outline" className="text-xs">Signed Up</Badge>
                                )}
                                {hasTesterRole && (
                                  <Badge variant="secondary" className="text-xs">Tester Role</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {account.description || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{account.starting_credits}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(account.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSwitchIdentity(account.email)}
                                  title="Switch to this identity"
                                >
                                  <LogIn className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyEmail(account.email)}
                                  title="Copy email"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                {hasUserSignedUp && !hasTesterRole && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAddTester(account.email)}
                                    title="Grant tester role"
                                  >
                                    <FlaskConical className="h-4 w-4 text-yellow-500" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveTestAccount(account.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case "approvals":
        return <TesterApprovals />;
      case "waitlist":
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Waitlist Submissions
                  </CardTitle>
                  <CardDescription>
                    {waitlistEntries.length} people waiting for beta access
                    {selectedWaitlist.size > 0 && ` • ${selectedWaitlist.size} selected`}
                  </CardDescription>
                </div>
                
                {/* Bulk Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportWaitlistCSV}
                    disabled={waitlistEntries.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {selectedWaitlist.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAsNotified}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark Notified
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendInvites}
                        disabled={isSendingInvites}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSendingInvites ? "Sending..." : "Send Invites"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {waitlistEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No waitlist submissions yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedWaitlist.size === waitlistEntries.length && waitlistEntries.length > 0}
                          onCheckedChange={handleSelectAllWaitlist}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Use Case</TableHead>
                      <TableHead>Profession</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlistEntries.map((entry) => (
                      <TableRow key={entry.id} className={selectedWaitlist.has(entry.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedWaitlist.has(entry.id)}
                            onCheckedChange={() => handleToggleWaitlistSelection(entry.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entry.full_name}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.email);
                              toast({ title: "Email copied!" });
                            }}
                            className="text-left hover:text-primary transition-colors"
                          >
                            {entry.email}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={entry.use_case}>
                          {entry.use_case}
                        </TableCell>
                        <TableCell>{entry.profession || "-"}</TableCell>
                        <TableCell>{entry.referral_source || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {entry.converted_to_user ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Converted
                              </Badge>
                            ) : entry.notified ? (
                              <Badge variant="secondary">Notified</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      case "financials":
        return (
          <FinancialsTab 
            totalUsers={users.length}
            totalCreditsInCirculation={Array.from(userCredits.values()).reduce((a, b) => a + b, 0)}
          />
        );
      case "moderation":
        return <UserBansManager />;
      case "byok-telemetry":
        return <BYOKTelemetryDashboard />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Logo size="md" showText />
              </div>
              <div className="flex items-center gap-3">
                {/* Documentation Downloads */}
                <div className="hidden sm:flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => window.open('/docs/MODELMIX_TECHNICAL_DOCUMENTATION.md', '_blank')}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Tech Docs</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => window.open('/docs/USER_GUIDE.md', '_blank')}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">User Guide</span>
                  </Button>
                </div>
                {/* Identity verification badge */}
                <div className="text-right text-xs">
                  <span className="text-muted-foreground">Signed in as:</span>
                  <div className="font-mono text-foreground">{user?.email}</div>
                </div>
                {isCurrentUserTest && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    Test Account
                  </Badge>
                )}
                <Badge className="bg-primary text-primary-foreground">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <AdminBreadcrumb activeTab={activeTab} />
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
