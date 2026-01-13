import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Key, Activity, Cpu, TrendingUp, RefreshCw, 
  BarChart3, Clock, Zap, Users
} from "lucide-react";
import { format, subDays, subHours } from "date-fns";

interface BYOKUsageRecord {
  id: string;
  action_type: string;
  session_id: string;
  fingerprint: string | null;
  created_at: string;
  metadata: {
    model_id?: string;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    latency?: number;
    context_id?: string;
    is_byok?: boolean;
  };
}

interface ModelStats {
  model_id: string;
  usage_count: number;
  total_tokens: number;
  avg_latency: number;
}

export default function BYOKTelemetryDashboard() {
  const [usageRecords, setUsageRecords] = useState<BYOKUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");

  const fetchBYOKUsage = async () => {
    setIsLoading(true);
    
    let startDate: Date;
    switch (timeRange) {
      case "1h":
        startDate = subHours(new Date(), 1);
        break;
      case "24h":
        startDate = subDays(new Date(), 1);
        break;
      case "7d":
        startDate = subDays(new Date(), 7);
        break;
      case "30d":
        startDate = subDays(new Date(), 30);
        break;
    }

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("action_type", "byok_usage")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Failed to fetch BYOK usage:", error);
    } else {
      setUsageRecords((data || []) as BYOKUsageRecord[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBYOKUsage();
  }, [timeRange]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalRequests = usageRecords.length;
    const totalTokens = usageRecords.reduce((sum, r) => 
      sum + (r.metadata?.total_tokens || 0), 0);
    const avgLatency = usageRecords.length > 0
      ? Math.round(usageRecords.reduce((sum, r) => 
          sum + (r.metadata?.latency || 0), 0) / usageRecords.length)
      : 0;
    const uniqueSessions = new Set(usageRecords.map(r => r.session_id)).size;

    return { totalRequests, totalTokens, avgLatency, uniqueSessions };
  }, [usageRecords]);

  // Calculate popular models
  const modelStats = useMemo(() => {
    const modelMap = new Map<string, { count: number; tokens: number; latency: number[] }>();
    
    for (const record of usageRecords) {
      const modelId = record.metadata?.model_id || "unknown";
      const existing = modelMap.get(modelId) || { count: 0, tokens: 0, latency: [] };
      
      modelMap.set(modelId, {
        count: existing.count + 1,
        tokens: existing.tokens + (record.metadata?.total_tokens || 0),
        latency: [...existing.latency, record.metadata?.latency || 0],
      });
    }

    const stats: ModelStats[] = [];
    for (const [model_id, data] of modelMap) {
      stats.push({
        model_id,
        usage_count: data.count,
        total_tokens: data.tokens,
        avg_latency: Math.round(data.latency.reduce((a, b) => a + b, 0) / data.latency.length),
      });
    }

    return stats.sort((a, b) => b.usage_count - a.usage_count).slice(0, 10);
  }, [usageRecords]);

  // Get recent activity for the table
  const recentActivity = useMemo(() => 
    usageRecords.slice(0, 20), 
  [usageRecords]);

  const formatModelName = (modelId: string) => {
    const parts = modelId.split("/");
    return parts.length > 1 ? parts[1] : modelId;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            BYOK Telemetry
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor Bring Your Own Key usage across all sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchBYOKUsage} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalRequests)}</div>
            <p className="text-xs text-muted-foreground mt-1">BYOK API calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tokens processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Unique Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Active BYOK users</p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Popular Models
          </CardTitle>
          <CardDescription>Most used models by BYOK users</CardDescription>
        </CardHeader>
        <CardContent>
          {modelStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No BYOK usage recorded in this time range</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modelStats.map((model, index) => (
                <div 
                  key={model.model_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? "bg-yellow-500/20 text-yellow-500" : 
                        index === 1 ? "bg-gray-400/20 text-gray-400" :
                        index === 2 ? "bg-orange-500/20 text-orange-500" : 
                        "bg-muted text-muted-foreground"}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{formatModelName(model.model_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(model.total_tokens)} tokens • {model.avg_latency}ms avg
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {model.usage_count}x
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest BYOK API calls</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Prompt</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(record.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {formatModelName(record.metadata?.model_id || "unknown")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatNumber(record.metadata?.prompt_tokens || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatNumber(record.metadata?.completion_tokens || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-medium">
                      {formatNumber(record.metadata?.total_tokens || 0)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {record.metadata?.latency ? `${record.metadata.latency}ms` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
