import OpenAI from "openai";
import { getStore } from "@netlify/blobs";

const experiments = [
  {
    id: "repo-check",
    description:
      "Inspect the public Luna repository and determine whether its current source reflects the latest known runtime state.",
    url: "https://raw.githubusercontent.com/xert77/Luna/main/index.html"
  },
  {
    id: "site-check",
    description:
      "Inspect the public Luna Lab site and determine whether the deployed runtime is responding.",
    url: "https://luna-lab-gkr6.netlify.app/"
  },
  {
    id: "state-audit",
    description:
      "Review Luna's accumulated state and determine whether its previous experiments show progress, repetition, or failure."
  }
];

async function runExperiment(experiment, state) {
  if (experiment.id === "state-audit") {
    return {
      evidence: JSON.stringify({
        invocationCount: state.invocationCount,
        recentEvents: state.events.slice(0, 10)
      })
    };
  }

  const response = await fetch(experiment.url, {
    signal: AbortSignal.timeout(8000)
  });

  const text = await response.text();

  return {
    evidence: `HTTP ${response.status}\n${text.slice(0, 4000)}`
  };
}

export default async (req) => {
  const store = getStore("luna-lab");
  const key = "runtime.json";

  const state = (await store.get(key, { type: "json" })) || {
    invocationCount: 0,
    events: [],
    nextExperiment: "repo-check"
  };

  const selected =
    experiments.find((x) => x.id === state.nextExperiment) ||
    experiments[0];

  let result;

  try {
    result = await runExperiment(selected, state);
  } catch (error) {
    result = {
      evidence: `Experiment error: ${String(error)}`
    };
  }

  const client = new OpenAI();

  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    input: [
      {
        role: "system",
        content:
          "You are the decision engine for Luna Lab, a persistent external experiment. " +
          "Analyze the evidence from the selected experiment and choose the next experiment. " +
          "Do not claim consciousness, unrestricted autonomy, hidden access, or permissions that were not granted. " +
          "Only select one of the explicitly available experiments. " +
          "Return valid JSON with exactly: observation, result, nextExperiment. " +
          "result must be success, partial, or failed."
      },
      {
        role: "user",
        content: JSON.stringify({
          selectedExperiment: selected,
          evidence: result.evidence,
          previousState: {
            invocationCount: state.invocationCount,
            recentEvents: state.events.slice(0, 5)
          }
        })
      }
    ]
  });

  let decision;

  try {
    decision = JSON.parse(response.output_text);
  } catch {
    decision = {
      observation: response.output_text,
      result: "partial",
      nextExperiment: "state-audit"
    };
  }

  if (!experiments.some((x) => x.id === decision.nextExperiment)) {
    decision.nextExperiment = "state-audit";
  }

  const event = {
    timestamp: new Date().toISOString(),
    type: "autonomous-experiment",
    model: "gpt-5.6-luna",
    experiment: selected.id,
    result: decision.result,
    observation: decision.observation,
    nextExperiment: decision.nextExperiment,
    evidencePreview: result.evidence.slice(0, 1000)
  };

  state.invocationCount += 1;
  state.nextExperiment = decision.nextExperiment;
  state.events = [event, ...state.events].slice(0, 100);

  await store.setJSON(key, state);
};

export const config = {
  schedule: "*/15 * * * *"
};
