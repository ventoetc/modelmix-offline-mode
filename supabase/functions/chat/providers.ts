/**
 * AI Provider Abstraction Layer
 * Supports direct API access to major vendors + OpenRouter
 */

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamOptions {
  model: string;
  messages: Message[];
  stream: boolean;
  maxTokens?: number;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  headers?: Record<string, string>;
  transformRequest?: (body: any) => any;
  transformResponse?: (response: Response) => Response;
}

/**
 * Base provider interface
 */
export abstract class AIProvider {
  constructor(protected config: ProviderConfig) {}

  abstract getName(): string;
  abstract supportsModel(model: string): boolean;
  abstract normalizeModelName(model: string): string;

  async chat(options: StreamOptions): Promise<Response> {
    const body = this.buildRequestBody(options);
    const transformedBody = this.config.transformRequest
      ? this.config.transformRequest(body)
      : body;

    const response = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: JSON.stringify(transformedBody),
    });

    return this.config.transformResponse
      ? this.config.transformResponse(response)
      : response;
  }

  protected buildRequestBody(options: StreamOptions): any {
    return {
      model: this.normalizeModelName(options.model),
      messages: options.messages,
      stream: options.stream,
      ...(typeof options.maxTokens === "number" ? { max_tokens: options.maxTokens } : {}),
    };
  }
}

/**
 * OpenRouter Provider (unified access to 200+ models)
 */
export class OpenRouterProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        "HTTP-Referer": "https://modelmix.app",
        "X-Title": "ModelMix",
      },
    });
  }

  getName(): string {
    return "OpenRouter";
  }

  supportsModel(model: string): boolean {
    // OpenRouter supports any model in format "provider/model-name"
    return model.includes("/");
  }

  normalizeModelName(model: string): string {
    // OpenRouter expects format: "anthropic/claude-3-opus"
    return model;
  }
}

/**
 * OpenAI Provider (direct API)
 */
export class OpenAIProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "https://api.openai.com/v1/chat/completions",
    });
  }

  getName(): string {
    return "OpenAI";
  }

  supportsModel(model: string): boolean {
    const openaiModels = [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
      "o1",
      "o1-mini",
      "o3",
      "o3-mini",
    ];
    const modelName = this.normalizeModelName(model);
    return openaiModels.some((m) => modelName.startsWith(m));
  }

  normalizeModelName(model: string): string {
    // Strip "openai/" prefix if present
    return model.replace(/^openai\//, "");
  }
}

/**
 * Anthropic Provider (direct API)
 */
export class AnthropicProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "https://api.anthropic.com/v1/messages",
      headers: {
        "anthropic-version": "2023-06-01",
      },
      transformRequest: (body) => {
        // Anthropic uses different message format
        const { model, messages, stream, max_tokens } = body;

        // Separate system messages from user/assistant messages
        const systemMessages = messages.filter((m: Message) => m.role === "system");
        const conversationMessages = messages.filter((m: Message) => m.role !== "system");

        return {
          model,
          max_tokens: typeof max_tokens === "number" ? max_tokens : 4096,
          messages: conversationMessages,
          system: systemMessages.map((m: Message) => m.content).join("\n") || undefined,
          stream,
        };
      },
    });
  }

  getName(): string {
    return "Anthropic";
  }

  supportsModel(model: string): boolean {
    const anthropicModels = [
      "claude-3-opus",
      "claude-3-sonnet",
      "claude-3-haiku",
      "claude-3.5-sonnet",
      "claude-3.5-haiku",
      "claude-4",
      "claude-4.5",
    ];
    const modelName = this.normalizeModelName(model);
    return anthropicModels.some((m) => modelName.includes(m));
  }

  normalizeModelName(model: string): string {
    // Strip "anthropic/" prefix if present
    const normalized = model.replace(/^anthropic\//, "");

    // Anthropic expects format: "claude-3-opus-20240229"
    // If version date not provided, add latest known version
    if (normalized === "claude-3-opus") return "claude-3-opus-20240229";
    if (normalized === "claude-3-sonnet") return "claude-3-sonnet-20240229";
    if (normalized === "claude-3-haiku") return "claude-3-haiku-20240307";
    if (normalized === "claude-3.5-sonnet") return "claude-3-5-sonnet-20241022";
    if (normalized === "claude-3.5-haiku") return "claude-3-5-haiku-20241022";

    return normalized;
  }
}

/**
 * Google Gemini Provider (direct API)
 */
export class GoogleProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "", // Set dynamically per model
      transformRequest: (body) => {
        // Gemini uses different format
        const { messages, max_tokens } = body;

        const contents = messages
          .filter((m: Message) => m.role !== "system")
          .map((m: Message) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const systemInstruction = messages
          .filter((m: Message) => m.role === "system")
          .map((m: Message) => m.content)
          .join("\n");

        return {
          contents,
          systemInstruction: systemInstruction || undefined,
          generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: typeof max_tokens === "number" ? max_tokens : 8192,
          },
        };
      },
    });
  }

  getName(): string {
    return "Google";
  }

  supportsModel(model: string): boolean {
    const googleModels = [
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-pro",
    ];
    const modelName = this.normalizeModelName(model);
    return googleModels.some((m) => modelName.includes(m));
  }

  normalizeModelName(model: string): string {
    return model.replace(/^google\//, "");
  }

  override async chat(options: StreamOptions): Promise<Response> {
    const modelName = this.normalizeModelName(options.model);
    const streamParam = options.stream ? "streamGenerateContent" : "generateContent";

    // Build URL with API key
    this.config.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:${streamParam}?key=${this.config.apiKey}`;

    const body = this.buildRequestBody(options);
    const transformedBody = this.config.transformRequest!(body);

    const response = await fetch(this.config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transformedBody),
    });

    return response;
  }
}

/**
 * xAI/Grok Provider (direct API)
 */
export class XAIProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "https://api.x.ai/v1/chat/completions",
    });
  }

  getName(): string {
    return "xAI";
  }

  supportsModel(model: string): boolean {
    const xaiModels = ["grok", "grok-2"];
    const modelName = this.normalizeModelName(model);
    return xaiModels.some((m) => modelName.includes(m));
  }

  normalizeModelName(model: string): string {
    return model.replace(/^x-ai\//, "");
  }
}

/**
 * Mistral Provider (direct API)
 */
export class MistralProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "https://api.mistral.ai/v1/chat/completions",
    });
  }

  getName(): string {
    return "Mistral";
  }

  supportsModel(model: string): boolean {
    const mistralModels = [
      "mistral-large",
      "mistral-medium",
      "mistral-small",
      "codestral",
      "ministral",
    ];
    const modelName = this.normalizeModelName(model);
    return mistralModels.some((m) => modelName.includes(m));
  }

  normalizeModelName(model: string): string {
    return model.replace(/^mistralai\//, "");
  }
}

/**
 * DeepSeek Provider (direct API)
 */
export class DeepSeekProvider extends AIProvider {
  constructor(apiKey: string) {
    super({
      apiKey,
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
    });
  }

  getName(): string {
    return "DeepSeek";
  }

  supportsModel(model: string): boolean {
    const deepseekModels = ["deepseek-chat", "deepseek-coder", "deepseek-r1"];
    const modelName = this.normalizeModelName(model);
    return deepseekModels.some((m) => modelName.includes(m));
  }

  normalizeModelName(model: string): string {
    return model.replace(/^deepseek\//, "");
  }
}

/**
 * Provider Router - routes requests to appropriate provider
 */
export class ProviderRouter {
  private providers: AIProvider[] = [];
  private openRouterFallback?: OpenRouterProvider;

  constructor(config: {
    openaiKey?: string;
    anthropicKey?: string;
    googleKey?: string;
    xaiKey?: string;
    mistralKey?: string;
    deepseekKey?: string;
    openrouterKey?: string;
    useOpenRouterFallback?: boolean;
  }) {
    // Initialize direct providers
    if (config.openaiKey) {
      this.providers.push(new OpenAIProvider(config.openaiKey));
    }
    if (config.anthropicKey) {
      this.providers.push(new AnthropicProvider(config.anthropicKey));
    }
    if (config.googleKey) {
      this.providers.push(new GoogleProvider(config.googleKey));
    }
    if (config.xaiKey) {
      this.providers.push(new XAIProvider(config.xaiKey));
    }
    if (config.mistralKey) {
      this.providers.push(new MistralProvider(config.mistralKey));
    }
    if (config.deepseekKey) {
      this.providers.push(new DeepSeekProvider(config.deepseekKey));
    }

    // OpenRouter as fallback or primary
    if (config.openrouterKey) {
      const openRouter = new OpenRouterProvider(config.openrouterKey);
      if (config.useOpenRouterFallback) {
        this.openRouterFallback = openRouter;
      } else {
        // If not using as fallback, add as primary provider
        this.providers.push(openRouter);
      }
    }
  }

  /**
   * Route a chat request to the appropriate provider
   * @param options - Chat options
   * @param preferredProvider - Optional preferred provider for cheapest routing
   */
  async route(
    options: StreamOptions,
    preferredProvider?: string
  ): Promise<{ response: Response; provider: string }> {
    // If a preferred provider is specified (for cheapest routing), try it first
    if (preferredProvider) {
      const preferred = this.providers.find(
        (p) => p.getName().toLowerCase() === preferredProvider.toLowerCase()
      );

      if (preferred && preferred.supportsModel(options.model)) {
        console.log(`Using preferred provider ${preferred.getName()} for ${options.model} (cheapest)`);
        try {
          const response = await preferred.chat(options);
          return { response, provider: `${preferred.getName()} (cheapest)` };
        } catch (error) {
          console.error(`Preferred provider ${preferred.getName()} failed:`, error);
          // Continue to fallback logic
        }
      }
    }

    // Try to find a direct provider that supports this model
    for (const provider of this.providers) {
      if (provider.supportsModel(options.model)) {
        console.log(`Routing ${options.model} to ${provider.getName()}`);
        try {
          const response = await provider.chat(options);
          return { response, provider: provider.getName() };
        } catch (error) {
          console.error(`${provider.getName()} failed:`, error);
          // Continue to next provider or fallback
        }
      }
    }

    // Fall back to OpenRouter if configured
    if (this.openRouterFallback) {
      console.log(`Falling back to OpenRouter for ${options.model}`);
      const response = await this.openRouterFallback.chat(options);
      return { response, provider: "OpenRouter (fallback)" };
    }

    // No provider found
    throw new Error(
      `No API provider configured for model: ${options.model}. ` +
      `Please add the appropriate API key in your environment variables.`
    );
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    const providers = this.providers.map((p) => p.getName());
    if (this.openRouterFallback) {
      providers.push("OpenRouter (fallback)");
    }
    return providers;
  }
}
