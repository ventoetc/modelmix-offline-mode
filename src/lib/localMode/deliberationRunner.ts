import { DeliberationEngine } from "./deliberationEngine";
import { LocalModeOrchestrator } from "./orchestrator";
import { LocalMessage } from "./types";

export class DeliberationRunner {
  private isRunning = false;

  constructor(
    private engine: DeliberationEngine,
    private orchestrator: LocalModeOrchestrator
  ) {}

  public async startLoop(intervalMs: number = 1000) {
    if (this.isRunning) return;
    this.isRunning = true;
    
    while (this.isRunning) {
      const status = this.engine.getStatus();
      
      if (status === "stopped" || status === "completed") {
        break;
      }

      if (status === "paused") {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      if (status === "running") {
        await this.runStep();
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    this.isRunning = false;
  }

  public stopLoop() {
    this.isRunning = false;
  }

  public async runStep() {
    const state = this.engine.getState();
    if (state.status !== "running") return;

    // Check if the current round is complete
    const currentRound = state.rounds[state.rounds.length - 1];
    
    // If no round or completed, try to advance
    if (!currentRound || currentRound.status === "completed") {
      // If we are at max rounds, we should have stopped already, but let's check
      if (state.currentRound < state.maxRounds) {
        this.engine.advanceRound();
      } else {
        this.engine.stop();
      }
      return;
    }

    // Find agents who haven't spoken in this round yet
    // "Fixed rounds" means everyone speaks once per round
    const spokenAgentIds = new Set(
      currentRound.messages
        .filter(m => m.role === "agent")
        .map(m => m.fromAgentId!)
    );

    const agentsToSpeak = state.agents.filter(a => !spokenAgentIds.has(a.agentId));

    if (agentsToSpeak.length === 0) {
      // Round is done.
      this.engine.advanceRound();
      return;
    }

    // Run in parallel for all agents who haven't spoken
    await Promise.all(agentsToSpeak.map(async (agent) => {
      const context = this.engine.buildContextForAgent(agent.agentId);
      
      // Convert ChatMessage[] to LocalMessage[]
      const localMessages: LocalMessage[] = context.map(m => ({
        role: m.role === "agent" ? "assistant" : m.role === "system" ? "system" : "user",
        content: m.content
      }));

      // Add System Prompt
      const systemPrompt = agent.systemPrompt || "You are a helpful assistant.";
      const deliberationPrompt = `
You are participating in a deliberation process. 
Task: ${state.task}
Current Round: ${state.currentRound}/${state.maxRounds}
Your Persona: ${agent.personaTitle || agent.personaId}

INSTRUCTIONS:
- Be concise.
- Provide your perspective based on your persona.
- If this is a later round, consider previous messages to reach consensus.
`;
      
      // Prepend system prompt
      localMessages.unshift({ role: "system", content: systemPrompt + "\n" + deliberationPrompt });

      try {
        const response = await this.orchestrator.send(agent.agentId, localMessages);
        
        // Add to engine
        this.engine.addMessage(
          response.content,
          agent, // agent matches AgentIdentity
          "broadcast" // Default to broadcast for now. In future, we can add logic for private messages.
        );
      } catch (err) {
        console.error(`Error running agent ${agent.agentId}:`, err);
        // Add error message to state?
        this.engine.addMessage(
          `[Error generating response: ${err instanceof Error ? err.message : String(err)}]`,
          agent,
          "private", // Keep errors private? Or broadcast to debug?
          agent.agentId
        );
      }
    }));
  }
}
