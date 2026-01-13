export interface ChatResponse {
  id: string;
  model: string;
  modelName: string;
  personaName?: string;
  prompt: string;
  response: string;
  timestamp: string;
  tokenCount?: number;
  tokenDelta?: number;
  cumulativeTokens?: number;
  latency?: number;
  hasAttachment?: boolean;
  isError?: boolean;
  roundIndex?: number; // Track which round this response belongs to
  agentId?: string;
  slotId?: string; // Track which slot this response belongs to
  visibility?: "public" | "mentioned";
  visibleToModelIds?: string[];
}
