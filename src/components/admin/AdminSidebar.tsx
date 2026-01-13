import { cn } from "@/lib/utils";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  ScrollText,
  Users,
  Settings,
  FlaskConical,
  ClipboardList,
  DollarSign,
  ChevronRight,
  Shield,
  Activity,
  Key,
  UserCheck,
  Layers,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  {
    group: "Insights",
    items: [
      { id: "dashboard", label: "Overview", icon: BarChart3 },
      { id: "sessions", label: "Sessions", icon: Activity },
      { id: "usage-logs", label: "Usage Logs", icon: ScrollText },
      { id: "byok-telemetry", label: "BYOK Telemetry", icon: Key },
    ],
  },
  {
    group: "Management",
    items: [
      { id: "users", label: "Users & Roles", icon: Users },
      { id: "testers", label: "Test Accounts", icon: FlaskConical },
      { id: "approvals", label: "Tester Approvals", icon: UserCheck },
      { id: "waitlist", label: "Waitlist", icon: ClipboardList },
      { id: "moderation", label: "Moderation", icon: Shield },
    ],
  },
  {
    group: "Configuration",
    items: [
      { id: "model-groups", label: "Model Groups", icon: Layers },
      { id: "config", label: "Credit Config", icon: Settings },
      { id: "financials", label: "Financials", icon: DollarSign },
    ],
  },
];

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <Sidebar className="border-r border-border bg-card/50">
      <SidebarContent className="pt-4">
        {menuItems.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 mb-2">
              {group.group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
