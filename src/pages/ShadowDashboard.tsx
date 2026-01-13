import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ArrowLeft, Brain, TrendingUp, Users, Zap, 
  Activity, Eye, RefreshCw, AlertTriangle, Clock,
  MessageSquare, Coins, Target, Sparkles, Filter
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow, subHours, subDays } from "date-fns";

interface ShadowSession {
  id: string;
  session_id: string;
  dominant_intent: string | null;
  max_depth: string | null;
  friction_count: number | null;
  clarity_moments: number | null;
  message_count: number | null;
  total_tokens: number | null;
  total_credits_spent: number | null;
  upgrade_signal_score: number | null;
  upgrade_triggered: boolean | null;
  started_at: string;
  last_activity_at: string;
}

interface ShadowEvent {
  id: string;
  session_id: string;
  event_type: string;
  event_value: string | null;
  confidence: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface AggregateStats {
  totalSessions: number;
  totalEvents: number;
  avgDepth: string;
  avgClarityMoments: number;
  avgFriction: number;
  avgUpgradeScore: number;
  avgMessagesPerSession: number;
  avgTokensPerSession: number;
  intentDistribution: Record<string, number>;
  depthDistribution: Record<string, number>;
  eventTypeDistribution: Record<string, number>;
  hourlyActivity: { hour: string; sessions: number; events: number }[];
  upgradeTriggered: number;
}

const DEPTH_COLORS: Record<string, string> = {
  surface: "hsl(var(--muted-foreground))",
  structured: "hsl(210 80% 60%)",
  multi_step: "hsl(270 60% 60%)",
  recursive: "hsl(30 80% 55%)",
  meta: "hsl(0 70% 55%)",
};

const INTENT_LABELS: Record<string, string> = {
  exploration: "🔍 Explore",
  decision: "⚖️ Decide",
  reflection: "💭 Reflect",
  creative: "🎨 Create",
  problem_solving: "🔧 Solve",
  meta_reasoning: "🧠 Meta",
};

const PIE_COLORS = [
  "hsl(210 80% 60%)",
  "hsl(150 60% 50%)",
  "hsl(270 60% 60%)",
  "hsl(30 80% 55%)",
  "hsl(0 70% 55%)",
  "hsl(180 60% 50%)",
];

const EVENT_CATEGORIES: Record<string, { label: string; color: string }> = {
  intent: { label: "Intent", color: "hsl(210 80% 60%)" },
  depth: { label: "Depth", color: "hsl(270 60% 60%)" },
  friction: { label: "Friction", color: "hsl(0 70% 55%)" },
  outcome: { label: "Outcome", color: "hsl(150 60% 50%)" },
  action: { label: "Action", color: "hsl(30 80% 55%)" },
  feedback: { label: "Feedback", color: "hsl(180 60% 50%)" },
};

export default function ShadowDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ShadowSession[]>([]);
  const [events, setEvents] = useState<ShadowEvent[]>([]);
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  const getTimeFilter = useCallback(() => {
    switch (timeRange) {
      case "24h": return subHours(new Date(), 24).toISOString();
      case "7d": return subDays(new Date(), 7).toISOString();
      case "30d": return subDays(new Date(), 30).toISOString();
    }
  }, [timeRange]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const timeFilter = getTimeFilter();
      
      // Fetch sessions and events in parallel
      const [sessionsResult, eventsResult] = await Promise.all([
        supabase
          .from("shadow_sessions")
          .select("*")
          .gte("started_at", timeFilter)
          .order("last_activity_at", { ascending: false })
          .limit(100),
        supabase
          .from("shadow_events")
          .select("*")
          .gte("created_at", timeFilter)
          .order("created_at", { ascending: false })
          .limit(500)
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const sessionsData = (sessionsResult.data || []) as ShadowSession[];
      const eventsData = (eventsResult.data || []) as ShadowEvent[];
      
      setSessions(sessionsData);
      setEvents(eventsData);

      // Calculate aggregates
      const depthOrder = ["surface", "structured", "multi_step", "recursive", "meta"];
      const intentDist: Record<string, number> = {};
      const depthDist: Record<string, number> = {};
      const eventTypeDist: Record<string, number> = {};
      const hourlyMap: Record<string, { sessions: Set<string>; events: number }> = {};
      
      let totalClarityMoments = 0;
      let totalFriction = 0;
      let totalUpgradeScore = 0;
      let totalMessages = 0;
      let totalTokens = 0;
      let upgradeTriggeredCount = 0;
      let maxDepthIndex = 0;

      for (const s of sessionsData) {
        // Intent distribution
        const intent = s.dominant_intent || "exploration";
        intentDist[intent] = (intentDist[intent] || 0) + 1;

        // Depth distribution
        const depth = s.max_depth || "surface";
        depthDist[depth] = (depthDist[depth] || 0) + 1;
        const depthIdx = depthOrder.indexOf(depth);
        if (depthIdx > maxDepthIndex) maxDepthIndex = depthIdx;

        // Aggregates
        totalClarityMoments += s.clarity_moments || 0;
        totalFriction += s.friction_count || 0;
        totalUpgradeScore += s.upgrade_signal_score || 0;
        totalMessages += s.message_count || 0;
        totalTokens += s.total_tokens || 0;
        if (s.upgrade_triggered) upgradeTriggeredCount++;

        // Hourly activity
        const hour = format(new Date(s.started_at), "HH:00");
        if (!hourlyMap[hour]) {
          hourlyMap[hour] = { sessions: new Set(), events: 0 };
        }
        hourlyMap[hour].sessions.add(s.session_id);
      }

      // Event distribution
      for (const e of eventsData) {
        const category = e.event_type.split("_")[0];
        eventTypeDist[category] = (eventTypeDist[category] || 0) + 1;
        
        const hour = format(new Date(e.created_at), "HH:00");
        if (!hourlyMap[hour]) {
          hourlyMap[hour] = { sessions: new Set(), events: 0 };
        }
        hourlyMap[hour].events++;
      }

      // Convert hourly map to array
      const hourlyActivity = Object.entries(hourlyMap)
        .map(([hour, data]) => ({
          hour,
          sessions: data.sessions.size,
          events: data.events
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      const sessionCount = sessionsData.length || 1;
      setStats({
        totalSessions: sessionsData.length,
        totalEvents: eventsData.length,
        avgDepth: depthOrder[Math.floor(maxDepthIndex / sessionCount)] || "surface",
        avgClarityMoments: totalClarityMoments / sessionCount,
        avgFriction: totalFriction / sessionCount,
        avgUpgradeScore: totalUpgradeScore / sessionCount,
        avgMessagesPerSession: totalMessages / sessionCount,
        avgTokensPerSession: totalTokens / sessionCount,
        intentDistribution: intentDist,
        depthDistribution: depthDist,
        eventTypeDistribution: eventTypeDist,
        hourlyActivity,
        upgradeTriggered: upgradeTriggeredCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [getTimeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              Sign in with an admin account to view cognitive telemetry.
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const intentPieData = Object.entries(stats?.intentDistribution || {}).map(([name, value]) => ({
    name: INTENT_LABELS[name] || name,
    value
  }));

  const depthBarData = ["surface", "structured", "multi_step", "recursive", "meta"].map(depth => ({
    name: depth.replace("_", " "),
    count: stats?.depthDistribution[depth] || 0,
    fill: DEPTH_COLORS[depth]
  }));

  const eventCategoryData = Object.entries(stats?.eventTypeDistribution || {}).map(([category, count]) => ({
    category: EVENT_CATEGORIES[category]?.label || category,
    count,
    fill: EVENT_CATEGORIES[category]?.color || "hsl(var(--muted-foreground))"
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="md" showText />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              <Eye className="h-3 w-3 mr-1" />
              Shadow Analytics
            </Badge>
            
            {/* Time range filter */}
            <div className="flex border rounded-lg overflow-hidden">
              {(["24h", "7d", "30d"] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none px-3 h-8"
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
            
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            icon={<Users className="h-5 w-5 text-primary" />}
            value={stats?.totalSessions || 0}
            label="Sessions"
          />
          <MetricCard
            icon={<Activity className="h-5 w-5 text-blue-500" />}
            value={stats?.totalEvents || 0}
            label="Events"
          />
          <MetricCard
            icon={<MessageSquare className="h-5 w-5 text-green-500" />}
            value={stats?.avgMessagesPerSession.toFixed(1) || "0"}
            label="Msgs/Session"
          />
          <MetricCard
            icon={<Brain className="h-5 w-5 text-purple-500" />}
            value={stats?.avgClarityMoments.toFixed(1) || "0"}
            label="Clarity"
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
            value={stats?.avgFriction.toFixed(1) || "0"}
            label="Friction"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
            value={`${stats?.avgUpgradeScore.toFixed(0) || 0}%`}
            label="Upgrade Score"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tokens/Session</p>
                <p className="text-lg font-semibold">{(stats?.avgTokensPerSession || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <Coins className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Peak Depth</p>
                <p className="text-lg font-semibold capitalize">{stats?.avgDepth?.replace("_", " ") || "—"}</p>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Upgrades Triggered</p>
                <p className="text-lg font-semibold">{stats?.upgradeTriggered || 0}</p>
              </div>
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-lg font-semibold">
                  {stats && stats.totalSessions > 0 
                    ? `${((stats.upgradeTriggered / stats.totalSessions) * 100).toFixed(1)}%`
                    : "—"
                  }
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Hourly Activity Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.hourlyActivity || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="sessions" 
                        stackId="1" 
                        stroke="hsl(210 80% 60%)" 
                        fill="hsl(210 80% 60% / 0.3)" 
                        name="Sessions"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="events" 
                        stackId="2" 
                        stroke="hsl(150 60% 50%)" 
                        fill="hsl(150 60% 50% / 0.3)" 
                        name="Events"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Intent Distribution Pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Intent Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={intentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {intentPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cognitive Depth Bar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Cognitive Depth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={depthBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {depthBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Types */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Event Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {eventCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>
                  Cognitive patterns observed across sessions (no personal data stored)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead>Depth</TableHead>
                        <TableHead className="text-center">Msgs</TableHead>
                        <TableHead className="text-center">Clarity</TableHead>
                        <TableHead className="text-center">Friction</TableHead>
                        <TableHead className="text-center">Upgrade</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {session.session_id.slice(0, 8)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {INTENT_LABELS[session.dominant_intent || ""] || session.dominant_intent || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              style={{ backgroundColor: DEPTH_COLORS[session.max_depth || "surface"] }}
                              className="text-white text-xs"
                            >
                              {session.max_depth?.replace("_", " ") || "surface"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{session.message_count || 0}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-600 dark:text-green-400">{session.clarity_moments || 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-yellow-600 dark:text-yellow-400">{session.friction_count || 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2">
                              <Progress value={session.upgrade_signal_score || 0} className="w-12 h-2" />
                              <span className="text-xs text-muted-foreground">{session.upgrade_signal_score || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {sessions.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                      No sessions recorded in this time period.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Event Stream</CardTitle>
                <CardDescription>
                  Raw behavioral signals captured from user interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {events.slice(0, 100).map((event) => {
                    const category = event.event_type.split("_")[0];
                    const categoryInfo = EVENT_CATEGORIES[category] || { label: category, color: "hsl(var(--muted-foreground))" };
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div 
                          className="w-2 h-2 rounded-full mt-2 shrink-0"
                          style={{ backgroundColor: categoryInfo.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {event.event_type.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), "HH:mm:ss")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              conf: {(event.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          {event.event_value && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {event.event_value}
                            </p>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground shrink-0">
                          {event.session_id.slice(0, 6)}
                        </code>
                      </div>
                    );
                  })}
                  
                  {events.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                      No events recorded in this time period.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Intent Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Intent Distribution
                  </CardTitle>
                  <CardDescription>What users are trying to accomplish</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats?.intentDistribution || {})
                      .sort(([, a], [, b]) => b - a)
                      .map(([intent, count]) => (
                        <div key={intent} className="flex items-center gap-3">
                          <span className="w-24 text-sm">
                            {INTENT_LABELS[intent] || intent}
                          </span>
                          <Progress 
                            value={(count / (stats?.totalSessions || 1)) * 100} 
                            className="flex-1 h-3" 
                          />
                          <span className="text-sm font-mono w-8 text-right">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Depth Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Cognitive Depth
                  </CardTitle>
                  <CardDescription>How deeply users engage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["surface", "structured", "multi_step", "recursive", "meta"].map((depth) => {
                      const count = stats?.depthDistribution[depth] || 0;
                      return (
                        <div key={depth} className="flex items-center gap-3">
                          <Badge 
                            className="w-24 justify-center text-white"
                            style={{ backgroundColor: DEPTH_COLORS[depth] }}
                          >
                            {depth.replace("_", " ")}
                          </Badge>
                          <Progress 
                            value={(count / (stats?.totalSessions || 1)) * 100} 
                            className="flex-1 h-3" 
                          />
                          <span className="text-sm font-mono w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insight Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <InsightCard
                title="Clarity Signal"
                value={stats?.avgClarityMoments || 0}
                threshold={1.5}
                positive="High clarity rate detected. Users are getting value. Strong conversion signal."
                negative="Low clarity rate. Consider improving response quality or prompt suggestions."
              />
              <InsightCard
                title="Friction Signal"
                value={stats?.avgFriction || 0}
                threshold={2}
                positive="Elevated friction detected. Users are rephrasing frequently. Improve UX before pushing upgrades."
                negative="Low friction. Users are navigating smoothly through the experience."
                invert
              />
            </div>

            {/* Key Insight */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Strategic Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {stats && stats.avgClarityMoments > 1.5 && stats.avgFriction < 2 ? (
                    <>
                      <strong>Optimal conditions for conversion.</strong> High clarity with low friction
                      indicates users are getting value smoothly. Surface upgrade prompts when clarity
                      moments exceed 2 per session for maximum conversion.
                    </>
                  ) : stats && stats.avgFriction > 2 ? (
                    <>
                      <strong>Focus on UX improvements.</strong> Elevated friction suggests users are
                      struggling. Prioritize: better prompt suggestions, clearer response structure,
                      and improved error handling before optimizing for upgrades.
                    </>
                  ) : stats && stats.upgradeTriggered > 0 ? (
                    <>
                      <strong>Conversion funnel active.</strong> {stats.upgradeTriggered} upgrade triggers
                      detected. Monitor conversion rate and A/B test trigger timing for optimization.
                    </>
                  ) : (
                    <>
                      <strong>Gathering baseline data.</strong> Continue collecting patterns to identify
                      optimal upgrade timing and user behavior signals.
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Helper Components
function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function InsightCard({ 
  title, 
  value, 
  threshold, 
  positive, 
  negative, 
  invert = false 
}: { 
  title: string; 
  value: number; 
  threshold: number; 
  positive: string; 
  negative: string;
  invert?: boolean;
}) {
  const isTriggered = invert ? value > threshold : value > threshold;
  
  return (
    <Card className={isTriggered ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-bold">{value.toFixed(1)}</span>
          <Badge variant={isTriggered ? "secondary" : "default"}>
            {isTriggered ? (invert ? "High" : "Good") : (invert ? "Low" : "Low")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isTriggered ? positive : negative}
        </p>
      </CardContent>
    </Card>
  );
}
