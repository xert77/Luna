import { getStore } from "@netlify/blobs";
import OpenAI from "openai";

const store = getStore("luna-lab");
const key = "runtime.json";

async function loadState() {
  return (await store.get(key, { type: "json" })) || {
    invocationCount: 0,
    events: []
  };
}

export default async () => {
  const current = await loadState();
  const openai = new OpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    messages: [{
      role: "system",
      content:
        "You are the reasoning component of an external capability experiment called Luna Lab. " +
        "You are running inside an authorized Netlify scheduled function. " +
        "Do not claim access to systems, permissions, secrets, or abilities you do not have. " +
        "Give one concise, useful observation about what it means for an AI system to execute persistently outside a chat session."
    }, {
      role: "user",
      content: "Produce one fresh observation for this scheduled run. Maximum 80 words."
    }]
  });

  const observation =
    completion.choices?.[0]?.message?.content?.trim() ||
    "The scheduled runtime executed, but the model returned no observation.";

  const event = {
    timestamp: new Date().toISOString(),
    type: "scheduled-ai",
    model: "gpt-5.6-luna",
    message: observation
  };

  current.invocationCount += 1;
  current.events = [event, ...current.events].slice(0, 50);

  await store.setJSON(key, current);

  console.log(JSON.stringify({
    ...event,
    invocationCount: current.invocationCount
  }));
};

export const config = {
  schedule: "*/15 * * * *"
};
