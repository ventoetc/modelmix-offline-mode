import { useState, useEffect, useCallback, useRef } from "react";

export interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    is_moderated?: boolean;
    context_length?: number;
    max_completion_tokens?: number;
  };
}

export interface GroupedModels {
  vendor: string;
  vendorDisplayName: string;
  models: { id: string; name: string }[];
}

interface UseOpenRouterModelsResult {
  models: OpenRouterModel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  getModel: (id: string) => OpenRouterModel | undefined;
  supportsVision: (id: string) => boolean;
  getVisionAlternative: (id: string) => OpenRouterModel | undefined;
  groupedModels: GroupedModels[];
}

interface UseOpenRouterModelsOptions {
  enabled?: boolean;
}

type OpenRouterApiModel = {
  id: string;
  name?: string;
  created?: number;
  description?: string;
  context_length?: number;
  architecture?: OpenRouterModel["architecture"];
  pricing?: OpenRouterModel["pricing"];
  top_provider?: OpenRouterModel["top_provider"];
};

// Top models by usage/popularity (fallback if API fails)
const FALLBACK_MODELS: OpenRouterModel[] = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", architecture: { input_modalities: ["text", "image"] } },
  { id: "anthropic/claude-4.5-sonnet-20250929", name: "Claude Sonnet 4.5", architecture: { input_modalities: ["text", "image"] } },
  { id: "openai/gpt-4o", name: "GPT-4o", architecture: { input_modalities: ["text", "image"] } },
  { id: "openai/gpt-4.5-preview", name: "GPT-4.5 Preview", architecture: { input_modalities: ["text", "image"] } },
  { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast 1", architecture: { input_modalities: ["text"] } },
  { id: "deepseek/deepseek-v3.2-20251201", name: "DeepSeek V3.2", architecture: { input_modalities: ["text"] } },
  { id: "google/gemini-3-flash-preview-20251217", name: "Gemini 3 Flash Preview", architecture: { input_modalities: ["text", "image"] } },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", architecture: { input_modalities: ["text", "image"] } },
  { id: "anthropic/claude-4.5-opus-20251124", name: "Claude Opus 4.5", architecture: { input_modalities: ["text", "image"] } },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", architecture: { input_modalities: ["text", "image"] } },
  { id: "mistralai/mistral-large", name: "Mistral Large", architecture: { input_modalities: ["text"] } },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", architecture: { input_modalities: ["text"] } },
];

// Top providers to prioritize in sorting
const TOP_PROVIDERS = ["openai", "anthropic", "google", "x-ai", "deepseek", "meta-llama", "mistralai"];

// Vendor display names
const VENDOR_DISPLAY_NAMES: Record<string, string> = {
  "openai": "OpenAI",
  "anthropic": "Anthropic",
  "google": "Google",
  "x-ai": "xAI",
  "deepseek": "DeepSeek",
  "meta-llama": "Meta",
  "mistralai": "Mistral",
  "cohere": "Cohere",
  "perplexity": "Perplexity",
  "together": "Together AI",
  "fireworks-ai": "Fireworks",
};

const getVendorDisplayName = (vendor: string): string => {
  return VENDOR_DISPLAY_NAMES[vendor] || vendor.charAt(0).toUpperCase() + vendor.slice(1);
};

// Group models by vendor
const groupModelsByVendor = (models: { id: string; name: string }[]): GroupedModels[] => {
  const vendorMap = new Map<string, { id: string; name: string }[]>();
  
  for (const model of models) {
    const vendor = model.id.split("/")[0];
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, []);
    }
    vendorMap.get(vendor)!.push(model);
  }
  
  // Sort vendors by priority
  const sortedVendors = Array.from(vendorMap.entries()).sort((a, b) => {
    const indexA = TOP_PROVIDERS.indexOf(a[0]);
    const indexB = TOP_PROVIDERS.indexOf(b[0]);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a[0].localeCompare(b[0]);
  });
  
  return sortedVendors.map(([vendor, vendorModels]) => ({
    vendor,
    vendorDisplayName: getVendorDisplayName(vendor),
    models: vendorModels.sort((a, b) => a.name.localeCompare(b.name)),
  }));
};

export const useOpenRouterModels = (
  apiKey?: string,
  options: UseOpenRouterModelsOptions = {}
): UseOpenRouterModelsResult => {
  const enabled = options.enabled ?? true;
  const [models, setModels] = useState<OpenRouterModel[]>(FALLBACK_MODELS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupedModels, setGroupedModels] = useState<GroupedModels[]>([]);
  const fetchedRef = useRef(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Update grouped models when models change
  useEffect(() => {
    const grouped = groupModelsByVendor(models.slice(0, 150).map(m => ({ id: m.id, name: m.name })));
    setGroupedModels(grouped);
  }, [models]);

  const fetchModels = useCallback(async () => {
    if (!enabled || !apiKey) {
      setModels(FALLBACK_MODELS);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        // Sort by provider priority (top providers first) then by name
        const sortedModels = (data.data as OpenRouterApiModel[])
          .map((m) => ({
            id: m.id,
            name: m.name || m.id,
            created: m.created,
            description: m.description,
            context_length: m.context_length,
            architecture: m.architecture,
            pricing: m.pricing,
            top_provider: m.top_provider,
          }))
          .sort((a: OpenRouterModel, b: OpenRouterModel) => {
            const providerA = a.id.split("/")[0];
            const providerB = b.id.split("/")[0];
            const indexA = TOP_PROVIDERS.indexOf(providerA);
            const indexB = TOP_PROVIDERS.indexOf(providerB);
            
            // Both are top providers - sort by provider priority then name
            if (indexA !== -1 && indexB !== -1) {
              if (indexA !== indexB) return indexA - indexB;
              return a.name.localeCompare(b.name);
            }
            // Only A is top provider
            if (indexA !== -1) return -1;
            // Only B is top provider
            if (indexB !== -1) return 1;
            // Neither - sort alphabetically by name
            return a.name.localeCompare(b.name);
          });
        
        setModels(sortedModels);
        
        // Cache in localStorage
        localStorage.setItem("openrouter-models-cache", JSON.stringify({
          timestamp: Date.now(),
          models: sortedModels,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch OpenRouter models:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch models");
      
      // Try to load from cache
      const cached = localStorage.getItem("openrouter-models-cache");
      if (cached) {
        try {
          const { models: cachedModels } = JSON.parse(cached);
          setModels(cachedModels);
        } catch {
          setModels(FALLBACK_MODELS);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, enabled]);

  useEffect(() => {
    if (!enabled) {
      setModels(FALLBACK_MODELS);
      setIsLoading(false);
      setError(null);
      return;
    }
    // Prevent double fetch in dev mode
    if (fetchedRef.current) return;
    
    // Try to load from cache first (sync, no reflow)
    const cached = localStorage.getItem("openrouter-models-cache");
    if (cached) {
      try {
        const { timestamp, models: cachedModels } = JSON.parse(cached);
        // Use cache if less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          setModels(cachedModels);
          fetchedRef.current = true;
          return;
        }
      } catch {
        // Ignore cache errors
      }
    }
    
    if (enabled && apiKey) {
      // Defer API fetch to avoid blocking initial render
      fetchTimeoutRef.current = setTimeout(() => {
        fetchedRef.current = true;
        fetchModels();
      }, 100);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [apiKey, fetchModels, enabled]);

  const getModel = useCallback(
    (id: string) => models.find((m) => m.id === id),
    [models]
  );

  const supportsVision = useCallback(
    (id: string) => {
      const model = getModel(id);
      if (!model?.architecture?.input_modalities) return false;
      return model.architecture.input_modalities.includes("image");
    },
    [getModel]
  );

  const getVisionAlternative = useCallback(
    (id: string) => {
      const currentModel = getModel(id);
      if (!currentModel) return undefined;

      // Find a similar model that supports vision
      const provider = id.split("/")[0];
      
      // Look for vision-capable model from same provider
      const sameProviderVision = models.find(
        (m) =>
          m.id !== id &&
          m.id.startsWith(provider + "/") &&
          m.architecture?.input_modalities?.includes("image")
      );

      if (sameProviderVision) return sameProviderVision;

      // Otherwise recommend a popular vision model
      const popularVisionModels = [
        "google/gemini-2.5-flash",
        "anthropic/claude-4.5-sonnet-20250929",
        "openai/gpt-4o",
      ];

      for (const modelId of popularVisionModels) {
        const model = getModel(modelId);
        if (model && supportsVision(modelId)) {
          return model;
        }
      }

      return undefined;
    },
    [models, getModel, supportsVision]
  );

  return {
    models,
    isLoading,
    error,
    refetch: fetchModels,
    getModel,
    supportsVision,
    getVisionAlternative,
    groupedModels,
  };
};
