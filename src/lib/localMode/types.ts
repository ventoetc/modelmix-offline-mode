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
