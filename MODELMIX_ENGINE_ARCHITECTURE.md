# ModelMix Engine Architecture Analysis

**Generated:** 2026-01-21
**Purpose:** Extract engine-level contracts, invariants, and integration surfaces for SaaS migration

---

## 1. Engine Entry Point

**Primary Entry Point:** `DeliberationEngine` class

**File:** `src/lib/localMode/deliberationEngine.ts:12-32`

**Signature:**
```typescript
class DeliberationEngine {
  constructor(
    sessionId: string,      // External session identifier
    task: string,           // User's deliberation task/question
    agents: AgentConfig[],  // Array of agent configurations
    maxRounds: number = 6   // Maximum deliberation rounds (minimum 6)
  )
}
```

**Inputs:**
- `sessionId`: String identifier linking deliberation to a user session
- `task`: The prompt or question agents will deliberate on
- `agents`: Array of `AgentConfig` objects containing:
  - `agentId`: Unique agent identifier
  - `personaId`: Short label (e.g., "Planner")
  - `modelId`: Model identifier (e.g., "qwen2.5-32b")
  - `provider`: Provider name (e.g., "lmstudio")
  - `systemPrompt?`: Optional system instructions
  - `params?`: Optional sampling parameters (temperature, max_tokens, etc.)
- `maxRounds`: Number of deliberation rounds (enforced minimum: 6)

**Outputs:**
- Returns a `Deliberation` object via `getState()` containing:
  - Complete deliberation state
  - All rounds and messages
  - Current status and round number
  - Optional consensus result

**Canonical Entry Pattern:**
The engine is typically instantiated through the `useDeliberation` React hook (`src/hooks/useDeliberation.ts:25-80`), which:
1. Creates agents via `LocalModeOrchestrator.createAgent()`
2. Instantiates `DeliberationEngine` with session-unique ID
3. Creates `DeliberationRunner` to manage execution loop
4. Subscribes to state updates via pub/sub pattern
5. Calls `engine.start()` and `runner.startLoop()`

---

## 2. Execution Lifecycle

**State Machine:** `idle → running → (paused) → completed/stopped`

**Lifecycle Stages:**

1. **Initialization**
   - Engine constructed with task and agent configurations
   - Status set to `idle`
   - Empty rounds array initialized

2. **Start** (`engine.start()`)
   - Validate status is `idle` (throws if not)
   - Transition to `running`
   - Create first round (`Round` object with `roundNumber: 1`, `status: "active"`)

3. **Round Execution Loop** (`DeliberationRunner.runStep()`)
   - Check engine status (skip if paused/stopped)
   - Identify agents who haven't spoken in current round
   - **Parallel agent execution:**
     - Build context for each agent via `buildContextForAgent()` (privacy-filtered messages)
     - Convert to `LocalMessage[]` format
     - Inject system prompt + deliberation instructions
     - Call `orchestrator.send(agentId, messages)`
     - Add response to engine via `addMessage()`
   - When all agents have spoken, advance to next round

4. **Round Advancement** (`engine.advanceRound()`)
   - Mark current round as `"completed"`
   - If `currentRound < maxRounds`: create new round
   - If `currentRound >= maxRounds`: set status to `"completed"`
   - Notify subscribers

5. **Stopping Conditions**
   - **Manual stop:** User calls `stopDeliberation()` → `engine.stop()` → status = `"stopped"`
   - **Completion:** After `maxRounds` rounds completed → status = `"completed"`
   - **Error:** Agent execution errors captured as private messages to agent

6. **State Management**
   - Engine uses pub/sub pattern (subscriber list at `:188-200`)
   - UI subscribes via `engine.subscribe(setState)`
   - Every state mutation calls `notify()` to update subscribers

7. **Message Privacy** (enforced in `buildContextForAgent()`)
   - **Broadcast messages:** Visible to all participating agents
   - **Private messages:** Only visible to target agent (`toAgentId`)
   - **Self messages:** Agents always see their own messages

---

## 3. Session Schema

```typescript
// Core deliberation session object
interface Deliberation {
  id: string;                        // Unique deliberation ID (UUID)
  sessionId: string;                 // External session identifier
  task: string;                      // Original user task/question
  agents: AgentConfig[];             // Agent configurations (ESSENTIAL for replay)
  maxRounds: number;                 // Maximum rounds (INPUT, minimum 6)
  currentRound: number;              // Current round number (DERIVED, 0-indexed)
  status: DeliberationStatus;        // State: idle|running|paused|completed|stopped (DERIVED)
  rounds: Round[];                   // Array of round objects (DERIVED)
  consensus?: ConsensusResult;       // Optional final consensus (DERIVED)
  createdAt: number;                 // Creation timestamp (INPUT)
}

// Individual round
interface Round {
  roundNumber: number;               // 1-indexed round number
  messages: ChatMessage[];           // Messages in this round
  status: "active" | "completed";    // Round lifecycle status
  summary?: string;                  // Optional round summary
}

// Message in conversation
interface ChatMessage {
  id: string;                        // Unique message ID (UUID)
  deliberationId?: string;           // Parent deliberation ID
  sessionId: string;                 // Session identifier
  role: "user" | "agent" | "system"; // Message source type
  visibility: "broadcast" | "private"; // Privacy level
  toAgentId?: string;                // Target agent (for private messages)
  fromAgentId?: string;              // Source agent (for agent messages)
  personaId?: string;                // Denormalized persona label
  content: string;                   // Message content
  createdAt: number;                 // Timestamp
  meta?: {
    modelId?: string;                // Model that generated this
    provider?: string;               // Provider used
    round?: number;                  // Round number
  };
}

// Agent configuration (essential for replay)
interface AgentConfig {
  agentId: string;                   // Runtime-assigned agent ID
  personaId: string;                 // Persona label (e.g., "Planner")
  personaTitle?: string;             // Optional full title
  modelId: string;                   // Model identifier
  provider: string;                  // Provider name
  systemPrompt?: string;             // Custom system instructions
  params?: LocalSamplingParams;      // Sampling configuration
}

// Consensus result (if implemented)
interface ConsensusResult {
  content: string;                   // Final consensus text
  confidence?: number;               // Confidence score
  reachedAt: number;                 // Timestamp
}

// Sampling parameters
interface LocalSamplingParams {
  temperature?: number;              // Randomness (0-2)
  top_p?: number;                    // Nucleus sampling
  max_tokens?: number;               // Token limit per response
  presence_penalty?: number;         // Repetition penalty
  frequency_penalty?: number;        // Frequency penalty
  seed?: number;                     // Reproducibility seed
  stop?: string | string[];          // Stop sequences
}
```

**Fields Essential for Replay:**
- `task`: Original prompt
- `agents`: Complete agent configurations including system prompts and params
- `rounds[].messages`: All messages with visibility and metadata
- `maxRounds`: Stopping condition
- `sessionId`: External linkage

**Fields Derived During Execution:**
- `status`, `currentRound`: State machine position
- `rounds[].status`: Round lifecycle
- `consensus`: Computed result

---

## 4. Provider Abstraction

**Abstraction Boundary:** `LocalProvider` interface (`src/lib/localMode/types.ts:48-53`)

```typescript
interface LocalProvider {
  createAgent(config: LocalAgentConfig): LocalAgent;
  send(agent: LocalAgent, messages: LocalMessage[]): Promise<LocalSendResult>;
  reset(agent: LocalAgent): void;
  delete(agent: LocalAgent): void;
}
```

**Concrete Implementation:** `LocalOpenAICompatibleProvider` (`src/lib/localMode/provider.ts:15-141`)

### Provider Registration
- Provider instantiated with options:
  ```typescript
  new LocalOpenAICompatibleProvider({
    baseUrl: string,      // LM Studio URL (default: http://127.0.0.1:1234)
    model: string,        // Model ID or "local-model" for auto-detect
    allowRemote?: boolean // Security flag (default: false)
  })
  ```
- **Security constraint:** Localhost-only unless `allowRemote: true`
- Validation at construction time (`:20-26`)

### Interface Contract

**`createAgent()`**
- Input: `LocalAgentConfig` (alias, systemPrompt, params, model)
- Output: `LocalAgent` with unique `agent_id` (UUID)
- Side effect: Initializes empty message history

**`send()`**
- Input: `LocalAgent`, `LocalMessage[]`
- Process:
  1. Build payload: system prompt + history + new messages
  2. Resolve model ID (auto-detect if `"local-model"`)
  3. POST to `/v1/chat/completions` (OpenAI-compatible)
  4. Extract response content and usage stats
  5. Append to agent history (stateful)
- Output: `LocalSendResult` (agent_id, content, usage, raw)
- **Error handling:** Throws on HTTP errors with parsed error message

**`reset()`** / **`delete()`**
- Clears agent history
- No API calls (local state only)

### Model Discovery
- **Auto-detection** via `resolveModelId()` (`:43-71`)
- Tries endpoints in order:
  1. `/v1/models` (OpenAI standard)
  2. `/models` (fallback)
- Extracts first available model from response
- Caches resolved model ID

### Streaming and Retries
- **No streaming support:** `stream: false` hardcoded (`:104`)
- **No retry logic:** Single attempt per request
- **Error handling:** Throws immediately on fetch failure

### Provider Isolation
- **Orchestrator layer:** `LocalModeOrchestrator` (`src/lib/localMode/orchestrator.ts`) wraps provider
- Maintains agent registry (`Map<string, LocalAgent>`)
- Provides parallel/sequential execution patterns
- Agent lifecycle management (create, reset, delete)

**Summary:**
The provider abstraction is clean and minimal. It assumes:
- OpenAI-compatible HTTP API
- Synchronous (non-streaming) responses
- No built-in retry/resilience
- Stateful agent history management

---

## 5. Budget, Cost, and Limits

### Engine-Level Limits

**1. Max Rounds** (`src/lib/localMode/deliberationEngine.ts:19-26`)
- **Location:** Constructor parameter, enforced at initialization
- **Default:** 6 rounds
- **Enforcement:** `Math.max(maxRounds, 6)` - hard minimum of 6 rounds
- **Type:** Mandatory stopping condition
- **When enforced:** Deliberation completes when `currentRound >= maxRounds`

**2. Max Tokens Per Response** (`src/hooks/useDeliberation.ts:42`)
- **Location:** Agent creation in `useDeliberation` hook
- **Default:** 150 tokens
- **Enforcement:** Passed to provider via `params.max_tokens`
- **Type:** Advisory (depends on provider honoring the parameter)
- **Rationale:** Keep deliberation responses concise

**3. Token Counting** (`src/lib/localMode/types.ts:40-44`)
- **Location:** `LocalSendResult.usage` field
- **Data:** `prompt_tokens`, `completion_tokens`, `total_tokens`
- **Source:** Returned by local LLM provider (LM Studio)
- **Type:** Informational (not enforced)

### Cloud Mode Limits (for comparison)

**4. Credit System** (`src/hooks/useCredits.ts`)
- **Location:** Edge function `/functions/v1/credits`
- **Balance tracking:** `user_credits` table
- **Token conversion:** `tokensPerCredit` (default: 1000 tokens/credit)
- **Initial credits:**
  - Anonymous: 100 credits
  - Authenticated: 500 credits
- **Enforcement:** Pre-request credit holds (not implemented in local mode)

**5. Deep Research Daily Limits** (`src/hooks/useDeepResearchLimit.ts:16-20`)
- **Anonymous:** 1 use/day
- **Authenticated:** 3 uses/day
- **Tester:** 10 uses/day
- **Storage:** localStorage with daily reset
- **Type:** UI-enforced (not engine-level)

**6. Rate Limits** (database schema)
- **Table:** `rate_limits` (mentioned in Supabase types)
- **Tracking:** Request count and credits spent per time window
- **Scope:** Cloud mode only

### Local Mode Cost Behavior

**No cost enforcement:**
- `useCredits` returns zero balance in local mode (`:36-47`)
- Token counting is informational only
- No pre-request holds or deductions
- No API billing

**Why this matters for SaaS:**
- Local engine has no cost awareness
- SaaS wrapper must:
  - Track token usage via `LocalSendResult.usage`
  - Convert to credits post-execution
  - Implement credit holds before deliberation starts
  - Handle insufficient balance gracefully

---

## 6. Invariants & Design Constraints

### Hard Invariants

**1. Minimum 6 Rounds** (`deliberationEngine.ts:26`)
```typescript
maxRounds: Math.max(maxRounds, 6) // Enforce >= 6
```
- **Why:** Ensures sufficient deliberation depth
- **Non-negotiable:** Cannot be overridden
- **Impact on SaaS:** Minimum cost per deliberation predictable

**2. Localhost Security Constraint** (`provider.ts:24-26`)
```typescript
if (!allowRemote && !isLocalhostUrl(normalized)) {
  throw new Error("Local mode is restricted to localhost URLs.");
}
```
- **Why:** Prevent accidental remote LLM exposure
- **Override:** Requires explicit `allowRemote: true` flag
- **Impact on SaaS:** Online/offline parity requires toggling this

**3. Privacy Rules** (`deliberationEngine.ts:164-186`)
- **Broadcast visibility:** All participants see broadcast messages
- **Private visibility:** Only target agent sees private messages
- **Self-reflection:** Agents always see their own messages
- **Exclusion:** Non-participant agents receive zero messages
- **Non-negotiable:** Privacy logic is foundational to multi-agent coordination

**4. Single Active Round** (`deliberationRunner.ts:42-74`)
- Fixed round structure: all agents speak once per round
- Round completion requires all agents to participate
- Cannot advance to next round until current round completes
- **Why:** Ensures fair turn-taking and structured deliberation

**5. State Machine Transitions** (`deliberationEngine.ts:42-73`)
```typescript
start(): Must be in "idle" state (throws otherwise)
pause/resume: Only when "running"/"paused"
stop(): Transitions to "stopped" (irreversible)
advanceRound(): Auto-completes at maxRounds
```
- **Why:** Prevent invalid state transitions
- **Impact:** No resume-after-stop, must create new deliberation

### Design Constraints

**6. Stateful Agent History** (`provider.ts:124`)
```typescript
agent.history = [...agent.history, ...messages, { role: "assistant", content }]
```
- Agents maintain cumulative conversation history
- History grows unbounded (no pruning)
- **Risk:** Context length overflow on long deliberations
- **Mitigation needed:** Implement history pruning or summarization

**7. Parallel Agent Execution** (`deliberationRunner.ts:77`)
```typescript
await Promise.all(agentsToSpeak.map(async (agent) => { ... }))
```
- All agents in a round execute simultaneously
- **Benefit:** Faster round completion
- **Risk:** Race conditions if agents share state
- **Constraint:** Provider must support concurrent requests

**8. No Retry After Synthesis** (not yet implemented)
- Consensus/synthesis is one-shot
- No mechanism to retry failed deliberation
- **Constraint:** Error handling must be robust

**9. Offline Parity Requirement** (architectural intent)
- Engine must work identically in local and cloud modes
- No cloud-specific features in engine core
- **Impact:** Cloud-only features (e.g., cost tracking) must be wrapper-level

---

## 7. Coupling Analysis

### Engine ↔ UI Coupling

**Location:** `src/hooks/useDeliberation.ts` (React hook)
**Severity:** **MEDIUM**
**Coupling Type:** Orchestration layer

**Details:**
- Engine itself has no UI dependencies
- `useDeliberation` hook wraps engine for React integration
- Hook manages:
  - Agent creation via orchestrator
  - Lifecycle (start/stop)
  - State subscription and React state updates
  - Cleanup on unmount

**Recommendation:** **LEAVE** - This is appropriate React integration. Engine core is UI-agnostic.

---

### Engine ↔ Persistence Coupling

**Location:** None (memory-only currently)
**Severity:** **HIGH** (missing functionality)
**Coupling Type:** No persistence integration

**Details:**
- Deliberation state exists only in memory
- No save/restore mechanism
- Session survives only during page session
- `sessionId` field exists but not persisted to database

**Recommendation:** **ISOLATE** - Add persistence layer:
1. Create `DeliberationStorage` interface
2. Implement Supabase adapter for cloud mode
3. Implement localStorage adapter for offline mode
4. Keep engine core persistence-agnostic

---

### Engine ↔ Auth/Users Coupling

**Location:** `src/hooks/useDeliberation.ts:54` (session ID generation)
**Severity:** **LOW**
**Coupling Type:** Indirect via session ID

**Details:**
- Engine receives `sessionId` as constructor parameter
- No direct user ID references in engine core
- Hook generates session ID: `"session-" + Date.now()` (not user-aware)
- Cloud mode uses `useAuth` hook but only at UI layer

**Recommendation:** **LEAVE** - Clean separation maintained. Session ID can be user-linked at wrapper level.

---

### Engine ↔ Billing Coupling

**Location:** None
**Severity:** **HIGH** (missing functionality)
**Coupling Type:** No cost tracking integration

**Details:**
- Engine has no awareness of costs or credits
- `LocalSendResult.usage` provides token counts but engine doesn't consume them
- No credit holds or balance checks before execution
- `useCredits` hook is separate from engine

**Recommendation:** **ISOLATE** - Create billing wrapper:
1. Pre-execution credit hold (estimate: `agents * maxRounds * max_tokens`)
2. Post-execution cost calculation from `usage` data
3. Credit reconciliation (release hold, charge actual)
4. Keep engine free of billing logic

---

### Configuration Coupling

**Location:** `src/lib/localMode/config.ts`
**Severity:** **LOW**
**Coupling Type:** Environment variables and localStorage

**Details:**
- Execution mode toggle (`VITE_EXECUTION_MODE`)
- Provider configuration stored in localStorage
- Model catalog fetched from local LLM server
- Config is read-only for engine (no circular deps)

**Recommendation:** **LEAVE** - Configuration layer is appropriate. Consider adding validation.

---

### Component File Coupling

**UI Integration:** `src/pages/ModelMix.tsx`
**Severity:** **MEDIUM**
**Details:**
- Main UI imports engine types and hooks
- Creates orchestrator instance
- Passes orchestrator to `useDeliberation`
- Renders `DeliberationView` component with state

**Recommendation:** **LEAVE** - This is the integration point. Consider extracting to dedicated deliberation page.

---

## 8. SaaS Integration Readiness Summary

### Engine Isolation: **8/10**

**Strengths:**
- Core engine (`DeliberationEngine`, `DeliberationRunner`, `Orchestrator`) has zero UI dependencies
- Clean provider abstraction (`LocalProvider` interface)
- Pub/sub pattern for state updates
- No hard-coded API endpoints in engine
- Type-safe interfaces throughout

**Weaknesses:**
- `-1`: Agent creation happens in React hook, should be engine responsibility
- `-1`: Session ID generation is ad-hoc (`Date.now()`), needs proper ID strategy

**Recommendation:**
- Move agent initialization into engine or orchestrator
- Implement proper session ID generation (UUID with optional user prefix)

---

### Session Durability: **4/10**

**Strengths:**
- Complete state captured in `Deliberation` object
- Round history preserved with full message details
- Metadata includes model, provider, round for audit
- Privacy rules enable secure message filtering

**Weaknesses:**
- `-3`: No persistence layer (memory-only)
- `-2`: No save/restore mechanism
- `-1`: No database schema for deliberation sessions
- Session lost on page refresh

**Recommendation:**
- **CRITICAL:** Implement session persistence:
  1. Add `deliberations` table (id, user_id, session_id, task, config, status, created_at, updated_at)
  2. Add `deliberation_rounds` table (deliberation_id, round_number, status, created_at)
  3. Add `deliberation_messages` table (round_id, role, content, visibility, from_agent_id, to_agent_id, created_at, metadata)
  4. Implement incremental saves (per-round) to avoid data loss
  5. Add resume capability (load deliberation, reconstruct agents, continue from last round)

---

### Cost Alignment with Credits: **3/10**

**Strengths:**
- Token usage data available via `LocalSendResult.usage`
- `tokensPerCredit` conversion factor exists in credit system
- Credit infrastructure in place for cloud mode

**Weaknesses:**
- `-3`: No pre-execution cost estimation
- `-2`: No credit hold mechanism for deliberations
- `-1`: Engine doesn't report token usage to billing system
- `-1`: No way to stop deliberation on insufficient credits
- Local mode has no cost awareness

**Recommendation:**
- **CRITICAL:** Implement deliberation billing:
  1. **Estimation:** `estimatedCost = agents.length * maxRounds * max_tokens / tokensPerCredit`
  2. **Credit Hold:** Place hold before `engine.start()`, return error if insufficient
  3. **Usage Tracking:** Subscribe to engine state, accumulate token usage from messages
  4. **Cost Reconciliation:** On completion/stop, calculate actual cost, charge difference, release hold
  5. **Mid-deliberation Checks:** Optional - check balance after each round, allow graceful early termination
  6. **Local Mode Handling:** Either:
     - Option A: Track usage but don't charge (preview mode)
     - Option B: Disable deliberation entirely in local mode for simplicity

---

### Overall SaaS Readiness: **5/10**

**Production Blockers:**
1. ❌ No session persistence
2. ❌ No credit/billing integration
3. ❌ No cost estimation or holds

**Nice-to-Haves:**
4. ⚠️ No resume-after-stop capability
5. ⚠️ No deliberation history browser
6. ⚠️ No admin controls (force-stop, cost limits)
7. ⚠️ No analytics/telemetry on deliberation usage

**Production-Ready Aspects:**
- ✅ Clean engine architecture
- ✅ Provider abstraction for multi-model support
- ✅ Privacy-aware message routing
- ✅ Structured round system
- ✅ Token usage reporting
- ✅ Error handling

**Time to SaaS MVP:** ~3-5 days
1. Day 1: Database schema + persistence layer
2. Day 2: Credit estimation + hold mechanism
3. Day 3: Usage tracking + reconciliation
4. Day 4: UI integration + testing
5. Day 5: Edge cases + error handling

---

## Final Notes

**The engine is architecturally sound and ready for SaaS wrapping.**

The core deliberation logic is isolated, testable, and has clean boundaries. The main gaps are:
1. **Durability** (memory → database)
2. **Economics** (free → credit-gated)
3. **Observability** (silent → tracked)

All three can be implemented as **wrapper services** without modifying the engine core, which is the hallmark of good architecture.

**Key Insight:** The `LocalProvider` abstraction enables swapping LM Studio for cloud LLMs (OpenRouter, direct APIs) without changing the engine. This means deliberation mode can work in both offline (local) and online (cloud) contexts with the same engine code - exactly what's needed for AnotherWrapper-style SaaS.

---

## Appendix: Key File Locations

**Core Engine:**
- `src/lib/localMode/deliberationEngine.ts` - State machine and message routing
- `src/lib/localMode/deliberationRunner.ts` - Execution loop
- `src/lib/localMode/orchestrator.ts` - Agent factory and manager
- `src/lib/localMode/provider.ts` - OpenAI-compatible provider implementation
- `src/lib/localMode/types.ts` - Type definitions
- `src/lib/localMode/config.ts` - Configuration and mode switching

**Integration Hooks:**
- `src/hooks/useDeliberation.ts` - React hook for engine lifecycle
- `src/hooks/useCredits.ts` - Credit balance and transaction management
- `src/hooks/useDeepResearchLimit.ts` - Usage rate limiting

**UI Components:**
- `src/pages/ModelMix.tsx` - Main application UI
- `src/components/DeliberationView.tsx` - Deliberation visualization

**Type Definitions:**
- `src/types.ts` - Global types (ChatResponse)
- `src/lib/localMode/types.ts` - Engine-specific types
