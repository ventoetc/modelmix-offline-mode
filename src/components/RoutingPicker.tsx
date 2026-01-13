
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentIdentity } from "@/lib/localMode/types";

interface RoutingPickerProps {
  agents: AgentIdentity[];
  selectedAgentId?: string; // undefined means broadcast
  onSelect: (agentId?: string) => void;
  disabled?: boolean;
}

export function RoutingPicker({
  agents,
  selectedAgentId,
  onSelect,
  disabled
}: RoutingPickerProps) {
  return (
    <Select
      value={selectedAgentId || "broadcast"}
      onValueChange={(val) => onSelect(val === "broadcast" ? undefined : val)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Send to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="broadcast">Broadcast (All)</SelectItem>
        {agents.map(agent => (
          <SelectItem key={agent.agentId} value={agent.agentId}>
            {agent.personaTitle || agent.personaId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
