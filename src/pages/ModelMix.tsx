import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn, generateUUID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Plus, Minus, RefreshCw, 
  Sparkles, Pencil, Zap, AlignLeft, FileText,
  Coins, FilePlus, Settings
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useCredits } from "@/hooks/useCredits";
import { useTesterContext } from "@/hooks/useTesterContext";
import { generateFingerprint } from "@/lib/fingerprint";
import { useActionTracker } from "@/hooks/useActionTracker";
import { getBYOKKeys } from "@/components/ApiKeyManager";
import ExportDialog from "@/components/ExportDialog";
import ChatPanel, { ResponseDepth } from "@/components/ChatPanel";
import ResponseLightbox from "@/components/ResponseLightbox";
import PromptSuggestions from "@/components/PromptSuggestions";
import AttachmentInput, { Attachment } from "@/components/AttachmentInput";
import ReplyPanel from "@/components/ReplyPanel";
import ModelInfoModal from "@/components/ModelInfoModal";
import ModelPickerModal from "@/components/ModelPickerModal";
import { useConversationHistory } from "@/hooks/useConversationHistory";
import RoundNavigator, { Round } from "@/components/RoundNavigator";
import ModelThreadView from "@/components/ModelThreadView";
import ConversationTimeline from "@/components/ConversationTimeline";
import Logo from "@/components/Logo";
import DevBanner from "@/components/DevBanner";
import FeedbackWidget from "@/components/FeedbackWidget";
import PrivacyBanner from "@/components/PrivacyBanner";
import OnboardingTour, { useOnboardingTour, TourTriggerButton } from "@/components/OnboardingTour";
import SettingsModal from "@/components/SettingsModal";
import PromptCache from "@/components/PromptCache";
import PromptTemplates from "@/components/PromptTemplates";
import TesterAccountSwitcher from "@/components/TesterAccountSwitcher";
import { ContextIdBadge } from "@/components/ContextIdBadge";
import { useOpenRouterModels, OpenRouterModel } from "@/hooks/useOpenRouterModels";
import WindowManagementMenu from "@/components/WindowManagementMenu";
import DeepResearchButton from "@/components/DeepResearchButton";
import RoutingIntelligenceLightbox from "@/components/RoutingIntelligenceLightbox";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  getExecutionMode,
  getLocalModeConfig,
  fetchLocalModelCatalog,
  LocalModeOrchestrator,
  LocalOpenAICompatibleProvider,
  type LocalContentPart,
  type LocalMessage,
  type LocalModelInfo,
} from "@/lib/localMode";
import { DEFAULT_STARTER_PROMPTS } from "@/constants/prompts";
import { SLOT_PERSONALITIES } from "@/lib/constants";
import { ChatResponse } from "@/types";
import { ReplyMode } from "@/components/ReplyModeSelector";

// Default models available with direct API access or OpenRouter
// These are the recommended models for best performance/price
const DEFAULT_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
  { id: "x-ai/grok-2", name: "Grok 2" },
  { id: "mistralai/mistral-large", name: "Mistral Large" },
];

// Personality-based system prompts for free tier diversity
// Each slot gets a unique "personality" to show model diversity
// Moved to src/lib/constants.ts to avoid HMR issues

// Tier-based limits
const TIER_CONFIG = {
  anonymous: { maxPanels: 2, maxQuestions: 1, canAccessAllModels: false },
  authenticated: { maxPanels: 4, maxQuestions: 50, canAccessAllModels: false },
  tester: { maxPanels: 6, maxQuestions: Infinity, canAccessAllModels: true },
  byok: { maxPanels: 6, maxQuestions: Infinity, canAccessAllModels: true }, // BYOK users get full access
};

// Top 10 popular models for random selection
const TOP_10_MODELS = [
  "google/gemini-2.5-flash",
  "anthropic/claude-4.5-sonnet-20250929",
  "x-ai/grok-code-fast-1",
  "deepseek/deepseek-v3.2-20251201",
  "google/gemini-3-flash-preview-20251217",
  "anthropic/claude-4.5-opus-20251124",
  "openai/gpt-4o",
  "google/gemini-2.0-flash-001",
  "x-ai/grok-4.1-fast",
  "mistralai/mistral-large",
];

const getRandomTopModel = (excludeModels: string[] = []) => {
  const available = TOP_10_MODELS.filter(m => !excludeModels.includes(m));
  if (available.length === 0) return TOP_10_MODELS[Math.floor(Math.random() * TOP_10_MODELS.length)];
  return available[Math.floor(Math.random() * available.length)];
};

// Generate a readable session title from prompt
const generateSessionTitle = (promptText: string): string => {
  if (!promptText) return "New Session";
  const cleaned = promptText.trim().replace(/\s+/g, " ");
  // Trim to 20 chars for a cleaner sidebar look
  if (cleaned.length <= 20) return cleaned;
  return cleaned.substring(0, 17) + "...";
};


const ModelMix = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { balance, isRegistered, referralCode, refreshBalance, getReferralLink } = useCredits();
  const { contextId, isTester, usageValue, sessionTokens } = useTesterContext();
  const { trackTemplateUsage } = useActionTracker();

  const [executionMode] = useState(() => getExecutionMode());
  const localModeConfig = useMemo(() => getLocalModeConfig(executionMode), [executionMode]);
  const isLocalMode = localModeConfig.enabled;
  const localOrchestratorRef = useRef<LocalModeOrchestrator | null>(null);
  const localAgentsRef = useRef<Map<string, { agentId: string; alias: string }>>(new Map());
  
  // Track the actual local model ID to use (fetched from server)
  const [resolvedLocalModelId, setResolvedLocalModelId] = useState<string>(() => {
    if (localModeConfig.model && localModeConfig.model !== "local-model") return localModeConfig.model;
    return "local-model";
  });
  const resolvedLocalModelIdRef = useRef<string>(resolvedLocalModelId);
  const [localModels, setLocalModels] = useState<LocalModelInfo[]>([]);
  const SUPER_SUMMARY_TRIGGER = "super summary";

  const isSuperSummaryTrigger = useCallback(
    (text: string) => text.toLowerCase().includes(SUPER_SUMMARY_TRIGGER),
    []
  );

  const buildResponseControlPrompt = useCallback(
    (triggered: boolean) => {
      if (triggered) {
        return `The user requested a SUPER SUMMARY. Ignore any brevity constraints. Provide a comprehensive response that fully unloads all relevant context and details. Use markdown with clear headers when helpful.`;
      }

      return `Output policy: respond with exactly one paragraph. Do not use bullet points, lists, headings, or blank lines. Keep it concise and directly responsive.`;
    },
    []
  );

  const estimateTokens = useCallback((text: string) => Math.ceil(text.length / 4), []);

  const trimConversationHistoryForBudget = useCallback(
    (history: Array<{ role: string; content: string }>, budgetTokens: number) => {
      const total = history.reduce((sum, m) => sum + estimateTokens(m.content || ""), 0);
      if (total <= budgetTokens) return history;

      const next = [...history];
      while (next.length > 4) {
        const nextTotal = next.reduce((sum, m) => sum + estimateTokens(m.content || ""), 0);
        if (nextTotal <= budgetTokens) break;
        next.shift();
      }
      return next;
    },
    [estimateTokens]
  );

  const coerceOneParagraph = useCallback((text: string) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return trimmed;
    const first = trimmed.split(/\n\s*\n+/)[0] || trimmed;
    return first.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  }, []);

  useEffect(() => {
    resolvedLocalModelIdRef.current = resolvedLocalModelId;
    if (!isLocalMode) return;
    if (!resolvedLocalModelId || resolvedLocalModelId === "local-model") return;
    try {
      const key = "modelmix-local-mode";
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(key, JSON.stringify({ ...parsed, model: resolvedLocalModelId }));
    } catch {
      void 0;
    }
  }, [resolvedLocalModelId, isLocalMode]);

  const refreshLocalModels = useCallback(async () => {
    if (!isLocalMode || !localModeConfig.baseUrl) return null;

    try {
      const models = await fetchLocalModelCatalog(localModeConfig.baseUrl);
      setLocalModels(models);

      const current = resolvedLocalModelIdRef.current;
      if (current && current !== "local-model" && models.some((m) => m.id === current)) {
        return current;
      }

      const nextId = models[0]?.id || null;
      if (!nextId) return null;

      resolvedLocalModelIdRef.current = nextId;
      setResolvedLocalModelId(nextId);
      return nextId;
    } catch {
      return null;
    }
  }, [isLocalMode, localModeConfig.baseUrl]);

  // Fetch available models from the local server to get the correct ID
  useEffect(() => {
    if (isLocalMode && localModeConfig.baseUrl) {
      refreshLocalModels();
      // Retry after 2 seconds just in case server was starting up
      setTimeout(refreshLocalModels, 2000);
    }
  }, [isLocalMode, localModeConfig.baseUrl, refreshLocalModels]);

  // Store referral code if present in URL
  const referralCodeFromUrl = searchParams.get("ref");
  const [fingerprint] = useState(() => generateFingerprint());
  
  // Default model IDs for fresh sessions
  const INITIAL_MODEL_IDS = [
    "google/gemini-2.5-flash",
    "openai/gpt-5-mini",
    "google/gemini-2.5-flash",
    "openai/gpt-5-mini",
  ];

  // Session persistence key
  const SESSION_STORAGE_KEY = "modelmix-active-session";

  // Restore or create session
  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      } catch {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    }
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });

  // Session state - now persisted across refreshes
  const [prompt, setPrompt] = useState("");
  const [panelCount, setPanelCount] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.panelCount || 2;
      } catch {
        return 2;
      }
    }
    return 2;
  });
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.selectedModels || INITIAL_MODEL_IDS;
      } catch {
        return INITIAL_MODEL_IDS;
      }
    }
    return INITIAL_MODEL_IDS;
  });
  const [responses, setResponses] = useState<ChatResponse[]>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return Array.isArray(session.responses) ? session.responses : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [lightboxResponse, setLightboxResponse] = useState<ChatResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings that persist across sessions
  const [apiKey] = useState(""); // Kept for tester compatibility but not exposed in UI
  const [systemPrompt, setSystemPrompt] = useState(() =>
    localStorage.getItem("arena-system-prompt") ||
    "Respond in markdown format. Keep your initial response concise and focused (2-3 paragraphs max). Expand with more detail only when asked for clarification or follow-up."
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [conversationStarted, setConversationStarted] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.conversationStarted || false;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [sessionTitle, setSessionTitle] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.sessionTitle || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [sessionStartTime, setSessionStartTime] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.sessionStartTime || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isAnyLoading, setIsAnyLoading] = useState(false);
  const safeJsonParse = useCallback(<T,>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, []);

  const [modelSystemPrompts, setModelSystemPrompts] = useState<Record<string, string>>(() => {
    const session = safeJsonParse<Record<string, unknown>>(
      localStorage.getItem(SESSION_STORAGE_KEY),
      {}
    );
    const fromSession = session.modelSystemPrompts;
    if (fromSession && typeof fromSession === "object") {
      const asRecord = fromSession as Record<string, unknown>;
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(asRecord)) {
        if (typeof value === "string") next[key] = value;
      }
      return next;
    }
    return safeJsonParse<Record<string, string>>(localStorage.getItem("modelmix-model-system-prompts"), {});
  });

  const [modelPersonaLabels, setModelPersonaLabels] = useState<Record<string, string | null>>(() => {
    const session = safeJsonParse<Record<string, unknown>>(
      localStorage.getItem(SESSION_STORAGE_KEY),
      {}
    );
    const fromSession = session.modelPersonaLabels;
    if (fromSession && typeof fromSession === "object") {
      const asRecord = fromSession as Record<string, unknown>;
      const next: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(asRecord)) {
        if (value === null || typeof value === "string") next[key] = value;
      }
      return next;
    }
    return safeJsonParse<Record<string, string | null>>(
      localStorage.getItem("modelmix-model-persona-labels"),
      {}
    );
  });
  const [customModelNames, setCustomModelNames] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("modelmix-custom-names");
    return saved ? JSON.parse(saved) : {};
  });

  // Response depth states - default to basic (collapsed)
  const [responseDepths, setResponseDepths] = useState<Record<string, ResponseDepth>>({});
  const [globalDepth, setGlobalDepth] = useState<ResponseDepth>("basic");
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  
  // Round navigation state - now persisted
  const [prompts, setPrompts] = useState<string[]>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        return session.prompts || [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [promptMeta, setPromptMeta] = useState<Array<{ visibility: "public" | "mentioned"; visibleToModelIds?: string[] }>>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return [];
    try {
      const session = JSON.parse(saved);
      const rawPrompts: unknown = session.prompts;
      const rawMeta: unknown = session.promptMeta;
      const promptCount = Array.isArray(rawPrompts) ? rawPrompts.length : 0;
      const normalized = Array.isArray(rawMeta)
        ? rawMeta.map((m) => {
            const meta = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
            const visibility = meta.visibility === "mentioned" ? "mentioned" : "public";
            const visibleToModelIds = Array.isArray(meta.visibleToModelIds)
              ? meta.visibleToModelIds.filter((id: unknown): id is string => typeof id === "string")
              : undefined;
            return visibility === "mentioned" ? { visibility, visibleToModelIds } : { visibility };
          })
        : [];

      while (normalized.length < promptCount) normalized.push({ visibility: "public" });
      return normalized.slice(0, promptCount);
    } catch {
      return [];
    }
  });
  const [currentViewRound, setCurrentViewRound] = useState<number | "all">("all");

  const canModelReadRound = useCallback((modelId: string, roundIndex: number) => {
    const meta = promptMeta[roundIndex];
    if (!meta) return true;
    if (meta.visibility !== "mentioned") return true;
    return Array.isArray(meta.visibleToModelIds) && meta.visibleToModelIds.includes(modelId);
  }, [promptMeta]);

  const canModelReadResponse = useCallback((modelId: string, response: ChatResponse) => {
    if (response.visibility !== "mentioned") return true;
    return Array.isArray(response.visibleToModelIds) && response.visibleToModelIds.includes(modelId);
  }, []);

  const getVisiblePromptsForModel = useCallback((modelId: string) => {
    return prompts.filter((_, idx) => canModelReadRound(modelId, idx));
  }, [prompts, canModelReadRound]);
  
  // Thread view state
  const [threadModel, setThreadModel] = useState<{ id: string; name: string } | null>(null);
  
  // Timeline view state
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Routing Intelligence Lightbox state - shows during loading
  const [showRoutingLightbox, setShowRoutingLightbox] = useState(false);
  
  // Deep Research Dialog state (controlled by FollowUpShortcuts link)
  const [showDeepResearch, setShowDeepResearch] = useState(false);
  
  // Failed/invalid models tracking
  const [failedModels, setFailedModels] = useState<Set<string>>(new Set());
  
  // Model health stats tracking (success/failure counts)
  const [modelHealth, setModelHealth] = useState<Record<string, { success: number; failure: number }>>(() => {
    const saved = localStorage.getItem("arena-model-health");
    return saved ? JSON.parse(saved) : {};
  });
  
  // Prompt cache state
  const [cachedPrompts, setCachedPrompts] = useState<Array<{
    id: string;
    text: string;
    title: string;
    createdAt: string;
    usageCount: number;
    isFavorite: boolean;
  }>>(() => {
    const saved = localStorage.getItem("arena-cached-prompts");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Model info modal state
  const [modelInfoModal, setModelInfoModal] = useState<OpenRouterModel | null>(null);
  
  // Model picker modal state - DISABLED (new tier-based flow)
  const [showModelPicker, setShowModelPicker] = useState(false);
  
  // Database-backed conversation history
  const {
    conversations: conversationHistory,
    saveConversation,
    loadConversation,
    deleteConversation,
    clearAllHistory,
  } = useConversationHistory();

  // Mark as visited after first render
  useEffect(() => {
    localStorage.setItem("arena-has-visited", "true");
  }, []);

  useEffect(() => {
    if (!localModeConfig.enabled) {
      localOrchestratorRef.current = null;
      localAgentsRef.current.clear();
      return;
    }

    if (!localModeConfig.isValid) {
      localOrchestratorRef.current = null;
      localAgentsRef.current.clear();
      toast({
        title: "Local mode configuration error",
        description: localModeConfig.error || "Invalid local mode configuration.",
        variant: "destructive",
      });
      return;
    }

    try {
      const provider = new LocalOpenAICompatibleProvider({
        baseUrl: localModeConfig.baseUrl,
        model: localModeConfig.model,
        allowRemote: localModeConfig.allowRemote,
      });
      localOrchestratorRef.current = new LocalModeOrchestrator(provider);
      localAgentsRef.current.clear();
    } catch (error) {
      localOrchestratorRef.current = null;
      localAgentsRef.current.clear();
      toast({
        title: "Local mode initialization failed",
        description: error instanceof Error ? error.message : "Failed to initialize local mode.",
        variant: "destructive",
      });
    }
  }, [localModeConfig]);

  // Use the OpenRouter models hook
  const { 
    models: openRouterModels, 
    isLoading: modelsLoading, 
    refetch: refetchModels,
    getModel: getOpenRouterModel,
    supportsVision: supportsOpenRouterVision,
    getVisionAlternative: getOpenRouterVisionAlternative,
    groupedModels: openRouterGroupedModels,
  } = useOpenRouterModels(apiKey, { enabled: !isLocalMode });

  const selectedLocalModelInfo = useMemo(
    () => localModels.find((m) => m.id === resolvedLocalModelId) || null,
    [localModels, resolvedLocalModelId]
  );

  const localModelDefinition = useMemo<OpenRouterModel>(() => ({
    id: resolvedLocalModelId,
    name: selectedLocalModelInfo?.name || localModeConfig.modelLabel,
    context_length: selectedLocalModelInfo?.maxContextLength,
    architecture: { input_modalities: localModeConfig.supportsVision ? ["text", "image"] : ["text"] },
  }), [resolvedLocalModelId, selectedLocalModelInfo?.name, selectedLocalModelInfo?.maxContextLength, localModeConfig.modelLabel, localModeConfig.supportsVision]);

  const localGroupedModels = useMemo(() => ([
    {
      vendor: "local",
      vendorDisplayName: "Local",
      models: [{ id: localModelDefinition.id, name: localModelDefinition.name }],
    },
  ]), [localModelDefinition.id, localModelDefinition.name]);

  const getLocalBaseModelId = useCallback(
    (modelId: string) => modelId.split("::")[0],
    []
  );

  const models = useMemo(
    () => (isLocalMode ? [localModelDefinition] : openRouterModels),
    [isLocalMode, localModelDefinition, openRouterModels]
  );

  const getModel = useCallback(
    (id: string) => {
      if (isLocalMode) {
        const baseId = getLocalBaseModelId(id);
        return baseId === localModelDefinition.id ? localModelDefinition : undefined;
      }
      return getOpenRouterModel(id);
    },
    [isLocalMode, localModelDefinition, getOpenRouterModel, getLocalBaseModelId]
  );

  const supportsVision = useCallback(
    (id: string) => (isLocalMode ? localModeConfig.supportsVision : supportsOpenRouterVision(id)),
    [isLocalMode, localModeConfig.supportsVision, supportsOpenRouterVision]
  );

  const getVisionAlternative = useCallback(
    (id: string) => (isLocalMode ? undefined : getOpenRouterVisionAlternative(id)),
    [isLocalMode, getOpenRouterVisionAlternative]
  );

  const groupedModels = useMemo(
    () => (isLocalMode ? localGroupedModels : openRouterGroupedModels),
    [isLocalMode, localGroupedModels, openRouterGroupedModels]
  );

  // Onboarding tour
  const { showTour, hasSeenTour, startTour, completeTour, skipTour } = useOnboardingTour(user?.id);

  // Determine user tier
  const userTier = useMemo((): keyof typeof TIER_CONFIG => {
    if (isLocalMode) return "anonymous";
    // Check if user has BYOK keys
    const byokKeys = getBYOKKeys();
    const hasBYOKKeys = Object.keys(byokKeys).length > 0;

    if (isTester) return "tester"; // Testers get full access for internal testing
    if (hasBYOKKeys) return "byok"; // BYOK users get full access
    if (user) return "authenticated";
    return "anonymous";
  }, [user, isTester, isLocalMode]);

  // Get tier configuration
  const localTierConfig = useMemo(() => ({
    maxPanels: 6,
    maxQuestions: Infinity,
    canAccessAllModels: true,
  }), []);

  const tierConfig = useMemo(
    () => (isLocalMode ? localTierConfig : TIER_CONFIG[userTier]),
    [isLocalMode, localTierConfig, userTier]
  );
  
  // Max panels based on tier
  const maxPanels = tierConfig.maxPanels;

  // Track questions used in this session for anonymous users
  const [questionsUsed, setQuestionsUsed] = useState(() => {
    const saved = localStorage.getItem("modelmix-questions-used");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Check if user has exceeded their question limit
  const hasReachedQuestionLimit = useMemo(() => {
    if (isLocalMode) return false;
    if (userTier === "anonymous") {
      return questionsUsed >= tierConfig.maxQuestions;
    }
    return false; // Other tiers have high/unlimited questions
  }, [isLocalMode, userTier, questionsUsed, tierConfig.maxQuestions]);

  // Model availability based on tier
  const availableModels = useMemo(() => {
    if (isLocalMode) {
      return [{ id: localModelDefinition.id, name: localModelDefinition.name }];
    }
    if (tierConfig.canAccessAllModels && models.length > 0) {
      // Testers and BYOK users get full OpenRouter model list + Default models
      const openRouterModels = models.slice(0, 150).map(m => ({ id: m.id, name: m.name }));
      const defaultIds = new Set(DEFAULT_MODELS.map(m => m.id));
      const filteredOpenRouter = openRouterModels.filter(m => !defaultIds.has(m.id));
      return [...DEFAULT_MODELS, ...filteredOpenRouter];
    }
    // Default: Recommended models (work with any API key)
    return DEFAULT_MODELS;
  }, [isLocalMode, localModelDefinition.id, localModelDefinition.name, models, tierConfig.canAccessAllModels]);

  const localDefaultModelIds = useMemo(
    () => Array.from({ length: 4 }, (_, index) => `${resolvedLocalModelId}::agent-${index + 1}`),
    [resolvedLocalModelId]
  );

  useEffect(() => {
    if (!isLocalMode) return;
    setSelectedModels(localDefaultModelIds);
  }, [isLocalMode, resolvedLocalModelId, localDefaultModelIds]);

  // Build rounds from prompts
  const rounds: Round[] = useMemo(() => {
    return prompts.map((p, idx) => ({
      index: idx,
      prompt: p,
      timestamp: responses.find(r => r.roundIndex === idx)?.timestamp || "",
      responseCount: responses.filter(r => r.roundIndex === idx).length,
    }));
  }, [prompts, responses]);

  // Check which active models don't support vision when attachments are present
  const getUnsupportedVisionModels = useCallback((currentAttachments: Attachment[]) => {
    if (currentAttachments.length === 0) return [];
    
    const activeModels = selectedModels.slice(0, panelCount);
    return activeModels
      .filter(id => !supportsVision(id))
      .map(id => {
        const model = getModel(id);
        const alternative = getVisionAlternative(id);
        return {
          id,
          name: model?.name || id,
          alternativeId: alternative?.id,
          alternativeName: alternative?.name,
        };
      });
  }, [selectedModels, panelCount, supportsVision, getModel, getVisionAlternative]);

  const unsupportedVisionModels = useMemo(() => 
    getUnsupportedVisionModels(attachments),
    [attachments, getUnsupportedVisionModels]
  );

  // Swap a model slot to a vision-capable alternative
  const handleSwapModelForVision = useCallback((oldModelId: string, newModelId: string) => {
    if (isLocalMode) return;
    const index = selectedModels.findIndex(id => id === oldModelId);
    if (index !== -1) {
      const newModels = [...selectedModels];
      newModels[index] = newModelId;
      setSelectedModels(newModels);
      toast({
        title: "Model swapped",
        description: `Switched to ${getModel(newModelId)?.name || newModelId} for vision support`,
      });
    }
  }, [selectedModels, getModel, isLocalMode]);

  // Remove a model slot (reduce panel count)
  const handleRemoveModelSlot = useCallback((modelId: string) => {
    const index = selectedModels.findIndex(id => id === modelId);
    if (index !== -1 && panelCount > 1) {
      if (isLocalMode) {
        const record = localAgentsRef.current.get(modelId);
        if (record) {
          localOrchestratorRef.current?.delete(record.agentId);
          localAgentsRef.current.delete(modelId);
        }
      }
      // Move this model to the end and reduce panel count
      const newModels = [...selectedModels];
      const [removed] = newModels.splice(index, 1);
      newModels.push(removed);
      setSelectedModels(newModels);
      setPanelCount(prev => Math.max(1, prev - 1));
      toast({
        title: "Model removed",
        description: `Removed ${getModel(modelId)?.name || modelId} from comparison`,
      });
    }
  }, [selectedModels, panelCount, getModel, isLocalMode]);

  const handleRenameModelSlot = useCallback((modelId: string, newName?: string) => {
    setCustomModelNames(prev => {
      const next = { ...prev };
      if (newName) {
        next[modelId] = newName;
      } else {
        delete next[modelId];
      }
      localStorage.setItem("modelmix-custom-names", JSON.stringify(next));
      return next;
    });
  }, []);

  // Persist session state to localStorage
  useEffect(() => {
    localStorage.setItem("arena-prompt", prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem("arena-panel-count", panelCount.toString());
  }, [panelCount]);

  useEffect(() => {
    localStorage.setItem("arena-selected-models", JSON.stringify(selectedModels));
  }, [selectedModels]);

  useEffect(() => {
    localStorage.setItem("arena-responses", JSON.stringify(responses));
    setConversationStarted(responses.length > 0);
  }, [responses]);

  // Persist questions used for anonymous users
  useEffect(() => {
    localStorage.setItem("modelmix-questions-used", questionsUsed.toString());
  }, [questionsUsed]);

  // Note: BYOK localStorage persistence removed - self-host version handles this

  // Note: Conversation history now persisted in database via useConversationHistory hook

  // Persist entire session (responses, prompts, models, etc.)
  useEffect(() => {
    const sessionData = {
      sessionId,
      responses,
      prompts,
      promptMeta,
      selectedModels,
      panelCount,
      sessionTitle,
      sessionStartTime,
      conversationStarted,
      modelSystemPrompts,
      modelPersonaLabels,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

    // Also save individual items for backwards compatibility
    localStorage.setItem("arena-prompts", JSON.stringify(prompts));
    localStorage.setItem("arena-session-title", sessionTitle);
    localStorage.setItem("arena-session-start", sessionStartTime);
    localStorage.setItem("arena-session-id", sessionId);
  }, [sessionId, responses, prompts, promptMeta, selectedModels, panelCount, sessionTitle, sessionStartTime, conversationStarted, modelSystemPrompts, modelPersonaLabels]);

  // Persist system prompt
  useEffect(() => {
    localStorage.setItem("arena-system-prompt", systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    localStorage.setItem("modelmix-model-system-prompts", JSON.stringify(modelSystemPrompts));
  }, [modelSystemPrompts]);

  useEffect(() => {
    localStorage.setItem("modelmix-model-persona-labels", JSON.stringify(modelPersonaLabels));
  }, [modelPersonaLabels]);

  // Persist model health stats
  useEffect(() => {
    localStorage.setItem("arena-model-health", JSON.stringify(modelHealth));
  }, [modelHealth]);

  // Persist cached prompts
  useEffect(() => {
    localStorage.setItem("arena-cached-prompts", JSON.stringify(cachedPrompts));
  }, [cachedPrompts]);

  // Prompt cache handlers
  const handleSavePrompt = useCallback((promptText: string, title?: string) => {
    const newPrompt = {
      id: `prompt_${Date.now()}`,
      text: promptText.trim(),
      title: title || promptText.slice(0, 40) + (promptText.length > 40 ? "..." : ""),
      createdAt: new Date().toISOString(),
      usageCount: 0,
      isFavorite: false,
    };
    setCachedPrompts(prev => [newPrompt, ...prev]);
  }, []);

  const handleDeleteCachedPrompt = useCallback((id: string) => {
    setCachedPrompts(prev => prev.filter(p => p.id !== id));
    toast({ title: "Prompt deleted" });
  }, []);

  const handleTogglePromptFavorite = useCallback((id: string) => {
    setCachedPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  }, []);

  const handleSelectCachedPrompt = useCallback((promptText: string) => {
    setPrompt(promptText);
    // Increment usage count
    setCachedPrompts(prev => prev.map(p => 
      p.text === promptText ? { ...p, usageCount: p.usageCount + 1 } : p
    ));
  }, []);

  // Track model success/failure
  const recordModelResult = useCallback((modelId: string, success: boolean) => {
    setModelHealth(prev => {
      const current = prev[modelId] || { success: 0, failure: 0 };
      return {
        ...prev,
        [modelId]: {
          success: current.success + (success ? 1 : 0),
          failure: current.failure + (success ? 0 : 1),
        }
      };
    });
  }, []);

  // Clear failed models list
  const clearFailedModels = useCallback(() => {
    setFailedModels(new Set());
    toast({ title: "Failed models cleared", description: "You can now retry previously failed models" });
  }, []);

  // Clear all model health stats
  const clearModelHealth = useCallback(() => {
    setModelHealth({});
    localStorage.removeItem("arena-model-health");
    toast({ title: "Stats reset", description: "All model performance data cleared" });
  }, []);

  // Handle swap recommendation from performance dashboard
  const handleSwapRecommended = useCallback((modelId: string) => {
    const slotIndex = selectedModels.findIndex(m => m === modelId);
    if (slotIndex === -1 || slotIndex >= panelCount) {
      toast({ title: "Model not active", description: "This model is not currently in use" });
      return;
    }
    
    // Find a replacement
    const currentlyUsed = selectedModels.slice(0, panelCount);
    const replacement = TOP_10_MODELS.find(
      m => !currentlyUsed.includes(m) && m !== modelId
    ) || DEFAULT_MODELS.find(
      m => !currentlyUsed.includes(m.id) && m.id !== modelId
    )?.id;
    
    if (replacement) {
      setSelectedModels(prev => {
        const updated = [...prev];
        updated[slotIndex] = replacement;
        return updated;
      });
      
      const oldName = modelId.split("/")[1] || modelId;
      const newName = replacement.split("/")[1] || replacement;
      
      toast({
        title: "Model swapped",
        description: `Replaced ${oldName} with ${newName}`,
      });
    } else {
      toast({ title: "No alternatives available", variant: "destructive" });
    }
  }, [selectedModels, panelCount]);

  // Get model reliability percentage
  const getModelReliability = useCallback((modelId: string): number | null => {
    const stats = modelHealth[modelId];
    if (!stats || (stats.success + stats.failure) === 0) return null;
    return Math.round((stats.success / (stats.success + stats.failure)) * 100);
  }, [modelHealth]);

  // Calculate if any model is loading
  useEffect(() => {
    setIsAnyLoading(Object.values(loading).some(Boolean));
  }, [loading]);

  // Handle depth change for individual panel - collapse others unless in compare mode
  const handleDepthChange = (modelId: string, depth: ResponseDepth) => {
    if (depth === "basic") {
      // Collapsing this panel
      setResponseDepths(prev => ({ ...prev, [modelId]: depth }));
      if (expandedPanelId === modelId) {
        setExpandedPanelId(null);
      }
    } else {
      // Expanding this panel
      if (compareMode) {
        // In compare mode, allow multiple expanded
        setResponseDepths(prev => ({ ...prev, [modelId]: depth }));
      } else {
        // Single expansion mode - collapse others
        const activeModels = selectedModels.slice(0, panelCount);
        const newDepths: Record<string, ResponseDepth> = {};
        activeModels.forEach(m => {
          newDepths[m] = m === modelId ? depth : "basic";
        });
        setResponseDepths(newDepths);
        setExpandedPanelId(modelId);
      }
    }
  };

  // Set global depth for all panels
  const setAllDepths = (depth: ResponseDepth) => {
    setGlobalDepth(depth);
    const activeModels = selectedModels.slice(0, panelCount);
    const newDepths: Record<string, ResponseDepth> = {};
    activeModels.forEach(m => newDepths[m] = depth);
    setResponseDepths(newDepths);
    // Enable compare mode if expanding all
    if (depth !== "basic") {
      setCompareMode(true);
    }
  };

  // Toggle compare mode
  const toggleCompareMode = () => {
    const newMode = !compareMode;
    setCompareMode(newMode);
    if (!newMode && expandedPanelId) {
      // Exiting compare mode - collapse all except the last expanded
      const activeModels = selectedModels.slice(0, panelCount);
      const newDepths: Record<string, ResponseDepth> = {};
      activeModels.forEach(m => {
        newDepths[m] = m === expandedPanelId ? (responseDepths[m] || "basic") : "basic";
      });
      setResponseDepths(newDepths);
    }
  };

  const removePanel = (index: number) => {
    if (panelCount <= 1) return;
    
    const modelId = selectedModels[index];
    
    setResponses((prev) => prev.filter((r) => r.model !== modelId));
    
    setSelectedModels((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    
    setPanelCount((prev) => Math.max(1, prev - 1));
    
    toast({ title: `Removed ${modelId.split("/")[1] || modelId}` });
  };

  const handleModelChange = (index: number, modelId: string) => {
    setSelectedModels((prev) => {
      const newModels = [...prev];
      newModels[index] = modelId;
      return newModels;
    });
  };

  const handleModelPickerSelect = (modelId: string, slotIndex: number) => {
    handleModelChange(slotIndex, modelId);
  };

  const handleAttach = async (files: FileList) => {
    const newAttachments: Attachment[] = [];
    
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      let preview: string | undefined;
      let content: string | undefined;
      
      if (isImage) {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        const name = file.name.toLowerCase();
        const isLikelyText =
          file.type.startsWith("text/") ||
          file.type.includes("json") ||
          file.type === "application/pdf" ||
          [".txt", ".md", ".json", ".csv", ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css"].some((ext) =>
            name.endsWith(ext)
          );

        if (file.type === "application/pdf" && file.size <= 5 * 1024 * 1024) {
          try {
            const [{ getDocument, GlobalWorkerOptions }, workerSrc] = await Promise.all([
              import("pdfjs-dist/build/pdf"),
              import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
            ]);
            GlobalWorkerOptions.workerSrc = workerSrc.default;

            const data = await file.arrayBuffer();
            const pdf = await getDocument({ data }).promise;
            const pagesToRead = Math.min(pdf.numPages, 10);
            const parts: string[] = [];

            for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
              const page = await pdf.getPage(pageNumber);
              const textContent = await page.getTextContent();
              const pageText = (textContent.items as Array<{ str?: string }>)
                .map((item) => item.str || "")
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
              if (pageText) parts.push(pageText);
              if (parts.join("\n").length >= 200_000) break;
            }

            content = parts.join("\n\n");
            if (!content) content = undefined;
          } catch {
            content = undefined;
          }
        } else if (isLikelyText && file.size <= 200 * 1024) {
          try {
            const raw = await file.text();
            content = raw.length > 200_000 ? raw.slice(0, 200_000) : raw;
          } catch {
            content = undefined;
          }
        }
      }
      
      newAttachments.push({
        id: `${Date.now()}-${file.name}`,
        file,
        preview,
        content,
        type: isImage ? "image" : "file",
      });
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const buildMessageContent = useCallback(async (promptText: string, includeImages: boolean, currentAttachments: Attachment[]) => {
    // Collect text from file attachments
    const fileAttachments = currentAttachments.filter((a) => a.type === "file");
    const imageAttachments = currentAttachments.filter((a) => a.type === "image");

    let fileContext = "";
    if (fileAttachments.length > 0) {
      const fileParts = [];
      for (const attachment of fileAttachments) {
        if (attachment.content) {
          fileParts.push(`--- File: ${attachment.file.name} ---\n${attachment.content}`);
        } else {
          fileParts.push(`--- File: ${attachment.file.name} ---\n[Unable to extract file text automatically]`);
        }
      }
      if (fileParts.length > 0) {
        fileContext = `\n\nContext from attached files:\n${fileParts.join("\n\n")}`;
      }
    }

    const attachmentSummaryParts: string[] = [];
    if (imageAttachments.length > 0) {
      attachmentSummaryParts.push(`Attached images: ${imageAttachments.map((a) => a.file.name).join(", ")}`);
    }
    if (fileAttachments.length > 0) {
      attachmentSummaryParts.push(`Attached files: ${fileAttachments.map((a) => a.file.name).join(", ")}`);
    }
    const attachmentSummary = attachmentSummaryParts.length > 0 ? `\n\n${attachmentSummaryParts.join("\n")}` : "";

    const finalPrompt = promptText + attachmentSummary + fileContext;

    if (!includeImages || currentAttachments.length === 0) {
      return finalPrompt;
    }

    const content: LocalContentPart[] = [
      { type: "text", text: finalPrompt },
    ];

    for (const attachment of currentAttachments) {
      if (attachment.type === "image" && attachment.preview) {
        content.push({
          type: "image_url",
          image_url: { url: attachment.preview },
        });
      }
    }

    return content;
  }, []);

  const buildLocalSystemPrompt = useCallback(
    (modelId: string, slotIndex: number, responseControl: string) => {
      const personality = SLOT_PERSONALITIES[slotIndex % SLOT_PERSONALITIES.length];
      const effectiveSystemPrompt =
        modelSystemPrompts[modelId] !== undefined ? modelSystemPrompts[modelId] : systemPrompt;

      const systemPromptParts = [effectiveSystemPrompt, personality?.prompt, responseControl].filter(Boolean);
      return systemPromptParts.join("\n\n");
    },
    [modelSystemPrompts, systemPrompt]
  );

  const ensureLocalAgent = useCallback((modelId: string, slotIndex: number, responseControl: string, overrideModelId?: string | null) => {
    const orchestrator = localOrchestratorRef.current;
    if (!orchestrator) return null;

    const personality = SLOT_PERSONALITIES[slotIndex % SLOT_PERSONALITIES.length];
    const alias = personality?.name || `Agent ${slotIndex + 1}`;

    const finalSystemPrompt = buildLocalSystemPrompt(modelId, slotIndex, responseControl);

    // Check if agent exists
    let record = localAgentsRef.current.get(modelId);
    
    let actualModelId = overrideModelId || resolvedLocalModelIdRef.current;
    if ((!actualModelId || actualModelId === "local-model") && localModeConfig.model && localModeConfig.model !== "local-model") {
      actualModelId = localModeConfig.model;
    }

    if (record) {
      try {
        // Update existing agent's system prompt if needed
        const agent = orchestrator.getAgent(record.agentId);
        if (agent.system_prompt !== finalSystemPrompt) {
          agent.system_prompt = finalSystemPrompt;
        }
        if (actualModelId && actualModelId !== "local-model" && agent.model !== actualModelId) {
          agent.model = actualModelId;
        }
        return record;
      } catch (e) {
        // Agent not found in orchestrator (maybe reset?), recreate it
        record = undefined;
      }
    }

    const agent = orchestrator.createAgent({
      alias,
      systemPrompt: finalSystemPrompt,
      params: localModeConfig.defaultParams,
      model: actualModelId || "local-model",
    });

    record = { agentId: agent.agent_id, alias };
    localAgentsRef.current.set(modelId, record);
    return record;
  }, [buildLocalSystemPrompt, localModeConfig.defaultParams, localModeConfig.model]);

  const resetLocalAgents = useCallback(() => {
    const orchestrator = localOrchestratorRef.current;
    if (!orchestrator) return;

    for (const record of localAgentsRef.current.values()) {
      orchestrator.delete(record.agentId);
    }
    localAgentsRef.current.clear();
  }, []);

  const handleLocalModelIdChange = useCallback(
    (nextId: string) => {
      resolvedLocalModelIdRef.current = nextId;
      setResolvedLocalModelId(nextId);
      resetLocalAgents();
    },
    [resetLocalAgents]
  );

  const handleRefreshLocalModelId = useCallback(async () => {
    const nextId = await refreshLocalModels();
    if (!nextId) {
      toast({
        title: "No local models found",
        description: "Load a model in LM Studio, then retry.",
        variant: "destructive",
      });
      return;
    }
    resetLocalAgents();
    toast({
      title: "Local model refreshed",
      description: `Now using: ${nextId}`,
    });
  }, [refreshLocalModels, resetLocalAgents]);

  const [userPersonas, setUserPersonas] = useState<Array<{ label: string; value: string }>>(() => {
    const raw = localStorage.getItem("modelmix-user-personas");
    const parsed = safeJsonParse<unknown>(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => {
        const item = typeof p === "object" && p !== null ? (p as Record<string, unknown>) : {};
        const label = typeof item.label === "string" ? item.label : "";
        const value = typeof item.value === "string" ? item.value : "";
        return { label, value };
      })
      .filter((p) => p.label.trim() && p.value.trim());
  });

  const savedPersonas = useMemo(() => {
    const normalize = (label: string) => label.trim().replace(/\s+/g, " ").toLowerCase();
    const byKey = new Map<string, { label: string; value: string; order: number }>();
    let order = 0;

    for (const p of DEFAULT_STARTER_PROMPTS) {
      const key = normalize(p.label);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, { label: p.label, value: p.value, order: order++ });
    }

    for (const p of userPersonas) {
      const key = normalize(p.label);
      if (!key) continue;
      const existing = byKey.get(key);
      byKey.set(key, { label: p.label, value: p.value, order: existing?.order ?? order++ });
    }

    return Array.from(byKey.values())
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...rest }) => rest);
  }, [userPersonas]);

  const handleSavePersona = useCallback((label: string, value: string) => {
    setUserPersonas(prev => {
      const normalizedLabel = label.trim().replace(/\s+/g, " ");
      const normalizedValue = value.replace(/\r\n/g, "\n").trim();

      if (!normalizedLabel || !normalizedValue) return prev;

      const existingIndex = prev.findIndex(
        (p) => p.label.trim().toLowerCase() === normalizedLabel.toLowerCase()
      );

      const next = [...prev];
      if (existingIndex >= 0) {
        next[existingIndex] = { label: normalizedLabel, value: normalizedValue };
      } else {
        next.push({ label: normalizedLabel, value: normalizedValue });
      }

      const seen = new Set<string>();
      const deduped: Array<{ label: string; value: string }> = [];
      for (let i = next.length - 1; i >= 0; i--) {
        const key = next[i].label.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.unshift({ label: next[i].label.trim().replace(/\s+/g, " "), value: next[i].value });
      }

      deduped.sort((a, b) => a.label.localeCompare(b.label));
      localStorage.setItem("modelmix-user-personas", JSON.stringify(deduped));
      return deduped;
    });
    toast({
      title: "Persona Saved",
      description: `"${label.trim()}" has been saved to your presets.`,
    });
  }, []);

  const handleSystemPromptChange = useCallback((modelId: string, prompt: string) => {
    setModelSystemPrompts(prev => ({
      ...prev,
      [modelId]: prompt
    }));
  }, []);

  const handleActivePersonaLabelChange = useCallback((modelId: string, label: string | null) => {
    setModelPersonaLabels(prev => ({
      ...prev,
      [modelId]: label,
    }));
  }, []);

  const sendToLocalMode = useCallback(
    async (
      modelId: string,
      promptText: string,
      includeImages: boolean,
      currentAttachments: Attachment[],
      roundIndex?: number,
      slotIndex = 0
    ): Promise<ChatResponse> => {
      const startTime = Date.now();

      if (!localModeConfig.isValid) {
        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName: localModeConfig.modelLabel,
          prompt: promptText,
          response: localModeConfig.error || "Local mode configuration is invalid.",
          timestamp: new Date().toISOString(),
          isError: true,
          roundIndex,
        };
      }

      const orchestrator = localOrchestratorRef.current;
      if (!orchestrator) {
        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName: localModeConfig.modelLabel,
          prompt: promptText,
          response: "Local mode is not initialized.",
          timestamp: new Date().toISOString(),
          isError: true,
          roundIndex,
        };
      }

      let activeModelId: string | null =
        resolvedLocalModelIdRef.current && resolvedLocalModelIdRef.current !== "local-model"
          ? resolvedLocalModelIdRef.current
          : localModeConfig.model && localModeConfig.model !== "local-model"
            ? localModeConfig.model
            : null;

      if (!activeModelId) {
        const nextId = await refreshLocalModels();
        if (!nextId) {
          return {
            id: `${modelId}-${Date.now()}`,
            model: modelId,
            modelName: localModeConfig.modelLabel,
            prompt: promptText,
            response: "No local models found. Load a model in LM Studio, then retry.",
            timestamp: new Date().toISOString(),
            isError: true,
            roundIndex,
          };
        }
        activeModelId = nextId;
      }

      const triggered = isSuperSummaryTrigger(promptText);
      const responseControl = buildResponseControlPrompt(triggered);
      const agentRecord = ensureLocalAgent(modelId, slotIndex, responseControl, activeModelId);
      if (!agentRecord) {
        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName: localModeConfig.modelLabel,
          prompt: promptText,
          response: "Unable to create local agent.",
          timestamp: new Date().toISOString(),
          isError: true,
          roundIndex,
        };
      }

      try {
        const messageContent = await buildMessageContent(promptText, includeImages, currentAttachments);
        const messages: LocalMessage[] = [
          {
            role: "user",
            content: messageContent,
          },
        ];

        const activeModelInfo = localModels.find((m) => m.id === activeModelId) || null;
        const maxContextLength = activeModelInfo?.maxContextLength;
        if (maxContextLength) {
          const agent = orchestrator.getAgent(agentRecord.agentId);
          const contentToText = (content: LocalMessage["content"]) => {
            if (typeof content === "string") return content;
            return content
              .map((part) => (part.type === "text" ? part.text : "[image]"))
              .join("\n");
          };

          const messageTokens = (msg: LocalMessage) => {
            if (typeof msg.content === "string") return estimateTokens(msg.content);
            const text = msg.content.filter((p) => p.type === "text").map((p) => p.text).join("\n");
            const imageCount = msg.content.filter((p) => p.type === "image_url").length;
            return estimateTokens(text) + imageCount * 512;
          };

          const userTokens =
            typeof messageContent === "string"
              ? estimateTokens(messageContent)
              : estimateTokens(messageContent.filter((p) => p.type === "text").map((p) => p.text).join("\n")) +
                messageContent.filter((p) => p.type === "image_url").length * 512;
          const systemTokens = estimateTokens(agent.system_prompt || "");

          const computeRemaining = () => {
            const historyTokens = agent.history.reduce((sum, m) => sum + messageTokens(m), 0);
            return maxContextLength - systemTokens - historyTokens - userTokens - 256;
          };

          let remaining = computeRemaining();
          while (remaining < 256 && agent.history.length > 0) {
            agent.history.shift();
            remaining = computeRemaining();
          }

          const clampedRemaining = Math.max(256, Math.min(remaining, maxContextLength));
          agent.params = {
            ...agent.params,
            ...localModeConfig.defaultParams,
            max_tokens: clampedRemaining,
          };
        }

        const result = await orchestrator.send(agentRecord.agentId, messages);
        const latency = Date.now() - startTime;
        const modelName = `${localModeConfig.modelLabel} • ${agentRecord.alias}`;
        const responseText = triggered ? (result.content || "No response received") : coerceOneParagraph(result.content || "No response received");

        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName,
          prompt: promptText,
          response: responseText,
          timestamp: new Date().toISOString(),
          tokenCount: result.usage?.total_tokens,
          latency,
          hasAttachment: includeImages && currentAttachments.length > 0,
          roundIndex,
          agentId: result.agent_id,
        };
      } catch (error) {
        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName: `${localModeConfig.modelLabel} • ${agentRecord.alias}`,
          prompt: promptText,
          response: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
          latency: Date.now() - startTime,
          isError: true,
          roundIndex,
          agentId: agentRecord.agentId,
        };
      }
    },
    [buildMessageContent, ensureLocalAgent, localModeConfig, refreshLocalModels, localModels, isSuperSummaryTrigger, buildResponseControlPrompt, estimateTokens, coerceOneParagraph]
  );

  // Free tier API call using edge function
  const sendToFreeTier = useCallback(
    async (
      modelId: string,
      promptText: string,
      roundIndex?: number,
      slotIndex?: number
    ): Promise<ChatResponse> => {
      const modelName = DEFAULT_MODELS.find(m => m.id === modelId)?.name || modelId;
      const startTime = Date.now();
      const maxTokens = 1024;
      
      // Get personality for this slot (for free tier diversity)
      const personality = slotIndex !== undefined 
        ? SLOT_PERSONALITIES[slotIndex % SLOT_PERSONALITIES.length]
        : undefined;

      try {
        // Get auth token if user is logged in
        let authToken: string | undefined;
        if (user) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data: { session } } = await supabase.auth.getSession();
          authToken = session?.access_token;
        }

        // Get user API keys for BYOK support
        const userApiKeys = getBYOKKeys();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: promptText }],
              model: modelId,
              maxTokens,
              systemPrompt,
              fingerprint: fingerprint,
              sessionId: sessionId,
              previousPrompts: getVisiblePromptsForModel(modelId),
              usageType: "chat",
              slotPersonality: personality?.prompt,
              ...(Object.keys(userApiKeys).length > 0 ? { userApiKeys } : {}),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          
          // Refresh balance to show any refunded credits
          refreshBalance();
          
          if (response.status === 402) {
            // Insufficient credits
            return {
              id: `${modelId}-${Date.now()}`,
              model: modelId,
              modelName,
              prompt: promptText,
              response: `**${errorData.error || 'Insufficient credits'}**\n\n${errorData.message || (user ? 'Purchase more credits or earn credits through referrals.' : 'Sign up to get free credits.')}`,
              timestamp: new Date().toISOString(),
              isError: true,
              roundIndex,
            };
          }
          
          if (response.status === 429) {
            // Rate limited
            return {
              id: `${modelId}-${Date.now()}`,
              model: modelId,
              modelName,
              prompt: promptText,
              response: `**Rate limit reached**\n\nPlease wait a moment before sending another message. Your credits have not been charged.`,
              timestamp: new Date().toISOString(),
              isError: true,
              roundIndex,
            };
          }
          
          // Other errors - credits are automatically refunded
          return {
            id: `${modelId}-${Date.now()}`,
            model: modelId,
            modelName,
            prompt: promptText,
            response: `**Error: ${errorData.error || "AI service error"}**\n\nYour credits have been refunded.`,
            timestamp: new Date().toISOString(),
            isError: true,
            roundIndex,
          };
        }

        // Parse streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let textBuffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            textBuffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.startsWith(":") || line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {
                textBuffer = line + "\n" + textBuffer;
                break;
              }
            }
          }
        }

        // Refresh credit balance after successful response
        refreshBalance();
        
        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName,
          prompt: promptText,
          response: fullResponse || "No response received",
          timestamp: new Date().toISOString(),
          tokenCount: estimateTokens(systemPrompt || "") + estimateTokens(promptText) + estimateTokens(fullResponse || ""),
          latency: Date.now() - startTime,
          roundIndex,
        };
      } catch (error) {
        return {
          id: `${modelId}-${Date.now()}`,
          model: modelId,
          modelName,
          prompt: promptText,
          response: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
          isError: true,
          roundIndex,
        };
      }
    },
    [user, fingerprint, sessionId, getVisiblePromptsForModel, estimateTokens, refreshBalance, systemPrompt]
  );

  const upsertResponseWithTelemetry = useCallback((prev: ChatResponse[], incoming: ChatResponse) => {
    const filtered = prev.filter((r) => !(r.model === incoming.model && r.roundIndex === incoming.roundIndex));

    const tokenCount = typeof incoming.tokenCount === "number" ? incoming.tokenCount : undefined;
    let tokenDelta: number | undefined;
    let cumulativeTokens: number | undefined;

    if (!incoming.isError && tokenCount !== undefined) {
      const prior = filtered
        .filter((r) => r.model === incoming.model && !r.isError && typeof r.tokenCount === "number")
        .sort((a, b) => {
          const aRound = a.roundIndex ?? -1;
          const bRound = b.roundIndex ?? -1;
          if (aRound !== bRound) return aRound - bRound;
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

      const previous = prior.length > 0 ? prior[prior.length - 1] : undefined;
      const previousTokens = typeof previous?.tokenCount === "number" ? previous.tokenCount : undefined;
      tokenDelta = previousTokens !== undefined ? tokenCount - previousTokens : tokenCount;
      cumulativeTokens =
        prior.reduce((sum, r) => sum + (typeof r.tokenCount === "number" ? r.tokenCount : 0), 0) + tokenCount;
    }

    return [
      ...filtered,
      {
        ...incoming,
        tokenDelta,
        cumulativeTokens,
      },
    ];
  }, []);

  // Primary: Lovable AI, Fallback: BYOK for unsupported models
  const sendToModel = useCallback(
    async (
      modelId: string, 
      promptText: string, 
      includeImages: boolean, 
      currentAttachments: Attachment[],
      conversationHistory?: Array<{ role: string; content: string }>,
      roundIndex?: number,
      slotIndex?: number
    ): Promise<ChatResponse> => {
      const model = getModel(modelId) || { id: modelId, name: modelId };
      const startTime = Date.now();

      if (isLocalMode) {
        return sendToLocalMode(
          modelId,
          promptText,
          includeImages,
          currentAttachments,
          roundIndex,
          slotIndex ?? 0
        );
      }

      // Check if model is in the default/recommended list
      const defaultModel = DEFAULT_MODELS.find(m => m.id === modelId);
      if (defaultModel) {
        return sendToFreeTier(modelId, promptText, roundIndex, slotIndex);
      }
      
      // BYOK fallback: use OpenRouter if user has API key
      if (apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
          const messageContent = await buildMessageContent(promptText, includeImages, currentAttachments);
          
          const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
          
          if (systemPrompt.trim()) {
            messages.push({ role: "system", content: systemPrompt });
          }
          
          if (conversationHistory) {
            messages.push(...conversationHistory);
          }
          
          messages.push({ role: "user", content: messageContent });
          
          const bodyString = JSON.stringify({ model: modelId, messages });
          const encoder = new TextEncoder();
          const bodyBytes = encoder.encode(bodyString);
          
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json; charset=utf-8",
              "HTTP-Referer": window.location.origin,
              "X-Title": "ModelMix",
            },
            body: bodyBytes,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error?.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          const latency = Date.now() - startTime;

          if (data.error) {
            throw new Error(data.error.message || "API Error");
          }

          // Record successful BYOK usage for learning
          recordModelResult(modelId, true);
          
          // Log BYOK telemetry (non-blocking)
          const tokenCount = data.usage?.total_tokens || 0;
          try {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-action`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                actionType: 'byok_usage',
                sessionId: sessionId,
                fingerprint: user?.id || fingerprint,
                metadata: {
                  model_id: modelId,
                  prompt_tokens: data.usage?.prompt_tokens || 0,
                  completion_tokens: data.usage?.completion_tokens || 0,
                  total_tokens: tokenCount,
                  latency,
                  context_id: contextId,
                  is_byok: true,
                }
              })
            }).catch(() => void 0);
          } catch {
            void 0;
          }

          return {
            id: `${modelId}-${Date.now()}`,
            model: modelId,
            modelName: model.name,
            prompt: promptText,
            response: data.choices?.[0]?.message?.content || "No response received",
            timestamp: new Date().toISOString(),
            tokenCount,
            latency,
            hasAttachment: includeImages && currentAttachments.length > 0,
            roundIndex,
          };
        } catch (error) {
          clearTimeout(timeoutId);
          recordModelResult(modelId, false);
          
          let errorMessage = "Unknown error";
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              errorMessage = "Request timed out after 2 minutes";
            } else {
              errorMessage = error.message;
            }
          }

          return {
            id: `${modelId}-${Date.now()}`,
            model: modelId,
            modelName: model.name,
            prompt: promptText,
            response: `Error: ${errorMessage}`,
            timestamp: new Date().toISOString(),
            latency: Date.now() - startTime,
            isError: true,
            roundIndex,
          };
        }
      }
        
      // No BYOK key and model not in default list
      return {
        id: `${modelId}-${Date.now()}`,
        model: modelId,
        modelName: model.name,
        prompt: promptText,
        response: "**Model not available**\n\nThis model requires an API key (OpenAI, Anthropic, Google, or OpenRouter). Add your key in Settings or choose a model from the recommended list.",
        timestamp: new Date().toISOString(),
        isError: true,
        roundIndex,
      };
    },
    [apiKey, getModel, sendToFreeTier, systemPrompt, buildMessageContent, recordModelResult, isLocalMode, localModeConfig.model, sendToLocalMode, contextId, fingerprint, sessionId, user]
  );

  const retryModel = useCallback(async (modelId: string) => {
    const lastResponse = responses.find(r => r.model === modelId);
    if (!lastResponse) return;

    const slotIndex = selectedModels.findIndex(id => id === modelId);
    setLoading((prev) => ({ ...prev, [modelId]: true }));
    
    const canHandleImages = supportsVision(modelId);
    const responseBase = await sendToModel(
      modelId,
      lastResponse.prompt,
      canHandleImages,
      [],
      undefined,
      lastResponse.roundIndex,
      slotIndex === -1 ? undefined : slotIndex
    );
    const response: ChatResponse = {
      ...responseBase,
      personaName: modelPersonaLabels[modelId] ?? undefined,
    };
    
    setResponses((prev) => upsertResponseWithTelemetry(prev, response));
    setLoading((prev) => ({ ...prev, [modelId]: false }));
    
    if (response.isError) {
      toast({ title: "Retry failed", description: response.response, variant: "destructive" });
    } else {
      toast({ title: `${response.modelName} response received` });
    }
  }, [responses, sendToModel, supportsVision, selectedModels, modelPersonaLabels, upsertResponseWithTelemetry]);

  // Auto-swap failed model with a working alternative
  const swapFailedModel = useCallback((failedModelId: string, slotIndex: number) => {
    if (isLocalMode) return null;
    const currentlyUsed = selectedModels.slice(0, panelCount);
    const allFailed = [...failedModels, failedModelId];
    
    // Find a replacement from TOP_10 that's not already in use and hasn't failed
    const replacement = TOP_10_MODELS.find(
      m => !currentlyUsed.includes(m) && !allFailed.includes(m)
    ) || DEFAULT_MODELS.find(
      m => !currentlyUsed.includes(m.id) && !allFailed.includes(m.id)
    )?.id;
    
    if (replacement) {
      // Mark the failed model
      setFailedModels(prev => new Set([...prev, failedModelId]));
      
      // Swap in the replacement
      setSelectedModels(prev => {
        const updated = [...prev];
        updated[slotIndex] = replacement;
        return updated;
      });
      
      const failedName = failedModelId.split("/")[1] || failedModelId;
      const replacementName = replacement.split("/")[1] || replacement;
      
      toast({
        title: `⚠️ Model Swapped`,
        description: `${failedName} failed and was replaced with ${replacementName}`,
        variant: "destructive",
      });
      
      return replacement;
    }
    
    return null;
  }, [selectedModels, panelCount, failedModels, isLocalMode]);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    // Check question limit for anonymous users
    if (hasReachedQuestionLimit) {
      toast({ 
        title: "Free question used!", 
        description: "Sign up to unlock more comparisons and features.",
        duration: 5000,
      });
      navigate("/auth?tab=signup&reason=limit");
      return;
    }

    if (!sessionTitle) {
      setSessionTitle(generateSessionTitle(prompt));
      setSessionStartTime(new Date().toISOString());
    }

    // Increment questions used for anonymous users
    if (userTier === "anonymous") {
      setQuestionsUsed(prev => prev + 1);
    }

    const roundIndex = prompts.length;
    setPrompts(prev => [...prev, prompt]);
    setPromptMeta((prev) => [...prev, { visibility: "public" }]);

    const activeModels = selectedModels.slice(0, panelCount);
    const loadingState: Record<string, boolean> = {};
    activeModels.forEach((m) => (loadingState[m] = true));
    setLoading(loadingState);

    // Lightbox disabled for better UX
    // setShowRoutingLightbox(true);

    // Clear any existing responses for this round (shouldn't exist, but be safe)
    setResponses((prev) =>
      prev.filter((r) => r.roundIndex !== roundIndex || !activeModels.includes(r.model))
    );

    if (attachments.length > 0 && unsupportedVisionModels.length > 0) {
      toast({
        title: "Some models don't support images",
        description: `${unsupportedVisionModels.join(", ")} will receive text only.`,
        variant: "default",
      });
    }

    const swappedModels: string[] = [];
    const personaLabelSnapshot = { ...modelPersonaLabels };
    
    const results = await Promise.all(
      activeModels.map(async (modelId, slotIndex) => {
        const canHandleImages = supportsVision(modelId);
        const responseBase = await sendToModel(modelId, prompt, canHandleImages, attachments, undefined, roundIndex, slotIndex);
        const response: ChatResponse = {
          ...responseBase,
          personaName: personaLabelSnapshot[modelId] ?? undefined,
        };
        
        // If model failed with a critical error, try to swap it
        if (response.isError && !response.response.includes("Insufficient credits")) {
          const replacement = swapFailedModel(modelId, slotIndex);
          
          if (replacement) {
            swappedModels.push(modelId);
            // Try the replacement model
            setLoading((prev) => ({ ...prev, [replacement]: true }));
            const retryResponseBase = await sendToModel(replacement, prompt, supportsVision(replacement), attachments, undefined, roundIndex);
            const retryResponse: ChatResponse = {
              ...retryResponseBase,
              personaName: personaLabelSnapshot[replacement] ?? undefined,
            };
            setLoading((prev) => ({ ...prev, [replacement]: false }));
            
            // Record health stats for replacement
            recordModelResult(replacement, !retryResponse.isError);
            
            // Update responses with the new model's response
            setResponses((prev) => upsertResponseWithTelemetry(prev, retryResponse));
            
            return retryResponse;
          }
        }
        
        // Record health stats
        recordModelResult(modelId, !response.isError);
        
        // Only filter out responses for this model AND this round, preserving history
        setResponses((prev) => upsertResponseWithTelemetry(prev, response));
        setLoading((prev) => ({ ...prev, [modelId]: false }));
        return response;
      })
    );

    setAttachments([]);
    
    const successCount = results.filter(r => !r.isError).length;
    const errorCount = results.filter(r => r.isError).length;
    
    if (swappedModels.length > 0) {
      toast({ 
        title: `${swappedModels.length} model(s) auto-replaced`,
        description: `Failed models were swapped with alternatives`,
        variant: "default"
      });
    } else if (errorCount === 0) {
      toast({ title: `All ${successCount} responses received` });
    } else if (successCount === 0) {
      toast({ title: "All requests failed", variant: "destructive" });
    } else {
      toast({ 
        title: `${successCount} succeeded, ${errorCount} failed`,
        description: "Click retry on failed panels",
        variant: "default"
      });
    }
  };

  const handleFollowUp = async (
    message: string,
    followUpAttachments: Attachment[],
    mentionedModelIds: string[],
    mode: ReplyMode
  ) => {
    const activeModels = selectedModels.slice(0, panelCount);
    
    const hasMentions = mentionedModelIds.length > 0;
    const isMentionReplyOnly = mode === "mentioned-only" || mode === "private-mentioned";
    const isPrivate = mode === "private-mentioned" && hasMentions;

    const targetModels =
      hasMentions && isMentionReplyOnly
        ? activeModels.filter((m) => mentionedModelIds.includes(m))
        : activeModels;

    const loadingState: Record<string, boolean> = {};
    targetModels.forEach((m) => (loadingState[m] = true));
    setLoading(loadingState);

    const roundIndex = prompts.length;
    setPrompts((prev) => [...prev, message]);
    setPromptMeta((prev) => [
      ...prev,
      isPrivate ? { visibility: "mentioned", visibleToModelIds: mentionedModelIds } : { visibility: "public" },
    ]);

    const followUpUnsupported = getUnsupportedVisionModels(followUpAttachments);
    if (followUpAttachments.length > 0 && followUpUnsupported.length > 0) {
      toast({
        title: "Some models don't support images",
        description: `${followUpUnsupported.join(", ")} will receive text only.`,
        variant: "default",
      });
    }

    const swappedModels: string[] = [];
    const personaLabelSnapshot = { ...modelPersonaLabels };
    
    const promises = targetModels.map(async (modelId, idx) => {
      const slotIndex = activeModels.indexOf(modelId);
      const canHandleImages = supportsVision(modelId);

      // Always include history for follow-ups
      const conversationHistory: Array<{ role: string; content: string }> = [];

      // Get this model's previous responses in order
      const modelResponses = responses
        .filter((r) => r.model === modelId && !r.isError)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Build conversation history from prompts and responses
      prompts.forEach((p, idx) => {
        if (!canModelReadRound(modelId, idx)) return;
        conversationHistory.push({ role: "user", content: p });
        const response = modelResponses.find((r) => r.roundIndex === idx);
        if (response) conversationHistory.push({ role: "assistant", content: response.response });
      });

      // Build cross-model context: what other models said in recent rounds
      const otherModelResponses = responses
        .filter((r) => r.model !== modelId && !r.isError)
        .filter((r) => canModelReadResponse(modelId, r))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Group other model responses by round for context
      const crossModelContext: string[] = [];
      const recentRounds = [...new Set(otherModelResponses.map(r => r.roundIndex))].slice(-3); // Last 3 rounds
      
      recentRounds.forEach(rndIdx => {
        const roundResponses = otherModelResponses.filter(r => r.roundIndex === rndIdx);
        if (roundResponses.length > 0) {
          const roundSummary = roundResponses
            .map(r => `**${r.modelName}**: ${r.response.slice(0, 500)}${r.response.length > 500 ? '...' : ''}`)
            .join('\n\n');
          crossModelContext.push(`[Round ${(rndIdx ?? 0) + 1} - Other models' responses]\n${roundSummary}`);
        }
      });

      // Add context prefix with cross-model responses if this model was mentioned or if there are other responses
      let messageWithContext = message;
      
      if (crossModelContext.length > 0) {
        messageWithContext = `[Context: Here's what other models said in previous rounds for reference]\n\n${crossModelContext.join('\n\n---\n\n')}\n\n---\n\n[User's new message]:\n${message}`;
      }
      
      if (mentionedModelIds.includes(modelId)) {
        messageWithContext = `[The user is specifically addressing you]\n\n${messageWithContext}`;
      }

      const responseBaseRaw = await sendToModel(
        modelId,
        messageWithContext,
        canHandleImages,
        followUpAttachments,
        conversationHistory.length > 0 ? conversationHistory : undefined,
        roundIndex,
        slotIndex === -1 ? undefined : slotIndex
      );
      const responseBase: ChatResponse = {
        ...responseBaseRaw,
        personaName: personaLabelSnapshot[modelId] ?? undefined,
      };
      const response = isPrivate
        ? { ...responseBase, visibility: "mentioned" as const, visibleToModelIds: mentionedModelIds }
        : responseBase;
      
      // If model failed with a critical error, try to swap it
      if (response.isError && !response.response.includes("Insufficient credits") && slotIndex !== -1) {
        const replacement = swapFailedModel(modelId, slotIndex);
        
        if (replacement) {
          swappedModels.push(modelId);
          // Try the replacement model
          setLoading((prev) => ({ ...prev, [replacement]: true }));
          const retryResponseRaw = await sendToModel(
            replacement, 
            messageWithContext, 
            supportsVision(replacement), 
            followUpAttachments, 
            conversationHistory.length > 0 ? conversationHistory : undefined,
            roundIndex,
            slotIndex === -1 ? undefined : slotIndex
          );
          const retryResponse: ChatResponse = {
            ...retryResponseRaw,
            personaName: personaLabelSnapshot[replacement] ?? undefined,
          };
          const retryResponseWithVisibility = isPrivate
            ? { ...retryResponse, visibility: "mentioned" as const, visibleToModelIds: mentionedModelIds }
            : retryResponse;
          setLoading((prev) => ({ ...prev, [replacement]: false }));
          
          // Record health stats for replacement
          recordModelResult(replacement, !retryResponse.isError);
          
          setResponses((prev) => upsertResponseWithTelemetry(prev, retryResponseWithVisibility));
          
          return retryResponseWithVisibility;
        }
      }
      
      // Record health stats
      recordModelResult(modelId, !response.isError);
      
      // Only filter out responses for this model AND this round, preserving history
      setResponses((prev) => upsertResponseWithTelemetry(prev, response));
      setLoading((prev) => ({ ...prev, [modelId]: false }));
      return response;
    });

    const results = await Promise.all(promises);
    const errorCount = results.filter(r => r.isError).length;
    
    if (swappedModels.length > 0) {
      toast({ 
        title: `${swappedModels.length} model(s) auto-replaced`,
        description: `Failed models were swapped with alternatives`,
        variant: "default"
      });
    } else if (targetModels.length < activeModels.length) {
      toast({ title: `${targetModels.length} mentioned model(s) replied` });
    } else if (errorCount > 0) {
      toast({ 
        title: `${results.length - errorCount} succeeded, ${errorCount} failed`,
        description: "Click retry on failed panels",
        variant: "default"
      });
    } else {
      toast({ title: "All responses received!" });
    }
  };

  const saveToHistory = useCallback(async () => {
    if (!prompt.trim() || responses.length === 0) return;
    
    const sessionData = {
      prompt,
      responses,
      selectedModels: selectedModels.slice(0, panelCount),
      panelCount,
      prompts,
      promptMeta,
      modelSystemPrompts,
      modelPersonaLabels,
    };
    
    await saveConversation(
      prompt,
      selectedModels.slice(0, panelCount),
      responses.length,
      sessionData
    );
  }, [prompt, responses, selectedModels, panelCount, prompts, promptMeta, modelSystemPrompts, modelPersonaLabels, saveConversation]);

  const handleNewConversation = async () => {
    if (conversationStarted && responses.length > 0) {
      await saveToHistory();
    }
    
    // Generate new session ID for fresh tracking
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    setPrompt("");
    setResponses([]);
    setAttachments([]);
    setConversationStarted(false);
    setSessionTitle("");
    setSessionStartTime("");
    setSessionId(newSessionId);
    setPrompts([]);
    setPromptMeta([]);
    setResponseDepths({});
    setCurrentViewRound("all");
    setModelSystemPrompts({});
    setModelPersonaLabels({});
    setPanelCount(2);
    if (isLocalMode) {
      resetLocalAgents();
      setSelectedModels(localDefaultModelIds);
    } else {
      setSelectedModels(INITIAL_MODEL_IDS);
    }
    setThreadModel(null);
    setExpandedPanelId(null);
    setGlobalDepth("basic");
    setFailedModels(new Set());
    
    toast({ title: "New conversation started" });
  };

  const handleClearSession = () => {
    handleNewConversation();
  };

  const handleLoadConversation = async (id: string) => {
    const data = await loadConversation(id);
    if (!data) {
      toast({ title: "Conversation not found", variant: "destructive" });
      return;
    }
    
    try {
      setPrompt(data.prompt || "");
      setResponses(data.responses || []);
      setPanelCount(data.panelCount || 2);
      if (data.selectedModels) {
        setSelectedModels(data.selectedModels);
      }
      if (data.prompts) {
        setPrompts(data.prompts);
      }
      if (data.promptMeta) {
        const nextPrompts: unknown = data.prompts;
        const promptCount = Array.isArray(nextPrompts) ? nextPrompts.length : 0;
        const rawMeta: unknown = data.promptMeta;
        const normalized = Array.isArray(rawMeta)
          ? rawMeta.map((m) => {
              const meta = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
              const visibility = meta.visibility === "mentioned" ? "mentioned" : "public";
              const visibleToModelIds = Array.isArray(meta.visibleToModelIds)
                ? meta.visibleToModelIds.filter((id: unknown): id is string => typeof id === "string")
                : undefined;
              return visibility === "mentioned" ? { visibility, visibleToModelIds } : { visibility };
            })
          : [];
        while (normalized.length < promptCount) normalized.push({ visibility: "public" });
        setPromptMeta(normalized.slice(0, promptCount));
      } else if (data.prompts) {
        setPromptMeta(Array.from({ length: data.prompts.length }, () => ({ visibility: "public" as const })));
      } else {
        setPromptMeta([]);
      }
      setModelSystemPrompts(
        data.modelSystemPrompts && typeof data.modelSystemPrompts === "object"
          ? Object.fromEntries(
              Object.entries(data.modelSystemPrompts as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
              )
            )
          : {}
      );
      setModelPersonaLabels(
        data.modelPersonaLabels && typeof data.modelPersonaLabels === "object"
          ? Object.fromEntries(
              Object.entries(data.modelPersonaLabels as Record<string, unknown>).filter(
                (entry): entry is [string, string | null] =>
                  typeof entry[0] === "string" && (typeof entry[1] === "string" || entry[1] === null)
              )
            )
          : {}
      );
      setConversationStarted(true);
      setResponseDepths({});
      setCurrentViewRound("all");
      toast({ title: "Conversation loaded" });
    } catch {
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
  };

  const handleClearAllHistory = async () => {
    await clearAllHistory();
  };

  const handleOpenModelInfo = (modelId: string) => {
    const model = getModel(modelId);
    if (model) {
      setModelInfoModal(model);
    }
  };

  const panelMaxHeight = useMemo(() => {
    const baseHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    return Math.max(200, Math.floor((baseHeight - 300) / Math.min(panelCount, 2)));
  }, [panelCount]);

  // Get responses for current view (filtered by round if selected)
  const getVisibleResponses = () => {
    if (currentViewRound === "all") {
      // Show latest response per model
      const activeModels = selectedModels.slice(0, panelCount);
      return activeModels.map(modelId => {
        return responses
          .filter(r => r.model === modelId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      }).filter(Boolean);
    }
    // Show responses for specific round
    return responses.filter(r => r.roundIndex === currentViewRound);
  };

  // Calculate grid columns based on global depth
  const getGridCols = () => {
    if (globalDepth === "basic") {
      if (panelCount <= 2) return "grid-cols-1 md:grid-cols-2";
      if (panelCount <= 4) return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    }
    // detailed
    if (panelCount <= 2) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2";
  };

  

  return (
    <SidebarProvider>
      <AppSidebar
        conversations={conversationHistory}
        onLoadConversation={handleLoadConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearHistory={handleClearAllHistory}
        onNewChat={handleNewConversation}
        onOpenSettings={() => setShowSettings(true)}
      />
      
      <div className={`flex flex-col w-full min-h-screen bg-background transition-all duration-300 ease-in-out ${conversationStarted ? "pb-44" : ""}`}>
        {/* Dev Banner */}
        <DevBanner />
        
        {/* Feedback Widget */}
        <FeedbackWidget />
        
        {/* Privacy Banner */}
        <PrivacyBanner />

        {/* Minimal Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Sidebar Trigger + Logo */}
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <Logo size="md" showText showTagline={!conversationStarted} />
                  {isLocalMode && (
                    <Badge variant="secondary" className="text-xs">
                      Local Mode
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right: Minimal Actions */}
              <div className="flex items-center gap-2">
                {/* Credits badge - always show for managed version */}
                {!isLocalMode && (
                  <Badge variant="outline" className="text-primary border-primary/30 hidden sm:flex">
                    <Coins className="h-3 w-3 mr-1" />
                    {balance}
                  </Badge>
                )}
                
                {/* Account Switcher - for testers to toggle between accounts */}
                {!isLocalMode && user && (
                  <TesterAccountSwitcher
                    currentEmail={user.email}
                    isTester={isTester}
                    onSwitch={() => navigate("/tester-access")}
                  />
                )}
                
                {/* Auth button - only if not logged in */}
                {!isLocalMode && !user && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => navigate("/tester-access")}
                    className="h-8"
                  >
                    Sign In
                  </Button>
                )}

                {/* New Session button - always visible */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewConversation}
                  className="h-8 gap-1.5"
                  title="Start new session"
                >
                  <FilePlus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                </Button>

                {/* Settings button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="h-8 w-8"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>

                {/* Export controls - only when active */}
                {conversationStarted && (
                  <ExportDialog 
                    sessionTitle={sessionTitle}
                    sessionStartTime={sessionStartTime}
                    originalPrompt={prompt}
                    responses={responses.filter(r => selectedModels.slice(0, panelCount).includes(r.model))}
                    prompts={prompts}
                    disabled={responses.length === 0}
                    iconOnly
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Round Navigator */}
        {conversationStarted && rounds.length > 1 && (
          <RoundNavigator
            rounds={rounds}
            currentRound={currentViewRound}
            onSelectRound={setCurrentViewRound}
            onOpenTimeline={() => setShowTimeline(true)}
            failedModelsCount={failedModels.size}
            onClearFailedModels={clearFailedModels}
          />
        )}

        <main className="container mx-auto px-4">
        {/* Hero / Initial Prompt - Clean, focused first impression */}
        {!conversationStarted && (
          <div className="max-w-3xl mx-auto pt-4 pb-8 md:pt-10 md:pb-12">
            {/* Centered prompt area */}
            <div className="space-y-4">
              
              {/* Prompt suggestions - moved above */}
              <PromptSuggestions onSelectPrompt={setPrompt} />

              <div className="relative group">
                <Textarea
                  placeholder="What would you like to explore?"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[140px] text-base resize-none rounded-xl border-border bg-card shadow-sm focus:shadow-md transition-shadow pb-12"
                />
                
                {/* Inline Controls */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <AttachmentInput
                    attachments={attachments}
                    onAttach={handleAttach}
                    onRemove={handleRemoveAttachment}
                    unsupportedModels={unsupportedVisionModels}
                    onSwapModel={handleSwapModelForVision}
                    onRemoveModelSlot={handleRemoveModelSlot}
                    buttonVariant="ghost"
                    buttonSize="icon"
                  />
                  <PromptCache
                    currentPrompt={prompt}
                    onSelectPrompt={handleSelectCachedPrompt}
                    cachedPrompts={cachedPrompts}
                    onSavePrompt={handleSavePrompt}
                    onDeletePrompt={handleDeleteCachedPrompt}
                    onToggleFavorite={handleTogglePromptFavorite}
                  />
                  <PromptTemplates
                    onSelectPrompt={setPrompt}
                    isPremiumUser={!!user}
                    onTrackUsage={(templateId, category) => {
                      trackTemplateUsage(templateId, category, false);
                    }}
                  />
                </div>
              </div>

              {/* Model count + CTA row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                {/* Model count selector - cleaner language */}
                <div className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm text-muted-foreground">Compare</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPanelCount(Math.max(1, panelCount - 1))}
                      disabled={panelCount <= 1}
                      className="h-7 w-7"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center font-medium text-foreground">{panelCount}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (panelCount >= maxPanels) {
                          const tierMessages: Record<string, string> = {
                            anonymous: "Sign up to unlock more comparison panels!",
                            authenticated: "Upgrade to tester or add API key for more panels.",
                            tester: "You have access to all 6 panels.",
                            byok: "Maximum 10 models allowed.",
                          };
                          toast({
                            title: "Panel limit reached",
                            description: isLocalMode ? "Local mode is limited to 6 panels." : tierMessages[userTier],
                          });
                          if (!isLocalMode && userTier === "anonymous") {
                            navigate("/auth?tab=signup&reason=panels");
                          }
                          return;
                        }
                        const newPanelCount = Math.min(maxPanels, panelCount + 1);
                        if (newPanelCount > panelCount && !selectedModels[panelCount]) {
                          const newModel = isLocalMode
                            ? `${localModeConfig.model}::agent-${panelCount + 1}`
                            : TOP_10_MODELS[panelCount % TOP_10_MODELS.length];
                          setSelectedModels(prev => {
                            const updated = [...prev];
                            updated[panelCount] = newModel;
                            return updated;
                          });
                        }
                        setPanelCount(newPanelCount);
                      }}
                      disabled={panelCount >= maxPanels}
                      className="h-7 w-7"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">models</span>
                </div>
                
                {/* Free trial indicator for anonymous users */}
                {userTier === "anonymous" && !isLocalMode && !hasReachedQuestionLimit && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="h-3 w-3 mr-1" />
                    1 Free Question
                  </Badge>
                )}

                {/* Sign up prompt when limit reached */}
                {hasReachedQuestionLimit && (
                  <Button 
                    variant="default"
                    size="lg"
                    onClick={() => navigate("/auth?tab=signup")}
                    className="px-6"
                  >
                    Sign Up for More
                  </Button>
                )}

                {/* Primary CTA */}
                {!hasReachedQuestionLimit && (
                  <Button 
                    onClick={handleSubmit} 
                    size="lg"
                    className="px-8 shadow-sm hover:shadow-md transition-shadow"
                    disabled={!prompt.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {userTier === "anonymous" && questionsUsed === 0 ? "Try Free" : "Run Models"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Response Section */}
        {conversationStarted && (
          <div className="mb-6">
            {/* Session Title - Editable */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                {isEditingTitle ? (
                  <Input
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setIsEditingTitle(false);
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="text-xl font-semibold h-auto py-0 px-1 border-0 border-b-2 border-primary rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none"
                  />
                ) : (
                  <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setIsEditingTitle(true)}
                    title="Click to edit title"
                  >
                    <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {sessionTitle || "Untitled Session"}
                    </h2>
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              {sessionStartTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  Started {new Date(sessionStartTime).toLocaleString()}
                </p>
              )}
            </div>
            
            {/* Response Header with Controls */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Responses</span>
                <span className="text-sm text-muted-foreground">
                  {currentViewRound === "all" 
                    ? responses.filter(r => !r.isError && r.roundIndex === prompts.length - 1).length
                    : responses.filter(r => !r.isError && r.roundIndex === currentViewRound).length
                  } of {panelCount} received
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Deep Research Button */}
                <DeepResearchButton
                  prompt={prompts[prompts.length - 1] || ""}
                  apiKey={apiKey}
                  onComplete={(synthesis) => {
                    // Add the synthesis as a special response
                    const synthesisResponse: ChatResponse = {
                      id: `deep-research-${Date.now()}`,
                      model: "deep-research",
                      modelName: "Deep Research (Multi-Model Synthesis)",
                      prompt: prompts[prompts.length - 1] || "",
                      response: synthesis,
                      timestamp: new Date().toISOString(),
                      roundIndex: prompts.length - 1,
                    };
                    setResponses(prev => [...prev, synthesisResponse]);
                    toast({
                      title: "Deep Research Complete",
                      description: "Multi-model synthesis has been added to your responses.",
                    });
                  }}
                  disabled={!conversationStarted || prompts.length === 0}
                />

                {/* Window Management Menu - replaces inline depth controls */}
                <WindowManagementMenu
                  globalDepth={globalDepth}
                  onDepthChange={setAllDepths}
                  compareMode={compareMode}
                  onToggleCompareMode={toggleCompareMode}
                  panelCount={panelCount}
                />

                {/* Panel Count Controls */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-border">
                  <span className="text-sm text-muted-foreground hidden sm:inline">Panels:</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPanelCount(Math.max(1, panelCount - 1))}
                    disabled={panelCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-medium text-sm">{panelCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newPanelCount = Math.min(10, panelCount + 1);
                      if (newPanelCount > panelCount && !selectedModels[panelCount]) {
                        const currentModels = selectedModels.slice(0, panelCount);
                        const randomModel = getRandomTopModel(currentModels);
                        setSelectedModels(prev => {
                          const updated = [...prev];
                          updated[panelCount] = randomModel;
                          return updated;
                        });
                      }
                      setPanelCount(newPanelCount);
                    }}
                    disabled={panelCount >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Panels Grid */}
        <div className={`grid gap-4 ${getGridCols()}`}>
          {Array.from({ length: panelCount }).map((_, index) => {
            const modelId = selectedModels[index];
            const visibleResponses = getVisibleResponses();
            const response = currentViewRound === "all"
              ? responses.find((r) => r.model === modelId && r.roundIndex === prompts.length - 1) 
                || responses.filter(r => r.model === modelId).sort((a, b) => 
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )[0]
              : responses.find((r) => r.model === modelId && r.roundIndex === currentViewRound);
            const isLoadingModel = loading[modelId];
            const model = getModel(modelId);
            const depth = responseDepths[modelId] || globalDepth;
            const localAlias = SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.name || `Agent ${index + 1}`;
            const displayName = isLocalMode
              ? `${localModeConfig.modelLabel} • ${localAlias}`
              : model?.name || modelId;

            return (
              <div 
                key={`panel-${index}`} 
                id={`chat-panel-${index}`}
                className="transition-all duration-200"
              >
                <ChatPanel
                  modelId={modelId}
                  modelName={displayName}
                  response={response}
                  isLoading={isLoadingModel}
                  isLocked={conversationStarted || isLocalMode}
                  isFreeTier={!tierConfig.canAccessAllModels && !isLocalMode}
                  isAnonymous={userTier === "anonymous" && !isLocalMode}
                  panelIndex={index}
                  isInvalid={failedModels.has(modelId)}
                  reliabilityPercent={getModelReliability(modelId)}
                  supportsVision={supportsVision(modelId)}
                  responseDepth={depth}
                  onDepthChange={(d) => handleDepthChange(modelId, d)}
                  onOpenLightbox={() => response && setLightboxResponse(response)}
                  onOpenThread={() => setThreadModel({ id: modelId, name: model?.name || modelId })}
                  onModelChange={(newModel) => handleModelChange(index, newModel)}
                  onInfoClick={() => handleOpenModelInfo(modelId)}
                  onRetry={() => retryModel(modelId)}
                  onRemove={() => handleRemoveModelSlot(modelId)}
                  availableModels={availableModels}
                  groupedModels={groupedModels}
                  maxHeight={panelMaxHeight}
                  hasMultipleTurns={prompts.length > 1}
                  systemPrompt={modelSystemPrompts[modelId]}
                  onSystemPromptChange={(prompt) => handleSystemPromptChange(modelId, prompt)}
                  activePersonaLabel={modelPersonaLabels[modelId] ?? null}
                  onActivePersonaLabelChange={(label) => handleActivePersonaLabelChange(modelId, label)}
                  customName={customModelNames[modelId]}
                  onRename={(newName) => handleRenameModelSlot(modelId, newName)}
                  savedPersonas={savedPersonas}
                  onSavePersona={handleSavePersona}
                />
              </div>
            );
          })}
        </div>
      </main>

      {/* Reply Panel - Only shown after conversation starts */}
      {conversationStarted && (
        <ReplyPanel
          onSend={handleFollowUp}
          isLoading={isAnyLoading}
          unsupportedModels={unsupportedVisionModels}
          availableModels={selectedModels.slice(0, panelCount).map((id, index) => ({
            id,
            name: isLocalMode
              ? `${localModeConfig.modelLabel} • ${customModelNames[id] || modelPersonaLabels[id] || SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.name || `Agent ${index + 1}`}`
              : getModel(id)?.name || id.split("/")[1] || id,
          }))}
          onDeepResearchClick={() => setShowDeepResearch(true)}
          onSwapModel={handleSwapModelForVision}
          onRemoveModelSlot={handleRemoveModelSlot}
        />
      )}
      
      {/* Deep Research Dialog (triggered from FollowUpShortcuts) */}
      {conversationStarted && (
        <DeepResearchButton
          prompt={prompts[prompts.length - 1] || ""}
          apiKey={apiKey}
          isOpen={showDeepResearch}
          onOpenChange={setShowDeepResearch}
          isLocalMode={isLocalMode}
          localModelId={resolvedLocalModelId}
          localBaseUrl={localModeConfig.baseUrl}
          modelSystemPrompts={modelSystemPrompts}
          onComplete={(synthesis) => {
            const synthesisResponse: ChatResponse = {
              id: `deep-research-${Date.now()}`,
              model: "deep-research",
              modelName: "Deep Research (Multi-Model Synthesis)",
              prompt: prompts[prompts.length - 1] || "",
              response: synthesis,
              timestamp: new Date().toISOString(),
              roundIndex: prompts.length - 1,
            };
            setResponses(prev => [...prev, synthesisResponse]);
            toast({
              title: "Deep Research Complete",
              description: "Multi-model synthesis has been added to your responses.",
            });
            setShowDeepResearch(false);
          }}
        />
      )}

      {/* Lightbox */}
      <ResponseLightbox
        response={lightboxResponse}
        onClose={() => setLightboxResponse(null)}
      />

      {/* Model Info Modal */}
      <ModelInfoModal
        model={modelInfoModal}
        isOpen={!!modelInfoModal}
        onClose={() => setModelInfoModal(null)}
      />

      {/* Model Thread View */}
      {threadModel && (
        <ModelThreadView
          isOpen={!!threadModel}
          onClose={() => setThreadModel(null)}
          modelId={threadModel.id}
          modelName={threadModel.name}
          responses={responses}
          prompts={prompts}
        />
      )}

      {/* Model Picker Modal */}
      <ModelPickerModal
        isOpen={showModelPicker}
        onClose={() => {
          setShowModelPicker(false);
          // Show tour for new users after closing model picker
          if (!hasSeenTour) {
            setTimeout(() => startTour(), 300);
          }
        }}
        models={models}
        selectedModels={selectedModels}
        panelCount={panelCount}
        maxPanels={maxPanels}
        userTier={userTier}
        availableModelIds={availableModels.map(m => m.id)}
        onSelectModel={handleModelPickerSelect}
        onPanelCountChange={(count) => {
          if (count > panelCount) {
            const currentModels = selectedModels.slice(0, panelCount);
            setSelectedModels(prev => {
              const updated = [...prev];
              for (let i = panelCount; i < count; i++) {
                if (!updated[i]) {
                  if (isLocalMode) {
                    updated[i] = `${localModeConfig.model}::agent-${i + 1}`;
                  } else {
                    const usedModels = updated.slice(0, i);
                    const available = TOP_10_MODELS.filter(m => !usedModels.includes(m));
                    updated[i] = available.length > 0 
                      ? available[Math.floor(Math.random() * available.length)]
                      : TOP_10_MODELS[Math.floor(Math.random() * TOP_10_MODELS.length)];
                  }
                }
              }
              return updated;
            });
          }
          setPanelCount(count);
        }}
      />

      {/* Conversation Timeline */}
      <ConversationTimeline
        isOpen={showTimeline}
        onClose={() => setShowTimeline(false)}
        prompts={prompts}
        responses={responses}
        sessionTitle={sessionTitle}
        sessionStartTime={sessionStartTime}
      />

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour onComplete={completeTour} onSkip={skipTour} />
      )}

      {/* Routing Intelligence Lightbox - Educational content during loading */}
      <RoutingIntelligenceLightbox
        isOpen={showRoutingLightbox}
        onClose={() => setShowRoutingLightbox(false)}
        contextId={contextId}
        fingerprint={fingerprint}
      />

      {/* Context ID Footer - Removed as requested */}
      
      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        balance={balance}
        isRegistered={isRegistered}
        referralCode={referralCode}
        getReferralLink={getReferralLink}
        refreshBalance={refreshBalance}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        user={user}
        onSignOut={signOut}
        isAdmin={isAdmin}
        isLocalMode={isLocalMode}
        onNavigateAdmin={() => navigate("/admin")}
        modelHealth={modelHealth}
        failedModels={failedModels}
        onClearHealth={clearModelHealth}
        onClearFailed={clearFailedModels}
        onSwapRecommended={handleSwapRecommended}
        localModelId={resolvedLocalModelId}
        onLocalModelIdChange={handleLocalModelIdChange}
        onRefreshLocalModelId={handleRefreshLocalModelId}
        localModels={localModels}
      />
    </div>
    </SidebarProvider>
  );
};

export default ModelMix;
