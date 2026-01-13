import assert from "node:assert/strict";
import { LocalOpenAICompatibleProvider, isLocalhostUrl, normalizeBaseUrl } from "../src/lib/localMode";

const runAcceptance = () => {
  assert.ok(isLocalhostUrl("http://localhost:1234"), "localhost URL should be allowed");
  assert.ok(isLocalhostUrl("http://127.0.0.1:8000"), "127.0.0.1 URL should be allowed");
  assert.equal(normalizeBaseUrl("http://localhost:1234/"), "http://localhost:1234");

  let rejected = false;
  try {
    new LocalOpenAICompatibleProvider({ baseUrl: "http://example.com", model: "local-model" });
  } catch {
    rejected = true;
  }

  assert.ok(rejected, "Non-localhost base URLs should be rejected by default");
};

try {
  runAcceptance();
  console.log("Local mode acceptance checks passed.");
} catch (error) {
  console.error("Local mode acceptance checks failed.", error);
  process.exit(1);
}
