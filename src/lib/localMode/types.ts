
export type LocalContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type LocalMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | LocalContentPart[];
};

export type LocalSamplingParams = {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  seed?: number;
  stop?: string | string[];
};

export type LocalAgentConfig = {
  alias?: string;
  systemPrompt?: string;
  params?: LocalSamplingParams;
  model?: string;
};

export type LocalAgent = {
  agent_id: string;
  alias: string;
  system_prompt: string;
  history: LocalMessage[];
  params: LocalSamplingParams;
  model: string;
};

export type LocalSendResult = {
  agent_id: string;
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  raw: unknown;
};

export interface LocalProvider {
  createAgent: (config: LocalAgentConfig) => LocalAgent;
  send: (agent: LocalAgent, messages: LocalMessage[]) => Promise<LocalSendResult>;
  reset: (agent: LocalAgent) => void;
  delete: (agent: LocalAgent) => void;
}

// --- Deliberation Mode Types ---

export type AgentIdentity = {
  agentId: string;      // internal stable id
  personaId: string;    // short label: "Planner"
  personaTitle?: string; // optional: "Architect Planner"
  modelId: string;      // "qwen2.5-32b"
  provider: string;     // "lmstudio"
};

export type ChatMessage = {
  id: string;
  deliberationId?: string;
  sessionId: string;
  role: "user" | "agent" | "system";
  visibility: "broadcast" | "private";
  toAgentId?: string;   // only for private
  fromAgentId?: string; // for agent messages
  personaId?: string;   // denormalized for rendering speed
  content: string;
  createdAt: number;
  meta?: {
    modelId?: string;
    provider?: string;
    round?: number;
  };
};

export type DeliberationStatus = "idle" | "running" | "paused" | "completed" | "stopped";

export type AgentConfig = AgentIdentity & {
  systemPrompt?: string;
  params?: LocalSamplingParams;
};

export type Round = {
  roundNumber: number;
  messages: ChatMessage[];
  status: "active" | "completed";
  summary?: string;
};

export type ConsensusResult = {
  content: string;
  confidence?: number;
  reachedAt: number;
};

export type Deliberation = {
  id: string;
  sessionId: string;
  task: string;
  agents: AgentConfig[];
  maxRounds: number;
  currentRound: number;
  status: DeliberationStatus;
  rounds: Round[];
  consensus?: ConsensusResult;
  createdAt: number;
};
