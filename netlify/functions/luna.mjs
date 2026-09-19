import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("luna-lab");
  const key = "runtime.json";

  const current = (await store.get(key, { type: "json" })) || {
    invocationCount: 0,
    events: []
  };

  return new Response(JSON.stringify({
    ok: true,
    invocationCount: current.invocationCount,
    latest: current.events?.[0] || null,
    events: current.events || [],
    runtime: "Netlify Function + Netlify Blobs",
    ai: "Netlify AI Gateway"
  }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
};

export const config = {
  path: "/luna"
};
