"use client";

import { useEffect } from "react";

const CACHE_PREFIX = "projet-centenaire-";

function clearDevelopmentServiceWorker() {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((registration) => registration.unregister()),
      ),
    )
    .catch(() => undefined);

  if ("caches" in window) {
    window.caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX))
            .map((key) => window.caches.delete(key)),
        ),
      )
      .catch(() => undefined);
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      clearDevelopmentServiceWorker();
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // L'application reste utilisable sans service worker.
    });
  }, []);

  return null;
}
