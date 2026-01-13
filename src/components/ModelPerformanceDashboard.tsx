import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle2, XCircle, RotateCcw, Trash2
} from "lucide-react";

interface ModelStats {
  success: number;
  failure: number;
}

interface ModelPerformanceDashboardProps {
  modelHealth: Record<string, ModelStats>;
  failedModels: Set<string>;
  onClearHealth: () => void;
  onClearFailed: () => void;
  onSwapRecommended?: (modelId: string) => void;
}

interface ModelPerformanceData {
  modelId: string;
  modelName: string;
  success: number;
  failure: number;
  total: number;
  reliability: number;
  status: "healthy" | "warning" | "critical" | "unknown";
}

const RELIABILITY_THRESHOLDS = {
  healthy: 80,
  warning: 50,
};

const ModelPerformanceDashboard = ({
  modelHealth,
  failedModels,
  onClearHealth,
  onClearFailed,
  onSwapRecommended,
}: ModelPerformanceDashboardProps) => {
  const performanceData: ModelPerformanceData[] = useMemo(() => {
    return Object.entries(modelHealth)
      .map(([modelId, stats]) => {
        const total = stats.success + stats.failure;
        const reliability = total > 0 ? Math.round((stats.success / total) * 100) : 0;
        
        let status: ModelPerformanceData["status"] = "unknown";
        if (total >= 2) {
          if (reliability >= RELIABILITY_THRESHOLDS.healthy) status = "healthy";
          else if (reliability >= RELIABILITY_THRESHOLDS.warning) status = "warning";
          else status = "critical";
        }
        
        return {
          modelId,
          modelName: modelId.split("/")[1] || modelId,
          success: stats.success,
          failure: stats.failure,
          total,
          reliability,
          status,
        };
      })
      .sort((a, b) => {
        // Sort by status severity first, then by total requests
        const statusOrder = { critical: 0, warning: 1, healthy: 2, unknown: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.total - a.total;
      });
  }, [modelHealth]);

  const recommendations = useMemo(() => {
    return performanceData.filter(
      model => model.status === "critical" && model.total >= 2
    );
  }, [performanceData]);

  const totalModels = performanceData.length;
  const healthyCount = performanceData.filter(m => m.status === "healthy").length;
  const warningCount = performanceData.filter(m => m.status === "warning").length;
  const criticalCount = performanceData.filter(m => m.status === "critical").length;

  const getStatusColor = (status: ModelPerformanceData["status"]) => {
    switch (status) {
      case "healthy": return "text-green-500";
      case "warning": return "text-yellow-500";
      case "critical": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: ModelPerformanceData["status"]) => {
    switch (status) {
      case "healthy": return <CheckCircle2 className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "critical": return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getProgressColor = (reliability: number) => {
    if (reliability >= 80) return "bg-green-500";
    if (reliability >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (totalModels === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No model stats yet</p>
        <p className="text-xs mt-1">Stats will appear after you start chatting</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-500/10 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-500">{healthyCount}</p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-yellow-500">{warningCount}</p>
          <p className="text-xs text-muted-foreground">Warning</p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-500">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
      </div>

      {/* Recommendations Banner */}
      {recommendations.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {recommendations.length} model{recommendations.length > 1 ? "s" : ""} need attention
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            These models have low reliability. Consider swapping them:
          </p>
          <div className="flex flex-wrap gap-1">
            {recommendations.slice(0, 3).map(model => (
              <Badge 
                key={model.modelId}
                variant="outline" 
                className="text-xs border-destructive/30 text-destructive"
              >
                {model.modelName} ({model.reliability}%)
              </Badge>
            ))}
            {recommendations.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{recommendations.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Model List */}
      <ScrollArea className="h-[200px]">
        <div className="space-y-2 pr-3">
          {performanceData.map(model => (
            <div 
              key={model.modelId}
              className={cn(
                "p-2 rounded-lg border",
                failedModels.has(model.modelId) && "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("shrink-0", getStatusColor(model.status))}>
                    {getStatusIcon(model.status)}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {model.modelName}
                  </span>
                  {failedModels.has(model.modelId) && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 shrink-0">
                      Failed
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-sm font-mono shrink-0",
                  getStatusColor(model.status)
                )}>
                  {model.reliability}%
                </span>
              </div>
              
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all", getProgressColor(model.reliability))}
                  style={{ width: `${model.reliability}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {model.success} ✓ / {model.failure} ✗ ({model.total} total)
                </span>
                {model.status === "critical" && onSwapRecommended && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-xs px-1.5 text-destructive hover:text-destructive"
                    onClick={() => onSwapRecommended(model.modelId)}
                  >
                    Swap
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {failedModels.size > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={onClearFailed}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Clear Failed ({failedModels.size})
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 text-xs text-muted-foreground"
          onClick={onClearHealth}
        >
          <Trash2 className="w-3 h-3 mr-1.5" />
          Reset Stats
        </Button>
      </div>
    </div>
  );
};

export default ModelPerformanceDashboard;
