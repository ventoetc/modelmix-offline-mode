import type { LocalAgent, LocalAgentConfig, LocalMessage, LocalProvider, LocalSendResult } from "./types";

type ParallelRequest = {
  agentId: string;
  messages: LocalMessage[];
};

type RoleRequest = {
  agentId: string;
  role: "critic" | "advocate" | "auditor" | string;
  messages: LocalMessage[];
};

export class LocalModeOrchestrator {
  private provider: LocalProvider;
  private agents = new Map<string, LocalAgent>();

  constructor(provider: LocalProvider) {
    this.provider = provider;
  }

  createAgent(config: LocalAgentConfig): LocalAgent {
    const agent = this.provider.createAgent(config);
    this.agents.set(agent.agent_id, agent);
    return agent;
  }

  getAgent(agentId: string): LocalAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Unknown agent: ${agentId}`);
    }
    return agent;
  }

  async send(agentId: string, messages: LocalMessage[]): Promise<LocalSendResult> {
    const agent = this.getAgent(agentId);
    return this.provider.send(agent, messages);
  }

  reset(agentId: string) {
    const agent = this.getAgent(agentId);
    this.provider.reset(agent);
  }

  delete(agentId: string) {
    const agent = this.getAgent(agentId);
    this.provider.delete(agent);
    this.agents.delete(agentId);
  }

  resetAll() {
    for (const agentId of this.agents.keys()) {
      this.reset(agentId);
    }
  }

  async runParallel(requests: ParallelRequest[]): Promise<LocalSendResult[]> {
    return Promise.all(requests.map((request) => this.send(request.agentId, request.messages)));
  }

  async runSequential(requests: ParallelRequest[]): Promise<LocalSendResult[]> {
    const results: LocalSendResult[] = [];
    for (const request of requests) {
      results.push(await this.send(request.agentId, request.messages));
    }
    return results;
  }

  async runRoleBased(requests: RoleRequest[], parallel = true) {
    const run = parallel ? this.runParallel.bind(this) : this.runSequential.bind(this);
    const results = await run(
      requests.map((request) => ({
        agentId: request.agentId,
        messages: request.messages,
      }))
    );
    return results.map((result, index) => ({
      ...result,
      role: requests[index].role,
    }));
  }
}
