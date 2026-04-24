const STATIC_CACHE_NAME = "question-call-static-v1";
const STATIC_CACHE_PREFIX = "question-call-static-";
const APP_SHELL_ASSETS = [
  "/",
  "/icon.png",
  "/apple-icon.png",
  "/favicon.ico",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        await cache.addAll(APP_SHELL_ASSETS);
      } catch (error) {
        console.error("[SW] Failed to precache app shell", error);
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName.startsWith(STATIC_CACHE_PREFIX) &&
            cacheName !== STATIC_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }

          return Promise.resolve(false);
        }),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (shouldHandleAsStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(focusOrOpenClient(targetUrl));
});

function shouldHandleAsStaticAsset(pathname) {
  return (
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/sounds/")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  try {
    return await fetch(request);
  } catch (error) {
    const fallbackResponse = await cache.match("/");
    if (fallbackResponse) {
      return fallbackResponse;
    }

    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    void networkPromise;
    return cachedResponse;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return Response.error();
}

function getPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch (_error) {
    return {
      body: event.data.text(),
    };
  }
}

async function handlePush(event) {
  const payload = getPushPayload(event);
  const title = payload.title || "Question Call";
  const body = payload.body || "You have a new update.";
  const targetUrl = payload.url || "/";
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const hasVisibleClient = windowClients.some(
    (client) => client.focused || client.visibilityState === "visible",
  );

  if (hasVisibleClient) {
    return;
  }

  await self.registration.showNotification(title, {
    body,
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/icon.png",
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: targetUrl,
    },
  });
}

async function focusOrOpenClient(targetUrl) {
  const absoluteTargetUrl = new URL(targetUrl, self.location.origin).href;
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if ("focus" in client) {
      const currentUrl = new URL(client.url);
      if (currentUrl.href === absoluteTargetUrl) {
        await client.focus();
        return;
      }
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(absoluteTargetUrl);
  }
}
