import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WorkerPolicy = {
  isApiPath(pathname: string): boolean;
  isImmutableStaticAsset(url: URL): boolean;
  isPublicNavigationCacheable(url: URL): boolean;
  handleNavigationRequest(request: unknown, url: URL): Promise<unknown>;
  handleStaticAssetRequest(request: unknown): Promise<unknown>;
};

type WorkerListener = (event: Record<string, unknown>) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkerPolicy(value: unknown): value is WorkerPolicy {
  return (
    isRecord(value) &&
    typeof value.isApiPath === "function" &&
    typeof value.isImmutableStaticAsset === "function" &&
    typeof value.isPublicNavigationCacheable === "function" &&
    typeof value.handleNavigationRequest === "function" &&
    typeof value.handleStaticAssetRequest === "function"
  );
}

function htmlResponse(url: string, redirected = false) {
  const response = {
    ok: true,
    redirected,
    type: "basic",
    url,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-type" ? "text/html" : null;
      },
    },
    clone() {
      return response;
    },
  };
  return response;
}

function createHarness() {
  const listeners = new Map<string, WorkerListener>();
  const cachePut = vi.fn().mockResolvedValue(undefined);
  const cacheMatch = vi.fn().mockResolvedValue(undefined);
  const cacheOpen = vi
    .fn()
    .mockResolvedValue({ match: cacheMatch, put: cachePut });
  const cacheDelete = vi.fn().mockResolvedValue(true);
  const cacheKeys = vi.fn().mockResolvedValue([
    "projet-centenaire-fieldbook-v2",
    "projet-centenaire-fieldbook-v3",
    "unrelated-cache",
  ]);
  const clientsClaim = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();
  const context: Record<string, unknown> = {
    URL,
    Request,
    Response,
    fetch: fetchMock,
    caches: {
      open: cacheOpen,
      keys: cacheKeys,
      delete: cacheDelete,
    },
    self: {
      location: { origin: "https://app.test" },
      clients: { claim: clientsClaim },
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      addEventListener(name: string, listener: WorkerListener) {
        listeners.set(name, listener);
      },
    },
  };
  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  vm.runInNewContext(
    `${source}\nglobalThis.__workerPolicy = { isApiPath, isImmutableStaticAsset, isPublicNavigationCacheable, handleNavigationRequest, handleStaticAssetRequest };`,
    context,
  );
  const policy = context.__workerPolicy;
  if (!isWorkerPolicy(policy)) {
    throw new Error("La politique du service worker n’est pas testable.");
  }

  return {
    cacheDelete,
    cacheMatch,
    cacheOpen,
    cachePut,
    clientsClaim,
    fetchMock,
    listeners,
    policy,
    source,
  };
}

describe("politique de cache du service worker", () => {
  it.each(["/account", "/login", "/auth/callback", "/health", "/admin"])(
    "ne considère jamais %s comme une navigation cacheable",
    (pathname) => {
      const { policy } = createHarness();
      expect(
        policy.isPublicNavigationCacheable(
          new URL(pathname, "https://app.test"),
        ),
      ).toBe(false);
    },
  );

  it("traite toute navigation admin en réseau seul", async () => {
    const { cacheOpen, fetchMock, listeners } = createHarness();
    const fetchListener = listeners.get("fetch");
    if (!fetchListener) throw new Error("Listener fetch manquant.");

    const request = {
      method: "GET",
      mode: "navigate",
      url: "https://app.test/admin/users",
    };
    const networkResponse = htmlResponse(request.url);
    let responsePromise: Promise<unknown> | null = null;
    fetchMock.mockResolvedValue(networkResponse);

    fetchListener({
      request,
      respondWith(value: Promise<unknown>) {
        responsePromise = value;
      },
    });

    if (!responsePromise) throw new Error("Réponse admin non enregistrée.");

    await expect(responsePromise).resolves.toBe(networkResponse);
    expect(fetchMock).toHaveBeenCalledWith(request);
    expect(cacheOpen).not.toHaveBeenCalled();
  });

  it("refuse aussi les paramètres OAuth sur la racine", () => {
    const { policy } = createHarness();
    expect(
      policy.isPublicNavigationCacheable(
        new URL("/?code=secret&state=oauth", "https://app.test"),
      ),
    ).toBe(false);
  });

  it("cache uniquement les assets Next immuables et jamais les API", () => {
    const { policy } = createHarness();
    expect(
      policy.isImmutableStaticAsset(
        new URL("/_next/static/chunk.js", "https://app.test"),
      ),
    ).toBe(true);
    expect(
      policy.isImmutableStaticAsset(
        new URL("/_next/image", "https://app.test"),
      ),
    ).toBe(false);
    expect(policy.isApiPath("/api/example")).toBe(true);
  });

  it("ne stocke jamais une réponse de /account, notamment sous /", async () => {
    const { cachePut, fetchMock, policy } = createHarness();
    const request = { url: "https://app.test/account" };
    fetchMock.mockResolvedValue(htmlResponse(request.url));

    await policy.handleNavigationRequest(request, new URL(request.url));

    expect(cachePut).not.toHaveBeenCalled();
    expect(
      cachePut.mock.calls.some(([key]) => key === "/"),
    ).toBe(false);
  });

  it("ne sert jamais une ancienne page compte lors d’une navigation hors ligne", async () => {
    const { cacheMatch, fetchMock, policy } = createHarness();
    const request = { url: "https://app.test/account" };
    const staleAccountResponse = { page: "account", email: "a@example.test" };
    const publicRootResponse = { page: "public-root" };
    fetchMock.mockRejectedValue(new Error("network failed"));
    cacheMatch.mockImplementation(async (key: unknown) => {
      if (key === request) return staleAccountResponse;
      if (key === "/") return publicRootResponse;
      return undefined;
    });

    const response = await policy.handleNavigationRequest(
      request,
      new URL(request.url),
    );

    expect(response).toBe(publicRootResponse);
    expect(response).not.toBe(staleAccountResponse);
    expect(cacheMatch).not.toHaveBeenCalledWith(request);
  });

  it("stocke la vraie racine sous sa requête exacte", async () => {
    const { cachePut, fetchMock, policy } = createHarness();
    const request = { url: "https://app.test/" };
    fetchMock.mockResolvedValue(htmlResponse(request.url));

    await policy.handleNavigationRequest(request, new URL(request.url));

    expect(cachePut).toHaveBeenCalledTimes(1);
    expect(cachePut).toHaveBeenCalledWith(request, expect.any(Object));
  });

  it("ne cache pas une redirection d’authentification", async () => {
    const { cachePut, fetchMock, policy } = createHarness();
    const request = { url: "https://app.test/" };
    fetchMock.mockResolvedValue(
      htmlResponse("https://app.test/login", true),
    );

    await policy.handleNavigationRequest(request, new URL(request.url));

    expect(cachePut).not.toHaveBeenCalled();
  });

  it("ne renvoie jamais /offline en HTML lorsqu’un asset JS échoue", async () => {
    const { cacheMatch, fetchMock, policy } = createHarness();
    const request = { url: "https://app.test/_next/static/chunk.js" };
    fetchMock.mockRejectedValue(new Error("network failed"));

    await expect(policy.handleStaticAssetRequest(request)).rejects.toThrow(
      "network failed",
    );
    expect(cacheMatch).toHaveBeenCalledWith(request);
    expect(
      cacheMatch.mock.calls.some(([key]) => key === "/offline"),
    ).toBe(false);
  });

  it("supprime seulement les anciens caches du projet avant clients.claim", async () => {
    const { cacheDelete, clientsClaim, listeners } = createHarness();
    const activate = listeners.get("activate");
    if (!activate) throw new Error("Listener activate manquant.");
    let activation: Promise<unknown> | null = null;
    activate({
      waitUntil(value: Promise<unknown>) {
        activation = value;
      },
    });
    if (!activation) throw new Error("Activation non enregistrée.");

    await activation;

    expect(cacheDelete).toHaveBeenCalledWith(
      "projet-centenaire-fieldbook-v2",
    );
    expect(cacheDelete).not.toHaveBeenCalledWith("unrelated-cache");
    expect(clientsClaim).toHaveBeenCalledOnce();
  });

  it("n’emploie plus l’ancien cache dangereux", () => {
    const { source } = createHarness();
    expect(source).toContain('const CACHE_NAME = `${CACHE_PREFIX}v11`;');
    expect(source).not.toContain('"projet-centenaire-fieldbook-v2"');
    expect(source).not.toContain('cachePut("/", response)');
  });
});
