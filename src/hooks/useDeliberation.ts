import { useState, useRef, useCallback, useEffect } from "react";
import {
  DeliberationEngine,
  DeliberationRunner,
  LocalModeOrchestrator,
  AgentIdentity,
  Deliberation,
  AgentConfig
} from "@/lib/localMode";
import { toast } from "@/hooks/use-toast";

export function useDeliberation(orchestrator: LocalModeOrchestrator | null) {
  const [state, setState] = useState<Deliberation | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    if (!orchestrator) {
      const errorMsg = "Cannot start deliberation: Local mode orchestrator is not initialized. Please ensure LM Studio is running.";
      console.error(errorMsg);
      setError(errorMsg);
      toast({
        title: "Deliberation Failed",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    try {
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
      engine.start();
      runner.startLoop(); // Start the async loop

      toast({
        title: "Deliberation Started",
        description: `${agentConfigs.length} agents are now deliberating on your task.`,
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error occurred while starting deliberation";
      console.error("Failed to start deliberation:", e);
      setError(errorMsg);
      toast({
        title: "Deliberation Failed",
        description: errorMsg,
        variant: "destructive",
      });
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
    error,
    startDeliberation,
    stopDeliberation,
    isDeliberating: state?.status === "running" || state?.status === "paused",
    engine: engineRef.current
  };
}
