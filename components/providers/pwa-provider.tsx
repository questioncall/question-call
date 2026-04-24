"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { PWAInstallPrompt } from "@/components/providers/pwa-install-prompt";
import { SHOULD_ENABLE_PWA } from "@/lib/pwa";

export function PWAProvider() {
  const hasShownUpdateToastRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (!SHOULD_ENABLE_PWA) {
      return;
    }

    let isMounted = true;

    const showUpdateToast = () => {
      if (hasShownUpdateToastRef.current) {
        return;
      }

      hasShownUpdateToastRef.current = true;

      toast.info("A new version of Question Call is ready.", {
        duration: 15000,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    };

    const attachInstallingWorkerListener = (worker: ServiceWorker | null) => {
      if (!worker) {
        return;
      }

      worker.addEventListener("statechange", () => {
        if (!isMounted) {
          return;
        }

        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateToast();
        }
      });
    };

    void navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        if (!isMounted) {
          return;
        }

        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdateToast();
        }

        attachInstallingWorkerListener(registration.installing);

        registration.addEventListener("updatefound", () => {
          attachInstallingWorkerListener(registration.installing);
        });
      })
      .catch((error) => {
        console.error("[PWA] Failed to register service worker", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return <PWAInstallPrompt />;
}
