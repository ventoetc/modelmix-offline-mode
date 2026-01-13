import { ChevronRight } from "lucide-react";

interface AdminBreadcrumbProps {
  activeTab: string;
}

const tabLabels: Record<string, { group: string; label: string }> = {
  dashboard: { group: "Insights", label: "Overview" },
  sessions: { group: "Insights", label: "Sessions" },
  "usage-logs": { group: "Insights", label: "Usage Logs" },
  "byok-telemetry": { group: "Insights", label: "BYOK Telemetry" },
  users: { group: "Management", label: "Users & Roles" },
  testers: { group: "Management", label: "Test Accounts" },
  approvals: { group: "Management", label: "Tester Approvals" },
  waitlist: { group: "Management", label: "Waitlist" },
  moderation: { group: "Management", label: "Moderation" },
  "model-groups": { group: "Configuration", label: "Model Groups" },
  config: { group: "Configuration", label: "Credit Config" },
  financials: { group: "Configuration", label: "Financials" },
};

export default function AdminBreadcrumb({ activeTab }: AdminBreadcrumbProps) {
  const tabInfo = tabLabels[activeTab] || { group: "Admin", label: "Dashboard" };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <span className="font-medium text-foreground">Admin</span>
      <ChevronRight className="h-4 w-4" />
      <span>{tabInfo.group}</span>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground">{tabInfo.label}</span>
    </div>
  );
}
