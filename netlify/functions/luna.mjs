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
    type: req.method === "GET" ? "manual" : "request",
    message: "Luna Lab external runtime executed."
  };

  current.invocationCount += 1;
  current.events = [event, ...current.events].slice(0, 50);

  await store.setJSON(key, current);

  return new Response(JSON.stringify({
    ok: true,
    invocationCount: current.invocationCount,
    latest: event,
    boundary:
      "Execution is limited to the permissions and runtime granted to this deployed function."
  }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
};

export const config = {
  path: "/luna"
};
