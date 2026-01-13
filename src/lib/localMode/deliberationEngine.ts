
import { 
  Deliberation, 
  DeliberationStatus, 
  AgentConfig, 
  ChatMessage, 
  Round,
  AgentIdentity
} from "./types";
import { generateUUID } from "../utils";

export class DeliberationEngine {
  private state: Deliberation;

  constructor(
    sessionId: string, 
    task: string, 
    agents: AgentConfig[], 
    maxRounds: number = 6
  ) {
    this.state = {
      id: generateUUID(),
      sessionId,
      task,
      agents,
      maxRounds: Math.max(maxRounds, 6), // Enforce >= 6
      currentRound: 0,
      status: "idle",
      rounds: [],
      createdAt: Date.now()
    };
  }

  public getStatus(): DeliberationStatus {
    return this.state.status;
  }

  public getState(): Deliberation {
    return { ...this.state };
  }

  public start() {
    if (this.state.status !== "idle") {
      throw new Error("Deliberation can only start from idle state");
    }
    this.state.status = "running";
    this.startNewRound();
    this.notify();
  }

  public pause() {
    if (this.state.status === "running") {
      this.state.status = "paused";
      this.notify();
    }
  }

  public resume() {
    if (this.state.status === "paused") {
      this.state.status = "running";
      this.notify();
    }
  }

  public stop() {
    this.state.status = "stopped";
    // Optionally close the current round
    const currentRound = this.getCurrentRound();
    if (currentRound) {
      currentRound.status = "completed";
    }
    this.notify();
  }

  private startNewRound() {
    // Complete previous round if exists
    const previousRound = this.getCurrentRound();
    if (previousRound) {
      previousRound.status = "completed";
    }

    this.state.currentRound++;
    const round: Round = {
      roundNumber: this.state.currentRound,
      messages: [],
      status: "active"
    };
    this.state.rounds.push(round);
  }

  private getCurrentRound(): Round | undefined {
    return this.state.rounds[this.state.rounds.length - 1];
  }

  public addUserMessage(content: string, targetAgentId?: string): ChatMessage {
    if (this.state.status !== "running") {
      throw new Error("Cannot add message when deliberation is not running");
    }

    const currentRound = this.getCurrentRound();
    if (!currentRound) {
      throw new Error("No active round");
    }

    const message: ChatMessage = {
      id: generateUUID(),
      deliberationId: this.state.id,
      sessionId: this.state.sessionId,
      role: "user",
      visibility: targetAgentId ? "private" : "broadcast",
      toAgentId: targetAgentId,
      content,
      createdAt: Date.now(),
      meta: {
        round: this.state.currentRound
      }
    };

    currentRound.messages.push(message);
    this.notify();
    return message;
  }

  public addMessage(
    content: string, 
    fromIdentity: AgentIdentity, 
    visibility: "broadcast" | "private" = "broadcast",
    toAgentId?: string
  ): ChatMessage {
    if (this.state.status !== "running") {
      throw new Error("Cannot add message when deliberation is not running");
    }

    const currentRound = this.getCurrentRound();
    if (!currentRound || currentRound.status !== "active") {
      // Auto-start new round if needed? Or throw?
      // For now, assume orchestrator manages rounds, but let's be safe
      throw new Error("No active round");
    }

    const message: ChatMessage = {
      id: generateUUID(),
      deliberationId: this.state.id,
      sessionId: this.state.sessionId,
      role: "agent",
      visibility,
      toAgentId,
      fromAgentId: fromIdentity.agentId,
      personaId: fromIdentity.personaId,
      content,
      createdAt: Date.now(),
      meta: {
        modelId: fromIdentity.modelId,
        provider: fromIdentity.provider,
        round: this.state.currentRound
      }
    };

    currentRound.messages.push(message);
    return message;
  }

  // Privacy Logic: Filter messages for a specific agent
  public buildContextForAgent(agentId: string): ChatMessage[] {
    // 1. Verify agent is part of this deliberation
    const isParticipant = this.state.agents.some(a => a.agentId === agentId);
    if (!isParticipant) {
      // Excluded agents receive ZERO messages
      return [];
    }

    // 2. Collect all messages from all rounds
    const allMessages = this.state.rounds.flatMap(r => r.messages);
    
    // 3. Filter based on privacy rules
    return allMessages.filter(m => 
      // Rule 1: Broadcast messages are visible to all participants
      m.visibility === "broadcast" || 
      
      // Rule 2: Private messages only visible if sent TO this agent
      (m.visibility === "private" && m.toAgentId === agentId) ||
      
      // Rule 3: Agent always sees their own messages (sent BY them)
      (m.fromAgentId === agentId)
    );
  }

  private listeners: ((state: Deliberation) => void)[] = [];

  public subscribe(listener: (state: Deliberation) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(l => l(currentState));
  }

  public advanceRound() {
    const current = this.getCurrentRound();
    if (current) {
      current.status = "completed";
    }

    if (this.state.currentRound < this.state.maxRounds) {
      this.startNewRound();
    } else {
      this.state.status = "completed";
    }
    this.notify();
  }
}
