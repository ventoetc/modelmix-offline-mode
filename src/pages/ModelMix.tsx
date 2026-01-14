import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn, generateUUID } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Plus, Minus, RefreshCw, 
  Sparkles, Zap, AlignLeft, FileText,
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
import { useDeliberation } from "@/hooks/useDeliberation";
import { DeliberationView } from "@/components/DeliberationView";
import { 
  getExecutionMode,
  getLocalModeConfig,
  fetchLocalModelCatalog,
  LocalModeOrchestrator,
  LocalOpenAICompatibleProvider,
  type LocalContentPart,
  type LocalMessage,
  type LocalModelInfo,
  type AgentIdentity
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

// Example personas that are read-only
const EXAMPLE_PERSONAS = [
  { 
    id: "persona-analyst", 
    name: "Analyst", 
    prompt: "You are a precise data analyst. Focus on facts, statistics, and logical deductions. Avoid flowery language. Structure your responses with clear headings and bullet points.",
    isReadOnly: true 
  },
  { 
    id: "persona-creative", 
    name: "Creative Writer", 
    prompt: "You are a creative writer. Use evocative language, metaphors, and storytelling techniques. Engage the user's imagination.",
    isReadOnly: true 
  },
  { 
    id: "persona-coder", 
    name: "Senior Engineer", 
    prompt: "You are a senior software engineer. Focus on clean, efficient, and maintainable code. Explain your architectural decisions and best practices. Always include error handling.",
    isReadOnly: true 
  },
  { 
    id: "persona-teacher", 
    name: "Tutor", 
    prompt: "You are a patient and encouraging tutor. Explain complex concepts in simple terms. Use analogies and examples. Check for understanding.",
    isReadOnly: true 
  }
];

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


const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
  const [orchestrator, setOrchestrator] = useState<LocalModeOrchestrator | null>(null);
  
  const { 
    state: deliberationState, 
    startDeliberation, 
    stopDeliberation, 
    isDeliberating,
    engine: deliberationEngine,
  } = useDeliberation(orchestrator);

  const deliberationAgents = useMemo(() => deliberationState?.agents || [], [deliberationState]);

  const [isDeliberationModeEnabled, setIsDeliberationModeEnabled] = useState(false);
  const lastProcessedDeliberationId = useRef<string | null>(null);



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
    } catch (error) {
      if (error instanceof Error && error.message.includes("Failed to connect")) {
        // Only show toast if we haven't shown it recently to avoid spamming
        const lastToast = sessionStorage.getItem("last_connection_toast");
        const now = Date.now();
        if (!lastToast || now - parseInt(lastToast) > 10000) {
          toast({
            title: "Local Server Unavailable",
            description: error.message,
            variant: "destructive",
          });
          sessionStorage.setItem("last_connection_toast", now.toString());
        }
      }
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
        return Array.isArray(session.selectedModels) ? session.selectedModels : INITIAL_MODEL_IDS;
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
  const [savedPersonas, setSavedPersonas] = useState<Array<{ id: string; name: string; prompt: string; isReadOnly?: boolean }>>(() => {
    const saved = safeJsonParse<Array<{ id: string; name: string; prompt: string }>>(
      localStorage.getItem("modelmix-saved-personas"), 
      []
    );
    // Combine saved personas with example personas
    // We filter out any saved personas that might duplicate example IDs (though unlikely with UUIDs)
    const exampleIds = new Set(EXAMPLE_PERSONAS.map(p => p.id));
    const filteredSaved = saved.filter(p => !exampleIds.has(p.id));
    return [...EXAMPLE_PERSONAS, ...filteredSaved];
  });

  const handleSavePersona = useCallback((name: string, prompt: string) => {
    if (!name.trim() || !prompt.trim()) return;
    const newPersona = { id: generateUUID(), name: name.trim(), prompt: prompt.trim() };
    setSavedPersonas(prev => {
      // Don't save example personas to local storage, only user created ones
      const next = [...prev, newPersona];
      const userCreated = next.filter(p => !p.isReadOnly);
      localStorage.setItem("modelmix-saved-personas", JSON.stringify(userCreated));
      return next;
    });
    toast({ title: "Persona Saved", description: `Saved "${name}" to your library.` });
  }, []);

  const handleDeletePersona = useCallback((id: string) => {
    // Prevent deleting read-only personas
    if (EXAMPLE_PERSONAS.some(p => p.id === id)) {
      toast({ title: "Cannot Delete", description: "This is a system preset.", variant: "destructive" });
      return;
    }

    setSavedPersonas(prev => {
      const next = prev.filter(p => p.id !== id);
      const userCreated = next.filter(p => !p.isReadOnly);
      localStorage.setItem("modelmix-saved-personas", JSON.stringify(userCreated));
      return next;
    });
    toast({ title: "Persona Deleted", description: "Removed from your library." });
  }, []);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isAnyLoading, setIsAnyLoading] = useState(false);

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
    return safeJsonParse(localStorage.getItem("arena-model-health"), {});
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
    return safeJsonParse(localStorage.getItem("arena-cached-prompts"), []);
  });
  
  // Model info modal state
  const [modelInfoModal, setModelInfoModal] = useState<OpenRouterModel | null>(null);
  
  // Model picker modal state - DISABLED (new tier-based flow)
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Handle Deliberation Completion
  useEffect(() => {
    if (deliberationState?.status === "completed" && deliberationState.id !== lastProcessedDeliberationId.current) {
      lastProcessedDeliberationId.current = deliberationState.id;
      
      // Get the last message or consensus
      // For now, let's use the last message from the last round as the "result"
      // Ideally, we should have a specific consensus field
      const rounds = deliberationState.rounds || [];
      const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : undefined;
      const lastMessage = lastRound?.messages && lastRound.messages.length > 0
        ? lastRound.messages[lastRound.messages.length - 1]
        : undefined;
      
      if (lastMessage) {
        const resultText = `**Deliberation Result:**\n\n${lastMessage.content}`;
        
        // Add to main chat
        const resultResponse: ChatResponse = {
          id: `deliberation-${deliberationState.id}`,
          model: "deliberation-engine",
          modelName: "Deliberation Consensus",
          prompt: deliberationState.task,
          response: resultText,
          timestamp: new Date().toISOString(),
          roundIndex: prompts.length // New round
        };

        // If this was the first interaction, we need to set the prompt too
        if (!conversationStarted) {
           setPrompts([deliberationState.task]);
           setResponses([resultResponse]);
           setConversationStarted(true);
        } else {
           setPrompts(prev => [...prev, deliberationState.task]); // Or just append response to current?
           // Actually, if we are in the middle of a convo, we might want to just append the response
           // But 'responses' array usually matches 'prompts' array by index for rounds.
           // So we should add a prompt entry too.
           setResponses(prev => [...prev, resultResponse]);
        }
        
        toast({
          title: "Deliberation Completed",
          description: "Consensus result has been added to the chat.",
        });

        setIsDeliberationModeEnabled(false);
      }
    }
  }, [deliberationState, conversationStarted, prompts.length]);
  
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
      setOrchestrator(localOrchestratorRef.current);
      localAgentsRef.current.clear();
    } catch (error) {
      localOrchestratorRef.current = null;
      setOrchestrator(null);
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
    () => (isLocalMode ? [localModelDefinition] : (openRouterModels || [])),
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
    () => (isLocalMode ? localGroupedModels : (openRouterGroupedModels || [])),
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

  const remainingQuestions = tierConfig.maxQuestions - questionsUsed;

  // Handle panel changes
  const handleModelChange = useCallback((index: number, modelId: string) => {
    setSelectedModels((prev) => {
      const next = [...prev];
      next[index] = modelId;
      return next;
    });
  }, []);

  const handleSystemPromptChange = useCallback((modelId: string, prompt: string) => {
    setModelSystemPrompts((prev) => {
      const next = { ...prev, [modelId]: prompt };
      localStorage.setItem("modelmix-model-system-prompts", JSON.stringify(next));
      
      // Also update session storage
      const session = safeJsonParse<Record<string, unknown>>(
        localStorage.getItem(SESSION_STORAGE_KEY), 
        {}
      );
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        ...session,
        modelSystemPrompts: next
      }));
      
      return next;
    });
  }, [SESSION_STORAGE_KEY]);

  const handleActivePersonaLabelChange = useCallback((modelId: string, label: string | null) => {
    setModelPersonaLabels((prev) => {
      const next = { ...prev, [modelId]: label };
      localStorage.setItem("modelmix-model-persona-labels", JSON.stringify(next));
      
      // Also update session storage
      const session = safeJsonParse<Record<string, unknown>>(
        localStorage.getItem(SESSION_STORAGE_KEY),
        {}
      );
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        ...session,
        modelPersonaLabels: next
      }));
      
      return next;
    });
  }, [SESSION_STORAGE_KEY]);

  // Handle message submission
  const handleSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const text = overridePrompt || prompt;
    if (!text.trim() || isAnyLoading) return;
    
    // Check tier limits
    if (questionsUsed >= tierConfig.maxQuestions) {
      toast({
        title: "Limit Reached",
        description: "You have reached the question limit for your tier. Please sign in for more.",
        variant: "destructive",
      });
      return;
    }
    
    // Increment usage
    setQuestionsUsed(prev => {
      const next = prev + 1;
      localStorage.setItem("modelmix-questions-used", next.toString());
      return next;
    });

    setConversationStarted(true);
    setPrompt("");
    setAttachments([]);
    
    // Create new round
    const newRoundIndex = prompts.length;
    setPrompts(prev => [...prev, text]);
    
    // Track usage
    trackTemplateUsage("chat_message", "general");

    // Initialize loading state
    const newLoading: Record<string, boolean> = {};
    const activeModelIds = selectedModels.slice(0, panelCount);
    activeModelIds.forEach(id => {
      newLoading[id] = true;
    });
    setLoading(newLoading);
    setIsAnyLoading(true);

    // Prepare requests
    const history = responses.map(r => ({
      role: r.model === "user" ? "user" : "assistant",
      content: r.response,
    }));

    // Execute requests
    try {
      if (isLocalMode) {
        // Local mode (offline-first) - never fall back to cloud
        if (!localOrchestratorRef.current) {
          // Orchestrator not initialized - show error
          const errorMessage = !localModeConfig.isValid
            ? localModeConfig.error || "Local mode configuration is invalid."
            : "Local mode is not initialized. Please ensure your local AI server is running.";

          toast({
            title: "Local Mode Error",
            description: errorMessage,
            variant: "destructive",
          });

          const errorResponses: ChatResponse[] = activeModelIds.map(modelId => ({
            id: generateUUID(),
            model: modelId,
            modelName: localModeConfig.modelLabel,
            prompt: text,
            response: `**Local Mode Error**\n\n${errorMessage}\n\nPlease check:\n- Your local AI server (e.g., LMStudio) is running\n- The server is accessible at ${localModeConfig.baseUrl}\n- A model is loaded in your local server`,
            timestamp: new Date().toISOString(),
            roundIndex: newRoundIndex,
            isError: true,
          }));

          setResponses(prev => [...prev, ...errorResponses]);
          return;
        }

        // Local mode execution
        const requests = activeModelIds.map(async (modelId, index) => {
          try {
            const personaName = modelPersonaLabels[modelId] || SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.name || `Agent ${index + 1}`;
            const system = modelSystemPrompts[modelId] || 
              (isSuperSummaryTrigger(text) 
                ? buildResponseControlPrompt(true) 
                : `${SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.prompt || "You are a helpful assistant."} ${buildResponseControlPrompt(false)}`);
            
            // Build conversation history for this model
            const messages: LocalMessage[] = [
              { role: "system", content: system },
              ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
              { role: "user", content: text }
            ];

            const response = await localOrchestratorRef.current!.chat(
              messages,
              {
                temperature: 0.7,
                maxTokens: 4096,
              },
              (chunk) => {
                // Streaming not implemented in UI yet, but supported by orchestrator
              }
            );

            return {
              modelId,
              content: response.content,
              success: true
            };
          } catch (err) {
            console.error(`Error for ${modelId}:`, err);
            return {
              modelId,
              content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
              success: false
            };
          }
        });

        const results = await Promise.all(requests);
        
        const newResponses: ChatResponse[] = results.map(r => ({
          id: generateUUID(),
          model: r.modelId,
          modelName: isLocalMode ? r.modelId : getModel(r.modelId)?.name || r.modelId,
          prompt: text,
          response: r.content,
          timestamp: new Date().toISOString(),
          roundIndex: newRoundIndex,
        }));

        setResponses(prev => [...prev, ...newResponses]);
      } else {
        // Cloud/Remote mode execution using Supabase Edge Functions
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        const requests = activeModelIds.map(async (modelId, index) => {
          try {
            const personaName = modelPersonaLabels[modelId] || SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.name || `Agent ${index + 1}`;
            const systemPrompt = modelSystemPrompts[modelId] ||
              (isSuperSummaryTrigger(text)
                ? buildResponseControlPrompt(true)
                : `${SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.prompt || "You are a helpful assistant."} ${buildResponseControlPrompt(false)}`);

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                  messages: [
                    ...history.map(h => ({ role: h.role, content: h.content })),
                    { role: "user", content: text }
                  ],
                  model: modelId,
                  maxTokens: 4096,
                  systemPrompt,
                  fingerprint: await generateFingerprint(),
                  sessionId: contextId || "anonymous",
                  usageType: "chat",
                  slotPersonality: SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.prompt,
                  userApiKeys: getBYOKKeys(),
                }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
              refreshBalance();

              let errorMessage = errorData.error || "Unknown error";
              if (response.status === 402) {
                errorMessage = `**Insufficient credits**\n\n${errorData.message || 'Purchase more credits or earn credits through referrals.'}`;
              } else if (response.status === 429) {
                errorMessage = `**Rate limit reached**\n\nPlease wait a moment before sending another message.`;
              }

              return {
                modelId,
                content: errorMessage,
                success: false
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

            refreshBalance();

            return {
              modelId,
              content: fullResponse || "No response received",
              success: true
            };
          } catch (err) {
            console.error(`Error for ${modelId}:`, err);
            return {
              modelId,
              content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
              success: false
            };
          }
        });

        const results = await Promise.all(requests);

        const newResponses: ChatResponse[] = results.map(r => ({
          id: generateUUID(),
          model: r.modelId,
          modelName: getModel(r.modelId)?.name || r.modelId,
          prompt: text,
          response: r.content,
          timestamp: new Date().toISOString(),
          roundIndex: newRoundIndex,
          isError: !r.success,
        }));

        setResponses(prev => [...prev, ...newResponses]);
      }
    } catch (error) {
      console.error("Global error:", error);
    } finally {
      setLoading({});
      setIsAnyLoading(false);
    }
  };

  const getModelReliability = useCallback((modelId: string) => {
    const health = modelHealth[modelId];
    if (!health || (health.success + health.failure === 0)) return 100;
    return Math.round((health.success / (health.success + health.failure)) * 100);
  }, [modelHealth]);

  const handleDepthChange = useCallback((modelId: string, depth: ResponseDepth) => {
    setResponseDepths(prev => ({ ...prev, [modelId]: depth }));
  }, []);

  const handleOpenModelInfo = useCallback((modelId: string) => {
    const model = getModel(modelId);
    if (model) setModelInfoModal(model);
  }, [getModel]);

  const retryModel = useCallback(async (modelId: string) => {
    const lastPrompt = prompts[prompts.length - 1];
    if (!lastPrompt) return;
    // Retry by re-submitting the last prompt (simplified)
    handleSubmit(undefined, lastPrompt);
  }, [prompts, handleSubmit]);

  const handleRemoveModelSlot = useCallback((modelId: string) => {
    if (panelCount <= 1) {
      toast({ title: "Cannot remove", description: "You must have at least one model.", variant: "destructive" });
      return;
    }
    
    const index = selectedModels.indexOf(modelId);
    if (index === -1) return;

    if (index < panelCount) {
      setPanelCount(prev => prev - 1);
      setSelectedModels(prev => {
        const next = [...prev];
        next.splice(index, 1);
        next.push(INITIAL_MODEL_IDS[0]); 
        return next;
      });
    }
  }, [panelCount, selectedModels, INITIAL_MODEL_IDS]);

  const handleSwapModelForVision = useCallback((modelId: string) => {
    const visionModel = models.find(m => supportsVision(m.id))?.id;
    if (visionModel) {
      const index = selectedModels.indexOf(modelId);
      if (index !== -1) {
          handleModelChange(index, visionModel);
          toast({ title: "Swapped Model", description: `Switched to ${visionModel} for image support.` });
      }
    } else {
      toast({ title: "No Vision Model", description: "No vision-capable models available.", variant: "destructive" });
    }
  }, [models, supportsVision, selectedModels, handleModelChange]);

  const handleFollowUp = useCallback((text: string, files: Attachment[]) => {
    setAttachments(files);
    handleSubmit(undefined, text);
  }, [handleSubmit]);

  const handleDeliberationInput = useCallback((text: string, files: Attachment[]) => {
    // Fallback to normal submit if deliberation logic is missing
    setAttachments(files);
    handleSubmit(undefined, text);
  }, [handleSubmit]);

  const unsupportedVisionModels = useMemo(() => {
    if (attachments.length === 0) return [];
    const hasImage = attachments.some(a => a.type.startsWith('image/'));
    if (!hasImage) return [];
    
    return selectedModels.slice(0, panelCount).filter(id => !supportsVision(id));
  }, [attachments, selectedModels, panelCount, supportsVision]);

  // Helper to determine grid columns based on panel count
  const getGridCols = useCallback(() => {
    if (panelCount === 1) return "grid-cols-1";
    if (panelCount === 2) return "grid-cols-1 lg:grid-cols-2";
    if (panelCount === 3) return "grid-cols-1 lg:grid-cols-3";
    if (panelCount === 4) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  }, [panelCount]);

  // Compatibility variables for ChatPanel
  const availableModels = models || [];
  const panelMaxHeight = undefined;

  // I need to return the JSX
  return (
    <SidebarProvider>
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b shrink-0 z-10 bg-background/80 backdrop-blur-sm">
           {/* ... Header content ... */}
           <div className="flex items-center gap-2">
             <SidebarTrigger />
             <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <Input
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    onBlur={() => {
                      setIsEditingTitle(false);
                      // Save title
                      const session = safeJsonParse<Record<string, unknown>>(localStorage.getItem(SESSION_STORAGE_KEY), {});
                      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, sessionTitle }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingTitle(false);
                         const session = safeJsonParse<Record<string, unknown>>(localStorage.getItem(SESSION_STORAGE_KEY), {});
                         localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, sessionTitle }));
                      }
                    }}
                    className="h-8 w-48"
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="text-lg font-semibold truncate max-w-[200px] cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                    onClick={() => setIsEditingTitle(true)}
                    title="Click to edit title"
                  >
                    {sessionTitle || "New Session"}
                  </h1>
                )}
             </div>
           </div>
           
           <div className="flex items-center gap-2">
              {/* ... Right side controls ... */}

              {/* Deliberation Mode Toggle (Local Mode Only) */}
              {isLocalMode && orchestrator && (
                <Button
                  variant={isDeliberationModeEnabled ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (isDeliberationModeEnabled) {
                      stopDeliberation();
                      setIsDeliberationModeEnabled(false);
                      toast({
                        title: "Deliberation Mode Disabled",
                        description: "Returning to normal chat mode",
                      });
                    } else {
                      setIsDeliberationModeEnabled(true);

                      // Auto-start with predefined personas
                      const personas = [
                        { title: "Planner", prompt: "You are a Planner. Break down tasks into steps and coordinate discussion. Keep responses under 150 tokens." },
                        { title: "Critic", prompt: "You are a Critic. Identify flaws, risks, and edge cases. Keep responses under 150 tokens." },
                        { title: "Synthesizer", prompt: "You are a Synthesizer. Integrate viewpoints and propose consolidated solutions. Keep responses under 150 tokens." }
                      ];

                      const activeModels = selectedModels.slice(0, Math.min(panelCount, 3));
                      const configs = activeModels.map((modelId, idx) => {
                        const persona = personas[idx % personas.length];
                        return {
                          personaId: persona.title.toLowerCase(),
                          personaTitle: persona.title,
                          systemPrompt: persona.prompt,
                          modelId: resolvedLocalModelId || "local-model",
                          params: {
                            max_tokens: 150,
                            temperature: 0.7
                          }
                        };
                      });

                      startDeliberation(
                        prompt || "Discuss and reach consensus on the task",
                        configs
                      );

                      toast({
                        title: "Deliberation Mode Activated",
                        description: "Multi-agent discussion started",
                      });
                    }
                  }}
                  className="h-8 gap-1.5"
                  title="Toggle Deliberation Mode - Multi-agent consensus building"
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Deliberation</span>
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings className="h-5 w-5" />
              </Button>
           </div>
        </header>

        {/* Main Content Area */}
        {isDeliberationModeEnabled ? (
          <div className="flex-1 h-full py-4 px-4 overflow-hidden">
            <DeliberationView
              state={deliberationState}
              onPause={() => deliberationEngine?.pause()}
              onResume={() => deliberationEngine?.resume()}
              onStop={() => {
                stopDeliberation();
                setIsDeliberationModeEnabled(false);
                toast({
                  title: "Deliberation Stopped",
                  description: "Returning to normal chat mode",
                });
              }}
              onAdvance={() => deliberationEngine?.advanceRound()}
            />
          </div>
        ) : (
          <>
        {/* Chat Panels Grid */}
        <div className={`grid gap-4 ${getGridCols()}`}>
          {Array.from({ length: panelCount }).map((_, index) => {
            const modelId = selectedModels[index];
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
            
            // CHANGED: Removed prefix
            const displayName = isLocalMode
              ? localAlias
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
                  savedPersonas={savedPersonas}
                  onSavePersona={handleSavePersona}
                  onDeletePersona={handleDeletePersona}
                />
              </div>
            );
          })}
        </div>
        
        {/* ... */}
        
        {/* Reply Panel */}
        {(conversationStarted || isDeliberationModeEnabled) && (
        <ReplyPanel
          onSend={isDeliberationModeEnabled ? handleDeliberationInput : handleFollowUp}
          isLoading={isAnyLoading}
          unsupportedModels={unsupportedVisionModels}
          availableModels={selectedModels.slice(0, panelCount).map((id, index) => ({
            id,
            // CHANGED: Removed prefix
            name: isLocalMode
              ? modelPersonaLabels[id] || SLOT_PERSONALITIES[index % SLOT_PERSONALITIES.length]?.name || `Agent ${index + 1}`
              : getModel(id)?.name || id.split("/")[1] || id,
          }))}
          onDeepResearchClick={() => setShowDeepResearch(true)}
          onSwapModel={handleSwapModelForVision}
          onRemoveModelSlot={handleRemoveModelSlot}
          agents={isDeliberationModeEnabled ? deliberationAgents : undefined}
        />
      )}
      </>
        )}

      {/* Settings Modal */}
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
        onNavigateAdmin={() => navigate('/admin')}
        modelHealth={modelHealth}
        failedModels={failedModels}
        onClearHealth={() => {
          setModelHealth({});
          localStorage.removeItem("arena-model-health");
          toast({ title: "Health stats cleared" });
        }}
        onClearFailed={() => {
          setFailedModels(new Set());
          toast({ title: "Failed models list cleared" });
        }}
        localModelId={resolvedLocalModelId}
        onLocalModelIdChange={(nextId) => {
          setResolvedLocalModelId(nextId);
          resolvedLocalModelIdRef.current = nextId;
          const key = "modelmix-local-mode";
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem(key, JSON.stringify({ ...parsed, model: nextId }));
        }}
        onRefreshLocalModelId={refreshLocalModels}
        localModels={localModels}
        onToggleMode={() => {
          const newMode = isLocalMode ? "cloud" : "local";
          const confirmation = confirm(
            isLocalMode
              ? "Switch to Cloud Mode? This will require an internet connection and use cloud-based AI models."
              : "Switch to Local Mode? This requires a running local AI server (e.g., LMStudio) and will work offline."
          );
          if (confirmation) {
            // Store mode preference
            localStorage.setItem("modelmix-execution-mode", newMode);
            toast({
              title: `Switching to ${newMode === "local" ? "Local" : "Cloud"} Mode`,
              description: "Reloading the page...",
            });
            // Reload to apply the mode change
            setTimeout(() => window.location.reload(), 1000);
          }
        }}
      />
      </main>
    </div>
    </SidebarProvider>
  );
};

export default ModelMix;