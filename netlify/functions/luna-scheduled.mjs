import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("luna-lab");
  const key = "runtime.json";

  const current = (await store.get(key, { type: "json" })) || {
    invocationCount: 0,
    events: []
  };

  const event = {
    timestamp: new Date().toISOString(),
    type: "scheduled",
    message: "Luna Lab scheduled runtime heartbeat executed."
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
