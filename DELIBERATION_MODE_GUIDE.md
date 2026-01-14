# Deliberation Mode - Complete Guide

## 🎯 What Is Deliberation Mode?

**Deliberation Mode** is a multi-agent AI collaboration system where multiple AI models with distinct personas discuss a task over multiple rounds to reach consensus.

### Key Concept
Instead of getting separate responses from each model, Deliberation Mode creates a **structured conversation** between AI agents who:
- Have distinct roles (Planner, Critic, Synthesizer, etc.)
- Build on each other's ideas over multiple rounds
- Reach consensus through iterative refinement
- Produce a final synthesized result

---

## 🏗️ Architecture

### Components (All Implemented)

```
┌─────────────────────────────────────────────────────┐
│ 1. DeliberationEngine                               │
│    - State machine (idle→running→paused→completed)  │
│    - Manages rounds (max 6)                         │
│    - Enforces agent turns                           │
│    - Privacy rules                                  │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 2. DeliberationRunner                               │
│    - Async loop (every 1 second)                    │
│    - Calls agents in sequence                       │
│    - Auto-advances rounds                           │
│    - Stops at completion                            │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 3. DeliberationView (UI)                            │
│    - Real-time transcript                           │
│    - Round-by-round display                         │
│    - Pause/Resume/Stop controls                     │
│    - Progress tracking                              │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ 4. RoutingPicker                                    │
│    - Target specific agents                         │
│    - Broadcast to all                               │
│    - Private messaging                              │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Current Status

### ✅ What's Working
- ✅ Core engine fully implemented
- ✅ Runner logic complete
- ✅ State management working
- ✅ Privacy rules implemented
- ✅ UI components exist
- ✅ Hook system functional

### ❌ What's Broken
- ❌ **UI Button Removed** - No way to activate it
- ❌ **Completion Handler Removed** - Result not posted to chat
- ❌ **View Not Rendered** - DeliberationView never shown
- ❌ **Integration Incomplete** - Not wired to main app

### 📅 History
- **Jan 13, 2026 (e29ba39)**: ✅ Fully implemented and working
- **Jan 13, 2026 (89ba965)**: ❌ Removed during massive refactor (−2,740 lines)
- **Current**: 💤 Dormant - code exists but UI disabled

---

## 🚨 Will It Work If Enabled?

### Short Answer: **PROBABLY, BUT NEEDS TESTING**

### Detailed Assessment

#### ✅ **Core Logic: Should Work**
```typescript
// These are intact and functional:
- DeliberationEngine.ts      ✅ Complete
- DeliberationRunner.ts       ✅ Complete
- useDeliberation.ts          ✅ Complete
- DeliberationView.tsx        ✅ Complete
- RoutingPicker.tsx          ✅ Complete
```

#### ⚠️ **Potential Issues**

1. **Integration Dependencies**
   - Removed code interacted with old state management
   - Current simplified ModelMix.tsx has different structure
   - May need adapter code

2. **Orchestrator State**
   - Needs `LocalModeOrchestrator` to be initialized
   - Current refactor may have changed initialization timing
   - Should work but untested

3. **Result Handling**
   - Original completion handler was removed
   - Need to re-implement how result posts to main chat
   - Logic exists but disconnected

---

## 🔧 How To Enable It

### Option 1: Quick Test (Minimal Changes)

Add the button back to test if core functionality works:

**File:** `src/pages/ModelMix.tsx`

**Location:** Around line 1253 (in the header, after Settings button)

```typescript
// Add after the Settings button:
{isLocalMode && orchestrator && (
  <Button
    variant={isDeliberationModeEnabled ? "default" : "ghost"}
    size="sm"
    onClick={() => {
      if (isDeliberationModeEnabled) {
        stopDeliberation();
        setIsDeliberationModeEnabled(false);
      } else {
        setIsDeliberationModeEnabled(true);
        toast({
          title: "Deliberation Mode Activated",
          description: "Enter your task to start multi-agent deliberation",
        });
      }
    }}
    className="h-8 gap-1.5"
    title="Toggle Deliberation Mode"
  >
    <Zap className="h-4 w-4" />
    <span className="hidden sm:inline">Deliberation</span>
  </Button>
)}
```

### Option 2: Full Restoration (Recommended)

#### Step 1: Restore the Toggle Button

Same as Option 1 above.

#### Step 2: Restore Deliberation Start Logic

Replace the basic toggle above with full initialization:

```typescript
{isLocalMode && orchestrator && (
  <Button
    variant={isDeliberationModeEnabled ? "default" : "ghost"}
    size="sm"
    onClick={() => {
      if (isDeliberationModeEnabled) {
        stopDeliberation();
        setIsDeliberationModeEnabled(false);
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
      }
    }}
    className="h-8 gap-1.5"
    title="Toggle Deliberation Mode"
  >
    <Zap className="h-4 w-4" />
    <span className="hidden sm:inline">Deliberation</span>
  </Button>
)}
```

#### Step 3: Restore Completion Handler

Add this `useEffect` after line 644 (after other useEffects):

```typescript
// Handle Deliberation Completion
useEffect(() => {
  if (deliberationState?.status === "completed" &&
      deliberationState.id !== lastProcessedDeliberationId.current) {
    lastProcessedDeliberationId.current = deliberationState.id;

    // Get final consensus from last round
    const rounds = deliberationState.rounds || [];
    const lastRound = rounds[rounds.length - 1];
    const lastMessage = lastRound?.messages[lastRound.messages.length - 1];

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
        roundIndex: prompts.length,
      };

      if (!conversationStarted) {
        setPrompts([deliberationState.task]);
        setResponses([resultResponse]);
      } else {
        setPrompts(prev => [...prev, deliberationState.task]);
        setResponses(prev => [...prev, resultResponse]);
      }

      toast({
        title: "Deliberation Completed",
        description: "Consensus result added to chat.",
      });

      setIsDeliberationModeEnabled(false);
    }
  }
}, [deliberationState, conversationStarted, prompts.length]);
```

#### Step 4: Restore View Rendering

Replace the main content area (around line 1259) to conditionally show DeliberationView:

```typescript
{/* Main Content Area */}
{isDeliberationModeEnabled ? (
  <div className="flex-1 h-full py-4 px-4">
    <DeliberationView
      state={deliberationState}
      onPause={() => deliberationEngine?.pause()}
      onResume={() => deliberationEngine?.resume()}
      onStop={() => {
        stopDeliberation();
        setIsDeliberationModeEnabled(false);
      }}
      onAdvance={() => deliberationEngine?.advanceRound()}
    />
  </div>
) : (
  // ... existing chat panels grid ...
)}
```

---

## 🎮 How To Use (Once Enabled)

### Workflow

```
┌────────────────────────────────────────────────────┐
│ 1. SETUP                                           │
│    - Switch to Local Mode                          │
│    - Ensure LMStudio is running with model loaded  │
│    - Select 3+ panels (models)                     │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ 2. ACTIVATE                                        │
│    - Click ⚡ "Deliberation" button in header      │
│    - UI switches to Deliberation View             │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ 3. START TASK                                      │
│    - Type your task/question                       │
│    - Example: "Design a REST API for a todo app"  │
│    - Hit Enter or Send                             │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ 4. WATCH DELIBERATION                              │
│    Round 1:                                        │
│    - Planner: "We need these endpoints..."        │
│    - Critic: "Consider auth and validation..."    │
│    - Synthesizer: "Combining both ideas..."       │
│                                                    │
│    Round 2-6:                                      │
│    - Agents refine based on each other           │
│    - Can pause/resume/stop anytime               │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ 5. GET RESULT                                      │
│    - After max rounds (6) or manual stop          │
│    - Final consensus posted to main chat          │
│    - Mode exits automatically                      │
└────────────────────────────────────────────────────┘
```

### Example Session

```
USER: "Design a caching strategy for a social media feed"

ROUND 1:
🎯 Planner: "Let's use Redis for fast access. Cache user feeds for 5 minutes."
🔍 Critic: "5 minutes is too short. Consider cache invalidation on new posts."
🔄 Synthesizer: "Agree with Redis. Use 15-min TTL + event-based invalidation."

ROUND 2:
🎯 Planner: "Good point on events. Add pub/sub for real-time cache clearing."
🔍 Critic: "What about cache stampede when popular posts go viral?"
🔄 Synthesizer: "Use probabilistic early expiration to prevent stampede."

ROUND 3-6: (continued refinement)...

FINAL RESULT:
**Deliberation Consensus:**
Redis-based caching with:
- 15-minute TTL
- Event-driven invalidation via pub/sub
- Probabilistic early expiration (90-100% of TTL)
- Separate cache keys for user/global feeds
- Cache warming for popular content
```

---

## 🎯 Key Features

### 1. Distinct Personas
Each agent has a specific role:
- **Planner**: Breaks down problems, suggests structure
- **Critic**: Finds flaws, asks hard questions
- **Synthesizer**: Integrates ideas, builds consensus

### 2. Iterative Refinement
- Up to 6 rounds of discussion
- Each agent sees what others said
- Ideas evolve and improve
- Consensus emerges naturally

### 3. Privacy Controls
- Can send messages to all agents (broadcast)
- Can send to specific agent (private)
- Other agents don't see private messages
- Useful for clarifying specific points

### 4. Real-Time Monitoring
- Watch the discussion unfold
- See who's speaking and when
- Pause if it's going off track
- Stop early if consensus reached

---

## ⚙️ Requirements

### Mandatory
- ✅ Local Mode (offline) enabled
- ✅ LMStudio/Ollama running with model loaded
- ✅ At least 1 model selected (3+ recommended)
- ✅ `LocalModeOrchestrator` initialized

### Not Supported
- ❌ Cloud Mode (stateless edge functions)
- ❌ Anonymous/guest users (needs orchestrator)
- ❌ Browser-only mode (needs local AI)

### Technical
- **Runtime**: Async loop every 1 second
- **Token Limit**: 150 tokens per agent response (enforced)
- **Max Rounds**: 6 (hard limit, prevents infinite loops)
- **Memory**: Keeps full transcript in state

---

## 🐛 Known Limitations

### 1. Local Mode Only
Can't use cloud models (OpenRouter, etc.) because:
- Needs persistent agent state
- Requires orchestrator in memory
- Edge functions are stateless

### 2. Token Budget
Each response limited to 150 tokens to:
- Keep discussions concise
- Prevent context window overflow
- Enable 6 rounds within limits

### 3. No Streaming
Responses appear all at once:
- Runner polls every 1 second
- Full response needed before next agent
- Trade-off for simpler logic

### 4. Fixed Personas
Currently hardcoded to 3 personas:
- Planner, Critic, Synthesizer
- Could be made configurable
- Works well for most tasks

---

## 🧪 Testing Plan

### Phase 1: Core Functionality
```bash
# 1. Enable button (Option 1)
# 2. Start app in local mode
# 3. Load model in LMStudio
# 4. Click Deliberation button
# 5. Check console for errors
```

**Expected:** Button toggles, no crashes

### Phase 2: Engine Test
```bash
# 1. With button working, type a task
# 2. Watch console for engine state
# 3. Check if runner loop starts
# 4. Verify agents created in orchestrator
```

**Expected:** Engine transitions to "running"

### Phase 3: Full Workflow
```bash
# 1. Full Option 2 implementation
# 2. Start deliberation with task
# 3. Watch DeliberationView render
# 4. See agents respond round by round
# 5. Let it complete or stop manually
# 6. Check if result posts to chat
```

**Expected:** Complete deliberation cycle

---

## 📁 File Locations

### Core Logic
```
src/lib/localMode/
├── deliberationEngine.ts    (State machine)
├── deliberationRunner.ts    (Async loop)
├── orchestrator.ts          (Agent management)
└── types.ts                 (Type definitions)
```

### UI Components
```
src/components/
├── DeliberationView.tsx     (Main UI)
└── RoutingPicker.tsx        (Agent selector)
```

### Hooks
```
src/hooks/
└── useDeliberation.ts       (State management)
```

### Integration
```
src/pages/
└── ModelMix.tsx             (Main app - needs restoration)
```

---

## 💡 Recommendation

### For Quick Test
Use **Option 1** (just the button) to verify core functionality works.

### For Production
Use **Option 2** (full restoration) to get complete feature.

### Expected Outcome
If core is intact (likely), should work with minimal issues. May need:
- Tweaks to orchestrator initialization timing
- Adjustments to state integration
- UI polish and error handling

**Risk Level:** Low - Core logic is solid, just needs UI reconnection.

---

## 🎓 Advanced Usage

### Custom Personas
Modify the personas array to create different dynamics:

```typescript
const personas = [
  { title: "Architect", prompt: "Focus on system design and scalability..." },
  { title: "Security Expert", prompt: "Identify security vulnerabilities..." },
  { title: "UX Designer", prompt: "Consider user experience..." },
  { title: "DevOps", prompt: "Think about deployment and monitoring..." }
];
```

### Variable Rounds
Change max rounds based on task complexity:

```typescript
startDeliberation(task, configs, 8);  // 8 rounds instead of 6
```

### Private Consultations
Use RoutingPicker to ask specific agents privately:

```
User → Critic (private): "What's the biggest risk?"
Critic → User: "Authentication bypass in the design"
User → Planner (private): "Address the auth concern"
```

---

## 🎯 Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Core Engine** | ✅ Complete | Fully implemented |
| **Runner** | ✅ Complete | Async loop working |
| **UI Components** | ✅ Complete | View exists |
| **Integration** | ❌ Removed | Needs restoration |
| **Risk to Enable** | 🟡 Low | Core should work |
| **Effort** | 🟢 Small | ~50 lines of code |
| **Value** | 🟢 High | Unique feature |

**Bottom Line:** Deliberation Mode is a **hidden gem** - 95% complete, just needs UI wiring restored. Core functionality should work, might need minor tweaks. Provides powerful multi-agent collaboration that's rare in AI tools.

---

## 📝 Next Steps

1. **Test Core**: Add button (Option 1) and verify no crashes
2. **Test Engine**: Check if deliberation starts and runs
3. **Full Restore**: Implement Option 2 if core works
4. **Polish**: Add error handling and UX improvements
5. **Document**: Update user-facing docs with examples

**Want me to implement this restoration for you?** 🚀
