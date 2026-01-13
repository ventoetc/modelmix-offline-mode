import { normalizeBaseUrl, isLocalhostUrl } from "./config";
import { generateUUID } from "@/lib/utils";
import type { LocalAgent, LocalAgentConfig, LocalMessage, LocalProvider, LocalSendResult } from "./types";

type LocalProviderOptions = {
  baseUrl: string;
  model: string;
  allowRemote?: boolean;
};

const createAgentId = () => {
  return generateUUID();
};

export class LocalOpenAICompatibleProvider implements LocalProvider {
  private baseUrl: string;
  private model: string;
  private modelResolvePromise: Promise<string | null> | null = null;

  constructor(options: LocalProviderOptions) {
    const normalized = normalizeBaseUrl(options.baseUrl);
    const allowRemote = options.allowRemote ?? false;

    if (!allowRemote && !isLocalhostUrl(normalized)) {
      throw new Error("Local mode is restricted to localhost URLs.");
    }

    this.baseUrl = normalized;
    this.model = options.model;
  }

  createAgent(config: LocalAgentConfig): LocalAgent {
    return {
      agent_id: createAgentId(),
      alias: config.alias || "Local Agent",
      system_prompt: config.systemPrompt || "",
      history: [],
      params: config.params || {},
      model: config.model || this.model,
    };
  }

  private async resolveModelId(): Promise<string | null> {
    if (this.model && this.model !== "local-model") return this.model;
    if (this.modelResolvePromise) return this.modelResolvePromise;

    this.modelResolvePromise = (async () => {
      try {
        let response = await fetch(`${this.baseUrl}/v1/models`);
        if (!response.ok) response = await fetch(`${this.baseUrl}/models`);
        if (!response.ok) return null;

        const data = await response.json();
        const nextId: unknown =
          data?.data?.[0]?.id ||
          data?.models?.[0]?.model ||
          data?.models?.[0]?.name ||
          null;

        if (!nextId || typeof nextId !== "string") return null;
        this.model = nextId;
        return nextId;
      } catch {
        return null;
      } finally {
        this.modelResolvePromise = null;
      }
    })();

    return this.modelResolvePromise;
  }

  async send(agent: LocalAgent, messages: LocalMessage[]): Promise<LocalSendResult> {
    const payloadMessages: LocalMessage[] = [];

    if (agent.system_prompt.trim()) {
      payloadMessages.push({ role: "system", content: agent.system_prompt });
    }

    payloadMessages.push(...agent.history, ...messages);

    let modelToUse = agent.model || this.model;
    if (modelToUse === "local-model") {
      const resolved = await this.resolveModelId();
      if (resolved) modelToUse = resolved;
    }

    if (!modelToUse || modelToUse === "local-model") {
      throw new Error("No local models found. Load a model in LM Studio, then retry.");
    }

    if (agent.model !== modelToUse) {
      agent.model = modelToUse;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: payloadMessages,
        stream: false,
        ...agent.params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed.error?.message || parsed.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    agent.history = [...agent.history, ...messages, { role: "assistant", content }];

    return {
      agent_id: agent.agent_id,
      content,
      usage: data.usage,
      raw: data,
    };
  }

  reset(agent: LocalAgent) {
    agent.history = [];
  }

  delete(agent: LocalAgent) {
    agent.history = [];
  }
}
