import { useState, useRef, useCallback, useEffect } from "react";
import { 
  DeliberationEngine, 
  DeliberationRunner, 
  LocalModeOrchestrator, 
  AgentIdentity, 
  Deliberation,
  AgentConfig
} from "@/lib/localMode";

export function useDeliberation(orchestrator: LocalModeOrchestrator | null) {
  const [state, setState] = useState<Deliberation | null>(null);
  const engineRef = useRef<DeliberationEngine | null>(null);
  const runnerRef = useRef<DeliberationRunner | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (runnerRef.current) {
        runnerRef.current.stopLoop();
      }
    };
  }, []);

  const startDeliberation = useCallback((
    task: string, 
    agentConfigs: AgentConfig[]
  ) => {
    if (!orchestrator) {
      console.error("Cannot start deliberation: Orchestrator is missing");
      return;
    }

    // 1. Create distinct agents in the orchestrator
    // We map the incoming configs to actual running agents
    const activeAgents: AgentConfig[] = agentConfigs.map(config => {
      const localAgent = orchestrator.createAgent({
        alias: config.personaTitle || config.personaId,
        systemPrompt: config.systemPrompt || "You are a helpful assistant participating in a deliberation. Keep your responses concise (under 150 tokens).",
        model: config.modelId,
        params: {
          max_tokens: 150, // Enforce short replies
          temperature: 0.7,
          ...config.params
        }
      });

      return {
        ...config,
        agentId: localAgent.agent_id // Use the actual runtime ID
      };
    });

    const engine = new DeliberationEngine(
      "session-" + Date.now(), // Unique Session ID
      task,
      activeAgents
    );

    const runner = new DeliberationRunner(engine, orchestrator);

    engineRef.current = engine;
    runnerRef.current = runner;

    // Subscribe to updates
    engine.subscribe((newState) => {
      setState(newState);
    });

    // Initial state
    setState(engine.getState());

    // Start
    try {
      engine.start();
      runner.startLoop(); // Start the async loop
    } catch (e) {
      console.error("Failed to start deliberation:", e);
    }
  }, [orchestrator]);

  const stopDeliberation = useCallback(() => {
    if (runnerRef.current) {
      runnerRef.current.stopLoop();
    }
    if (engineRef.current) {
      engineRef.current.stop();
    }
  }, []);

  return {
    state,
    startDeliberation,
    stopDeliberation,
    isDeliberating: state?.status === "running" || state?.status === "paused",
    engine: engineRef.current
  };
}
