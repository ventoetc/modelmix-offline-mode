export type ExecutionMode = "cloud" | "local";

export type LocalModeConfig = {
  enabled: boolean;
  isValid: boolean;
  error?: string;
  baseUrl: string;
  model: string;
  modelLabel: string;
  allowRemote: boolean;
  supportsVision: boolean;
  defaultParams?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    seed?: number;
    stop?: string | string[];
  };
};

export type LocalModelInfo = {
  id: string;
  name?: string;
  maxContextLength?: number;
};

const LOCAL_MODE_STORAGE_KEY = "modelmix-local-mode";

const DEFAULT_LOCAL_BASE_URL = "http://localhost:1234";
const DEFAULT_LOCAL_MODEL = "local-model";
const DEFAULT_LOCAL_MODEL_LABEL = "Local Model";
const runtimeEnv = (import.meta.env as unknown as Record<string, string | undefined>) || {};

export const normalizeBaseUrl = (value: string) => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/v1")) return trimmed.slice(0, -3);
  return trimmed;
};

export const isLocalhostUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
};

const parseStoredConfig = (): Partial<LocalModeConfig> => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(LOCAL_MODE_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Partial<LocalModeConfig>;
  } catch {
    return {};
  }
};

export const EXECUTION_MODE_STORAGE_KEY = "modelmix-execution-mode";

export const getExecutionMode = (): ExecutionMode => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(EXECUTION_MODE_STORAGE_KEY);
    if (stored === "local" || stored === "cloud") return stored;
  }
  const envValue = runtimeEnv.VITE_EXECUTION_MODE;
  if (envValue && envValue.toLowerCase() === "local") return "local";
  return "cloud";
};

export const isLocalModeEnabled = () => getExecutionMode() === "local";

const parseBoolean = (value?: string) => value === "true" || value === "1";

const parseDefaultParams = () => {
  const raw = runtimeEnv.VITE_LOCAL_OPENAI_PARAMS;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as LocalModeConfig["defaultParams"];
  } catch {
    return undefined;
  }
};

export const getLocalModeConfig = (mode: ExecutionMode = getExecutionMode()): LocalModeConfig => {
  const stored = parseStoredConfig();
  let baseUrl =
    normalizeBaseUrl(
      (stored.baseUrl as string) ||
      runtimeEnv.VITE_LOCAL_OPENAI_BASE_URL ||
      DEFAULT_LOCAL_BASE_URL
    );
  const model = (stored.model as string) || runtimeEnv.VITE_LOCAL_OPENAI_MODEL || DEFAULT_LOCAL_MODEL;
  const modelLabel =
    (stored.modelLabel as string) ||
    runtimeEnv.VITE_LOCAL_OPENAI_MODEL_LABEL ||
    DEFAULT_LOCAL_MODEL_LABEL;
  let allowRemote =
    typeof stored.allowRemote === "boolean"
      ? stored.allowRemote
      : parseBoolean(runtimeEnv.VITE_LOCAL_ALLOW_REMOTE);
  const supportsVision =
    typeof stored.supportsVision === "boolean"
      ? stored.supportsVision
      : (runtimeEnv.VITE_LOCAL_SUPPORTS_VISION ? parseBoolean(runtimeEnv.VITE_LOCAL_SUPPORTS_VISION) : true); // Default to true to allow attachments
  const defaultParams = stored.defaultParams || parseDefaultParams();
  const enabled = mode === "local";

  if (enabled && typeof window !== "undefined") {
    const appHost = window.location.hostname;
    const appHostIsLocal = ["localhost", "127.0.0.1", "::1"].includes(appHost);

    if (!appHostIsLocal) {
      const currentIsLocalhost = isLocalhostUrl(baseUrl);
      if (currentIsLocalhost) {
        baseUrl = normalizeBaseUrl(`http://${appHost}:1234`);
        allowRemote = true;
      } else {
        try {
          const baseHost = new URL(baseUrl).hostname;
          if (baseHost === appHost) {
            allowRemote = true;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (!enabled) {
    return {
      enabled: false,
      isValid: true,
      baseUrl,
      model,
      modelLabel,
      allowRemote,
      supportsVision,
      defaultParams,
    };
  }

  if (!allowRemote && !isLocalhostUrl(baseUrl)) {
    return {
      enabled,
      isValid: false,
      error: "Local mode is restricted to localhost URLs. Update VITE_LOCAL_OPENAI_BASE_URL or enable VITE_LOCAL_ALLOW_REMOTE.",
      baseUrl,
      model,
      modelLabel,
      allowRemote,
      supportsVision,
      defaultParams,
    };
  }

  return {
    enabled,
    isValid: true,
    baseUrl,
    model,
    modelLabel,
    allowRemote,
    supportsVision,
    defaultParams,
  };
};

const coerceLocalModelId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

export const fetchLocalModelCatalog = async (baseUrl: string): Promise<LocalModelInfo[]> => {
  const normalized = normalizeBaseUrl(baseUrl);

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const getArrayProp = (value: unknown, key: string): unknown[] | null => {
    if (!isRecord(value)) return null;
    const prop = value[key];
    return Array.isArray(prop) ? prop : null;
  };

  const getModelIdFromRecord = (value: Record<string, unknown>) =>
    coerceLocalModelId(value.id ?? value.model ?? value.name);

  const tryFetch = async (path: string) => {
    const response = await fetch(`${normalized}${path}`);
    if (!response.ok) return null;
    return response.json();
  };

  try {
    const v0 = await tryFetch("/api/v0/models");
    const v0List: unknown[] | null =
      getArrayProp(v0, "data") || getArrayProp(v0, "models") || null;

    if (v0List) {
      const models = v0List
        .map((m: unknown) => {
          if (!isRecord(m)) return null;
          const id = getModelIdFromRecord(m);
          if (!id) return null;

          const maxContextLengthRaw = m["max_context_length"];
          const contextLengthRaw = m["context_length"];
          const maxContextLength =
            typeof maxContextLengthRaw === "number"
              ? maxContextLengthRaw
              : typeof contextLengthRaw === "number"
                ? contextLengthRaw
                : undefined;
          const name = typeof m["name"] === "string" ? m["name"] : undefined;
          return { id, name, maxContextLength } satisfies LocalModelInfo;
        })
        .filter(Boolean) as LocalModelInfo[];

      models.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
      return models;
    }
  } catch {
    void 0;
  }

  try {
    const v1 = await tryFetch("/v1/models");
    const v1List: unknown[] | null =
      getArrayProp(v1, "data") || getArrayProp(v1, "models") || null;

    if (v1List) {
      const models = v1List
        .map((m: unknown) => {
          if (!isRecord(m)) return null;
          const id = getModelIdFromRecord(m);
          if (!id) return null;
          const name = typeof m["name"] === "string" ? m["name"] : undefined;
          return { id, name } satisfies LocalModelInfo;
        })
        .filter(Boolean) as LocalModelInfo[];

      models.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
      return models;
    }
  } catch {
    void 0;
  }

  try {
    const legacy = await tryFetch("/models");
    const legacyList: unknown[] | null =
      getArrayProp(legacy, "data") || getArrayProp(legacy, "models") || null;

    if (legacyList) {
      const models = legacyList
        .map((m: unknown) => {
          if (!isRecord(m)) return null;
          const id = getModelIdFromRecord(m);
          if (!id) return null;
          const name = typeof m["name"] === "string" ? m["name"] : undefined;
          return { id, name } satisfies LocalModelInfo;
        })
        .filter(Boolean) as LocalModelInfo[];

      models.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
      return models;
    }
  } catch {
    void 0;
  }

  return [];
};
