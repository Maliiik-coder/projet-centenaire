"use client";

import { useEffect, useState } from "react";
import {
  APP_RESUME_PARAM,
  APP_RESUME_TAB_PARAM,
  isLocalEntryModeSelected,
  onboardingEntryPath,
  ONBOARDING_START_PARAM,
} from "@/lib/entryMode";
import type { AppData } from "@/lib/types";
import {
  LAUNCH_LOADING_DURATION_MS,
  LAUNCH_READY_DELAY_MS,
  type LaunchStage,
} from "@/components/centenaire/LaunchScreen";

export type ResumableTabId = "today" | "journal" | "insights" | "profile";

type AppEntryFlowOptions = {
  cloudUserId: string | null;
  data: AppData | null;
  onResumeTab: (tab: ResumableTabId) => void;
};

export function useAppEntryFlow({
  cloudUserId,
  data,
  onResumeTab,
}: AppEntryFlowOptions) {
  const [launchStage, setLaunchStage] = useState<LaunchStage>("loading");
  const [launchAcknowledged, setLaunchAcknowledged] = useState(false);
  const entrySearchParams =
    !data || typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);
  const onboardingPreview =
    process.env.NODE_ENV === "development" &&
    Boolean(entrySearchParams?.has("onboarding-preview"));
  const onboardingEntryRequested = Boolean(
    entrySearchParams?.has(ONBOARDING_START_PARAM),
  );
  const appResumeRequested = Boolean(
    data?.profile && entrySearchParams?.has(APP_RESUME_PARAM),
  );

  useEffect(() => {
    const sloganTimer = window.setTimeout(() => {
      setLaunchStage("slogan");
    }, LAUNCH_LOADING_DURATION_MS);
    const readyTimer = window.setTimeout(() => {
      setLaunchStage("ready");
    }, LAUNCH_READY_DELAY_MS);

    return () => {
      window.clearTimeout(sloganTimer);
      window.clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    if (!data?.profile || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(ONBOARDING_START_PARAM)) return;

    const cleanupTimer = window.setTimeout(() => {
      url.searchParams.delete(ONBOARDING_START_PARAM);
      setLaunchAcknowledged(true);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }, 0);

    return () => window.clearTimeout(cleanupTimer);
  }, [data?.profile]);

  useEffect(() => {
    if (!data?.profile || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(APP_RESUME_PARAM)) return;

    const cleanupTimer = window.setTimeout(() => {
      const requestedTab = url.searchParams.get(APP_RESUME_TAB_PARAM);
      if (
        requestedTab === "today" ||
        requestedTab === "journal" ||
        requestedTab === "insights" ||
        requestedTab === "profile"
      ) {
        onResumeTab(requestedTab);
      }
      url.searchParams.delete(APP_RESUME_PARAM);
      url.searchParams.delete(APP_RESUME_TAB_PARAM);
      setLaunchAcknowledged(true);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }, 0);

    return () => window.clearTimeout(cleanupTimer);
  }, [data?.profile, onResumeTab]);

  const start = () => {
    if (!data) return;

    if (onboardingPreview) {
      const nextPath = onboardingEntryPath(true);
      window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (data.profile || cloudUserId || isLocalEntryModeSelected()) {
      setLaunchAcknowledged(true);
      return;
    }

    const nextPath = onboardingEntryPath(false);
    window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  return {
    appResumeRequested,
    launchAcknowledged,
    launchStage,
    onboardingEntryRequested,
    onboardingPreview,
    start,
  };
}
