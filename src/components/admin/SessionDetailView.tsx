import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Activity, RefreshCw, Search, User, FlaskConical, 
  Clock, MessageSquare, Zap, AlertTriangle, ChevronRight,
  Eye, Ban
} from "lucide-react";
import { format } from "date-fns";

interface SessionSummary {
  id: string;
  session_id: string;
  user_id: string | null;
  fingerprint: string | null;
  message_count: number;
  total_tokens: number;
  total_credits_spent: number;
  friction_count: number;
  dominant_intent: string | null;
  max_depth: string | null;
  upgrade_signal_score: number;
  started_at: string;
  last_activity_at: string;
}

interface SessionEvent {
  id: string;
  event_type: string;
  event_value: string | null;
  confidence: number;
  metadata: unknown;
  created_at: string;
}

interface UsageLog {
  id: string;
  model_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_cents: number;
  is_tester_session: boolean;
  created_at: string;
}

export default function SessionDetailView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionUsage, setSessionUsage] = useState<UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("shadow_sessions")
        .select("*")
        .order("last_activity_at", { ascending: false })
        .limit(50);

      if (searchQuery.trim()) {
        query = query.or(`session_id.ilike.%${searchQuery}%,fingerprint.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast({
        title: "Error loading sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    try {
      // Fetch events for this session
      const { data: events } = await supabase
        .from("shadow_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      setSessionEvents(events || []);

      // Fetch usage logs for this session (context_id matches session_id pattern)
      const { data: usage } = await supabase
        .from("usage_logs")
        .select("*")
        .ilike("context_id", `%${sessionId.slice(0, 20)}%`)
        .order("created_at", { ascending: true });

      setSessionUsage(usage || []);
    } catch (error) {
      console.error("Failed to fetch session details:", error);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionDetails(selectedSession.session_id);
    }
  }, [selectedSession, fetchSessionDetails]);

  const handleSelectSession = (session: SessionSummary) => {
    setSelectedSession(session);
  };

  const handleBanSession = async (session: SessionSummary) => {
    const target = session.user_id || session.fingerprint;
    if (!target) {
      toast({ title: "No identifiable target", variant: "destructive" });
      return;
    }

    try {
      await supabase.from("user_bans").insert({
        user_id: session.user_id,
        fingerprint: session.fingerprint,
        reason: `Banned from session review: ${session.session_id}`,
        severity: "temporary",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      toast({ title: "24-hour ban created" });
    } catch (error) {
      toast({ title: "Failed to create ban", variant: "destructive" });
    }
  };

  const getIntentColor = (intent: string | null) => {
    switch (intent) {
      case "exploring": return "bg-blue-500/20 text-blue-400";
      case "comparing": return "bg-purple-500/20 text-purple-400";
      case "learning": return "bg-green-500/20 text-green-400";
      case "creating": return "bg-orange-500/20 text-orange-400";
      case "debugging": return "bg-red-500/20 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("click")) return "🖱️";
    if (eventType.includes("model")) return "🤖";
    if (eventType.includes("navigation")) return "🧭";
    if (eventType.includes("copy")) return "📋";
    if (eventType.includes("friction")) return "⚠️";
    if (eventType.includes("consent")) return "✅";
    return "📌";
  };

  return (
    <div className="space-y-6">
      {/* Search & Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by session ID or fingerprint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSessions()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchSessions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sessions ({sessions.length})
            </CardTitle>
            <CardDescription>Click a session to view details</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedSession?.id === session.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                  onClick={() => handleSelectSession(session)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {session.session_id.slice(0, 16)}...
                    </code>
                    {session.user_id ? (
                      <Badge variant="secondary" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        Auth
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Anon
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {session.message_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {session.total_tokens?.toLocaleString() || 0}
                    </span>
                    {session.friction_count > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <AlertTriangle className="h-3 w-3" />
                        {session.friction_count}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    {session.dominant_intent && (
                      <Badge className={getIntentColor(session.dominant_intent)}>
                        {session.dominant_intent}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(session.last_activity_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && !isLoading && (
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions found</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Session Details
                </CardTitle>
                <CardDescription>
                  {selectedSession 
                    ? `Viewing ${selectedSession.session_id.slice(0, 20)}...`
                    : "Select a session to view details"
                  }
                </CardDescription>
              </div>
              {selectedSession && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBanSession(selectedSession)}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedSession ? (
              <div className="space-y-6">
                {/* Session Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Messages</p>
                    <p className="text-xl font-bold">{selectedSession.message_count}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Tokens</p>
                    <p className="text-xl font-bold">{selectedSession.total_tokens?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Credits Spent</p>
                    <p className="text-xl font-bold">{selectedSession.total_credits_spent || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Upgrade Score</p>
                    <p className="text-xl font-bold">{selectedSession.upgrade_signal_score?.toFixed(1) || 0}</p>
                  </div>
                </div>

                {/* Identifiers */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Identifiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/30 font-mono text-xs break-all">
                      <span className="text-muted-foreground">Session: </span>
                      {selectedSession.session_id}
                    </div>
                    {selectedSession.fingerprint && (
                      <div className="p-2 rounded bg-muted/30 font-mono text-xs break-all">
                        <span className="text-muted-foreground">Fingerprint: </span>
                        {selectedSession.fingerprint}
                      </div>
                    )}
                    {selectedSession.user_id && (
                      <div className="p-2 rounded bg-muted/30 font-mono text-xs break-all">
                        <span className="text-muted-foreground">User ID: </span>
                        {selectedSession.user_id}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Usage Logs */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Usage Logs ({sessionUsage.length})
                  </h4>
                  {sessionUsage.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionUsage.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              {log.model_id?.split("/").pop() || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {(log.prompt_tokens + log.completion_tokens).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={log.is_tester_session ? "outline" : "default"}>
                                {log.is_tester_session ? "$0" : `${log.cost_cents}¢`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "HH:mm:ss")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No usage logs for this session</p>
                  )}
                </div>

                <Separator />

                {/* Event Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Event Timeline ({sessionEvents.length})
                  </h4>
                  <ScrollArea className="h-[200px]">
                    {sessionEvents.length > 0 ? (
                      <div className="space-y-2">
                        {sessionEvents.map((event) => (
                          <div 
                            key={event.id} 
                            className="flex items-center gap-3 p-2 rounded bg-muted/30 text-sm"
                          >
                            <span className="text-lg">{getEventIcon(event.event_type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{event.event_type}</p>
                              {event.event_value && (
                                <p className="text-xs text-muted-foreground truncate">{event.event_value}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(event.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No events recorded</p>
                    )}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Eye className="h-12 w-12 mb-4 opacity-50" />
                <p>Select a session from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
