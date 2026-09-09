import assert from "node:assert/strict";
import test from "node:test";
import { extractRequirements } from "./requirements.js";
import type { TextGenerator } from "../llm/types.js";

const jobDescription = "Senior backend engineer. Build reliable APIs and collaborate with product and engineering teams.";

test("extracts validated requirements and applies generated ownership state", async () => {
  let prompt = "";
  const generator: TextGenerator = {
    generateText: async (value) => {
      prompt = value;
      return JSON.stringify({
        roleTitle: "Backend Engineer",
        seniority: "Senior",
        responsibilities: ["Build reliable APIs"],
        requirements: [{ id: "req-api-design", text: "API design", kind: "technical", priority: "must" }],
      });
    },
  };

  const result = await extractRequirements(jobDescription, generator);
  assert.equal(result.roleTitle, "Backend Engineer");
  assert.deepEqual(result.requirements[0], {
    id: "req-api-design",
    text: "API design",
    kind: "technical",
    priority: "must",
    origin: "generated",
    edited: false,
    pinned: false,
  });
  assert.match(prompt, /JOB DESCRIPTION START/);
  assert.match(prompt, /reliable APIs/);
});

test("retries and rejects duplicate requirement IDs", async () => {
  let calls = 0;
  const generator: TextGenerator = {
    generateText: async () => {
      calls += 1;
      return JSON.stringify({
        roleTitle: "Engineer",
        seniority: "Senior",
        responsibilities: ["Build software"],
        requirements: [
          { id: "req-api", text: "API design", kind: "technical", priority: "must" },
          { id: "req-api", text: "Testing", kind: "technical", priority: "nice" },
        ],
      });
    },
  };

  await assert.rejects(() => extractRequirements(jobDescription, generator), /schema/i);
  assert.equal(calls, 2);
});

test("rejects too-short job descriptions before calling the model", async () => {
  let calls = 0;
  const generator: TextGenerator = { generateText: async () => { calls += 1; return "{}"; } };
  await assert.rejects(() => extractRequirements("Too short", generator));
  assert.equal(calls, 0);
});