/* Handwritten BASE_URL-safe service worker; no Workbox/runtime dependency. */
const BASE = new URL(self.registration.scope).pathname;
const SHELL_CACHE = "tasks-shell-v4";
const API_CACHE = "tasks-api-v4";
const API_PATHS = new Set(["/api/tasks", "/api/shopping", "/api/settings"]);

function markFallback(response) {
  const headers = new Headers(response.headers);
  headers.set("x-offline-fallback", "1");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function underBase(pathname) {
  return pathname === BASE.slice(0, -1) || pathname.startsWith(BASE);
}

function privateAuthPath(pathname) {
  return pathname.startsWith("/auth/") || pathname === "/go/fridge" ||
    pathname.startsWith("/api/fridge/") || pathname === "/fridge/auth/handoff";
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const root = new URL(BASE, self.location.origin);
  const response = await fetch(root);
  await cache.put(root, response.clone());
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((asset) => asset && !asset.startsWith("http") && !asset.startsWith("//"))
    .map((asset) => new URL(asset, root).href);
  const manifestUrl = assets.find((asset) => asset.endsWith("/manifest.json"));
  if (manifestUrl) {
    try {
      const manifestResponse = await fetch(manifestUrl);
      if (manifestResponse.ok) {
        await cache.put(manifestUrl, manifestResponse.clone());
        const manifest = await manifestResponse.json();
        for (const icon of manifest.icons || []) {
          if (icon.src) assets.push(new URL(icon.src, manifestUrl).href);
        }
      }
    } catch {
      // The HTML shell remains installable when an optional manifest is unavailable.
    }
  }
  await Promise.allSettled(assets.map(async (asset) => {
    const assetResponse = await fetch(asset);
    if (assetResponse.ok) await cache.put(asset, assetResponse);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const current = new Set([SHELL_CACHE, API_CACHE]);
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("tasks-") && !current.has(name))
      .map((name) => caches.delete(name)));
    // Remove only old private/auth responses; keep Tasks/Shopping offline data.
    for (const name of current) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (privateAuthPath(new URL(request.url).pathname)) await cache.delete(request);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.headers.get("x-offline-probe") === "1") return;
  const url = new URL(request.url);
  // Never intercept or persist login, one-time tokens or authenticated redirects.
  if (privateAuthPath(url.pathname)) return;
  if (API_PATHS.has(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await (await caches.open(API_CACHE)).match(request);
        return cached ? markFallback(cached) :
          new Response("Offline", {
            status: 503,
            statusText: "Offline",
            headers: { "x-offline-fallback": "1" },
          });
      }
    })());
    return;
  }
  if (!underBase(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return (await cache.match(request)) ||
        cache.match(new URL(BASE, self.location.origin)) ||
        new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});