import { Plus, Settings, MessageSquare, Menu, FilePlus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import ConversationHistory, { ConversationSummary } from "@/components/ConversationHistory";
import Logo from "@/components/Logo";

interface AppSidebarProps {
  conversations: ConversationSummary[];
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearHistory: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function AppSidebar({
  conversations,
  onLoadConversation,
  onDeleteConversation,
  onClearHistory,
  onNewChat,
  onOpenSettings,
}: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleLoad = (id: string) => {
    onLoadConversation(id);
    setOpenMobile(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex-shrink-0">
              <Logo className="h-8 w-8" />
            </div>
            <span className="font-bold truncate group-data-[collapsible=icon]:hidden">
              ModelMix
            </span>
          </div>
        </div>
        <Button 
          className="w-full justify-start mt-4 group-data-[collapsible=icon]:px-2" 
          onClick={handleNewChat}
        >
          <FilePlus className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0" />
          <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <ConversationHistory
              conversations={conversations}
              onLoad={handleLoad}
              onDelete={onDeleteConversation}
              onClearAll={onClearHistory}
              className="mt-2"
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg"
              onClick={onOpenSettings}
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
