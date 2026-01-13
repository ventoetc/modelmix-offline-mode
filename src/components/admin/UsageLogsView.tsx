import { useState, useEffect, useCallback } from "react";
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
import { ScrollText, RefreshCw, Filter, User, FlaskConical } from "lucide-react";

interface UsageLog {
  id: string;
  context_id: string;
  user_id: string | null;
  is_tester_session: boolean;
  model_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_cents: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

type FilterType = "all" | "users" | "testers";

export default function UsageLogsView() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (filter === "users") {
      query = query.eq("is_tester_session", false);
    } else if (filter === "testers") {
      query = query.eq("is_tester_session", true);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Failed to fetch usage logs:", error);
    } else {
      setLogs(data as UsageLog[]);
    }
    
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalTokens = logs.reduce((acc, log) => acc + log.prompt_tokens + log.completion_tokens, 0);
  const totalCost = logs.reduce((acc, log) => acc + log.cost_cents, 0);
  const testerCount = logs.filter(l => l.is_tester_session).length;
  const userCount = logs.filter(l => !l.is_tester_session).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Tokens</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{userCount}</div>
            <div className="text-xs text-muted-foreground">Real User Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{testerCount}</div>
            <div className="text-xs text-muted-foreground">Tester Requests</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Usage Logs
              </CardTitle>
              <CardDescription>
                Token usage and cost tracking per request
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Logs</SelectItem>
                  <SelectItem value="users">Real Users Only</SelectItem>
                  <SelectItem value="testers">Testers Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchLogs} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No usage logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session Type</TableHead>
                    <TableHead>Context ID</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Prompt</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.is_tester_session ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-500 gap-1">
                            <FlaskConical className="h-3 w-3" />
                            Tester
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <User className="h-3 w-3" />
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.context_id.slice(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {log.model_id?.split("/").pop() || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {log.prompt_tokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {log.completion_tokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {(log.prompt_tokens + log.completion_tokens).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={log.is_tester_session ? "outline" : "default"}>
                          {log.is_tester_session ? "$0" : `${log.cost_cents}¢`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
