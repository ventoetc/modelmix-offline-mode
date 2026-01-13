import { LocalModeOrchestrator, LocalOpenAICompatibleProvider } from "../src/lib/localMode";

const baseUrl = process.env.MODELMIX_LOCAL_BASE_URL || "http://localhost:1234";
const model = process.env.MODELMIX_LOCAL_MODEL || "local-model";
const allowRemote = process.env.MODELMIX_LOCAL_ALLOW_REMOTE === "true";

const orchestrator = new LocalModeOrchestrator(
  new LocalOpenAICompatibleProvider({ baseUrl, model, allowRemote })
);

const runDemo = async () => {
  const critic = orchestrator.createAgent({
    alias: "Critic",
    systemPrompt: "You are a critical reviewer. Identify flaws, risks, and missing assumptions.",
    params: { temperature: 0.2 },
  });

  const advocate = orchestrator.createAgent({
    alias: "Advocate",
    systemPrompt: "You are an advocate. Emphasize strengths, opportunities, and upside.",
    params: { temperature: 0.7 },
  });

  const auditor = orchestrator.createAgent({
    alias: "Auditor",
    systemPrompt: "You are an auditor. Summarize key points and check for consistency.",
    params: { temperature: 0.3 },
  });

  const prompt = "Should we migrate our monolith to microservices this year?";

  const results = await orchestrator.runRoleBased(
    [
      { agentId: critic.agent_id, role: "critic", messages: [{ role: "user", content: prompt }] },
      { agentId: advocate.agent_id, role: "advocate", messages: [{ role: "user", content: prompt }] },
      { agentId: auditor.agent_id, role: "auditor", messages: [{ role: "user", content: prompt }] },
    ],
    true
  );

  for (const result of results) {
    console.log(`\n[${result.role}] (${result.agent_id})\n${result.content}\n`);
  }

  orchestrator.resetAll();
};

runDemo().catch((error) => {
  console.error("Local mode demo failed:", error);
  process.exit(1);
});
