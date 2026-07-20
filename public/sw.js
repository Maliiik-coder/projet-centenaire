const CACHE_PREFIX = "projet-centenaire-fieldbook-";
const CACHE_NAME = `${CACHE_PREFIX}v9`;
const ADMIN_PATH_PREFIX = "/admin";
const PUBLIC_NAVIGATION_PATHS = ["/", "/offline"];
const PRECACHED_ASSET_PATHS = [
  "/brand/haru-wordmark-heart-v2.png",
  "/brand/haru-mark-heart-v2.png",
  "/icon-192-v4.png",
  "/icon-512-v4.png",
  "/icon-maskable-512-v4.png",
  "/apple-touch-icon-v4.png",
];
const APP_SHELL_PATHS = [
  ...PUBLIC_NAVIGATION_PATHS,
  ...PRECACHED_ASSET_PATHS,
];
const SENSITIVE_PATH_PREFIXES = [
  ADMIN_PATH_PREFIX,
  "/account",
  "/login",
  "/auth",
  "/health",
];
const AUTH_PARAMETER_NAMES = new Set([
  "access_token",
  "code",
  "error",
  "error_code",
  "error_description",
  "next",
  "provider",
  "redirect_to",
  "redirect_uri",
  "refresh_token",
  "state",
  "token",
  "type",
]);

function matchesPathPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isSensitivePath(pathname) {
  return SENSITIVE_PATH_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
}

function isApiPath(pathname) {
  return matchesPathPrefix(pathname, "/api");
}

function hasAuthenticationParameters(url) {
  return [...url.searchParams.keys()].some((name) =>
    AUTH_PARAMETER_NAMES.has(name.toLowerCase()),
  );
}

function isPublicNavigationCacheable(url) {
  return (
    PUBLIC_NAVIGATION_PATHS.includes(url.pathname) &&
    url.search === "" &&
    !isSensitivePath(url.pathname) &&
    !hasAuthenticationParameters(url)
  );
}

function isImmutableStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isExplicitlyPrecachedAsset(url) {
  return url.search === "" && PRECACHED_ASSET_PATHS.includes(url.pathname);
}

function isResponseCacheable(response) {
  return Boolean(
    response &&
      response.ok &&
      !response.redirected &&
      response.type !== "opaque" &&
      response.type !== "opaqueredirect",
  );
}

function isExactPublicNavigationResponse(requestUrl, response) {
  if (!isPublicNavigationCacheable(requestUrl) || !isResponseCacheable(response)) {
    return false;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html") || !response.url) {
    return false;
  }

  const responseUrl = new URL(response.url);
  return (
    responseUrl.origin === self.location.origin &&
    responseUrl.pathname === requestUrl.pathname &&
    responseUrl.search === requestUrl.search &&
    !isSensitivePath(responseUrl.pathname) &&
    !hasAuthenticationParameters(responseUrl)
  );
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    APP_SHELL_PATHS.map(async (path) => {
      const request = new Request(new URL(path, self.location.origin), {
        cache: "reload",
      });

      try {
        const response = await fetch(request);
        const requestUrl = new URL(request.url);
        const canStore = PUBLIC_NAVIGATION_PATHS.includes(path)
          ? isExactPublicNavigationResponse(requestUrl, response)
          : isResponseCacheable(response);

        if (canStore) {
          await cache.put(request, response.clone());
        }
      } catch {
        return undefined;
      }

      return undefined;
    }),
  );
}

async function handleNavigationRequest(request, url) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (isExactPublicNavigationResponse(url, response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (networkError) {
    if (isPublicNavigationCacheable(url)) {
      const exactResponse = await cache.match(request);
      if (exactResponse) {
        return exactResponse;
      }
    }

    if (url.pathname !== "/") {
      const rootResponse = await cache.match("/");
      if (rootResponse) {
        return rootResponse;
      }
    }

    const offlineResponse = await cache.match("/offline");
    if (offlineResponse) {
      return offlineResponse;
    }

    throw networkError;
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  if (isResponseCacheable(response)) {
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname === "/sw.js"
  ) {
    return;
  }

  if (
    request.mode === "navigate" &&
    matchesPathPrefix(url.pathname, ADMIN_PATH_PREFIX)
  ) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request, url));
    return;
  }

  if (
    isApiPath(url.pathname) ||
    isSensitivePath(url.pathname) ||
    hasAuthenticationParameters(url)
  ) {
    return;
  }

  if (isImmutableStaticAsset(url) || isExplicitlyPrecachedAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});
