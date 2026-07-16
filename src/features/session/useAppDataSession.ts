"use client";

import { useEffect, useRef, useState } from "react";
import { isCurrentCloudAttempt } from "@/lib/cloudAttempt";
import {
  CLOUD_RECOVERY_DELAY_MS,
  withCloudReadTimeout,
} from "@/lib/cloudRead";
import { clearLocalEntryMode } from "@/lib/entryMode";
import { materializePendingCloudState } from "@/lib/pendingCloudState";
import {
  createEmptyData,
  guestStorageScope,
  localDataStore,
  normalizeData,
  userStorageScope,
} from "@/lib/storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  AppData,
  ISODate,
  MealMutation,
  NonMealMutationDraft,
} from "@/lib/types";
import { loadCloudData } from "@/services/cloudDataService";
import { resetConnectedLocalData } from "@/services/connectedResetService";
import {
  canAttemptAutomaticCloudWrite,
  completeMigrationOperation,
  createLocalMigrationSources,
  discardPreparedMigrationOperation,
  executeMigrationOperation,
  getLocalMigrationCandidate,
  getMigrationOperation,
  isMigrationDecisionRequired,
  isMigrationOperationStarted,
  keepOnlyCloudData,
  mergeLocalAndCloudData,
  prepareMigrationOperation,
  reconcilePendingAfterCloudLoad,
  type CloudStatus,
  type LocalMigrationSources,
  type MigrationOperation,
} from "@/services/localMigrationService";
import {
  clearLegacyPendingSyncQuarantine,
  clearRecoverableLegacySnapshots,
  getPendingCloudSnapshot,
  getRecoverableLegacySnapshot,
  hasPendingCloudWork,
  processPendingCloudWork,
  quarantineLegacyPendingSyncData,
  queueCloudMutations,
} from "@/services/offlineSyncService";

type ConnectedResetStatus = "idle" | "running" | "reload-required";

export type SaveAppData = (
  next: AppData,
  message?: string,
  nonMealMutations?: NonMealMutationDraft[],
  mealMutations?: MealMutation[],
) => void;

const emptyMigrationSources: LocalMigrationSources = {
  guest: null,
  legacy: null,
};

async function materializeUserPendingState(
  baseData: AppData,
  userId: string,
): Promise<AppData> {
  const snapshot = await getPendingCloudSnapshot(userId);
  return materializePendingCloudState(baseData, snapshot.mutations);
}

function exportJson(payload: AppData, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useAppDataSession(currentDate: ISODate) {
  const [data, setData] = useState<AppData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudEmail, setCloudEmail] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() =>
    isSupabaseConfigured() ? "loading" : "not-configured",
  );
  const [cloudSnapshot, setCloudSnapshot] = useState<AppData | null>(null);
  const [migrationSources, setMigrationSources] =
    useState<LocalMigrationSources>(emptyMigrationSources);
  const [migrationOperation, setMigrationOperation] =
    useState<MigrationOperation | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [connectedResetStatus, setConnectedResetStatus] =
    useState<ConnectedResetStatus>("idle");
  const cloudGenerationRef = useRef(0);
  const localEditGenerationRef = useRef(0);
  const activeCloudUserIdRef = useRef<string | null>(null);
  const cloudRecoveryInFlightRef = useRef(false);

  const migrationCandidate = getLocalMigrationCandidate(
    migrationSources,
    migrationOperation?.source,
  );
  const migrationDecisionRequired = isMigrationDecisionRequired(
    cloudStatus,
    migrationCandidate,
    migrationOperation,
  );

  useEffect(() => {
    let cancelled = false;
    const generation = cloudGenerationRef.current + 1;
    cloudGenerationRef.current = generation;
    activeCloudUserIdRef.current = null;

    const generationIsCurrent = () =>
      !cancelled && cloudGenerationRef.current === generation;

    const synchronizeAfterCloudRead = async (
      supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
      userId: string,
    ) => {
      try {
        while (true) {
          const reconciled = await reconcilePendingAfterCloudLoad(
            supabase,
            userId,
            () => localEditGenerationRef.current,
          );

          if (
            !isCurrentCloudAttempt(
              cloudGenerationRef.current,
              generation,
              activeCloudUserIdRef.current,
              userId,
            )
          ) {
            return;
          }

          if (
            reconciled.localEditGeneration !== localEditGenerationRef.current ||
            (await hasPendingCloudWork(userId))
          ) {
            continue;
          }

          localDataStore.save(userStorageScope(userId), reconciled.data);
          setCloudStatus("ready");
          setCloudSnapshot(reconciled.data);
          setData(reconciled.data);
          setPendingSync(false);
          setNotice("Données en attente synchronisées.");
          return;
        }
      } catch {
        if (
          isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            userId,
          )
        ) {
          const visibleData = await materializeUserPendingState(
            localDataStore.load(userStorageScope(userId)),
            userId,
          );
          setCloudStatus("unavailable");
          setCloudSnapshot(null);
          setData(visibleData);
          setPendingSync(true);
          setNotice("Données en attente de synchronisation.");
        }
      }
    };

    const loadData = async () => {
      localDataStore.quarantineLegacyData();
      const legacyPendingData = quarantineLegacyPendingSyncData();
      const guestData = localDataStore.load(guestStorageScope);
      const legacyStoredData = localDataStore.getLegacyQuarantine();
      const legacyData =
        legacyStoredData && legacyPendingData
          ? mergeLocalAndCloudData(legacyStoredData, legacyPendingData)
          : legacyStoredData ?? legacyPendingData;
      let localMigrationSources = createLocalMigrationSources(
        guestData,
        legacyData,
      );
      let sessionUserId: string | null = null;
      let sessionEmail: string | null = null;
      let userCache: AppData | null = null;

      try {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          activeCloudUserIdRef.current = null;
          setCloudStatus("not-configured");
          setCloudSnapshot(null);
          setMigrationSources(emptyMigrationSources);
          setMigrationOperation(null);
          setData(guestData);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!generationIsCurrent()) {
          return;
        }

        sessionUserId = session?.user.id ?? null;
        sessionEmail = session?.user.email ?? null;
        setPendingSync(
          sessionUserId ? await hasPendingCloudWork(sessionUserId) : false,
        );
        if (sessionUserId) {
          const ownedLegacyData = await getRecoverableLegacySnapshot(
            sessionUserId,
          );
          if (ownedLegacyData) {
            localMigrationSources = createLocalMigrationSources(
              guestData,
              legacyData
                ? mergeLocalAndCloudData(legacyData, ownedLegacyData)
                : ownedLegacyData,
            );
          }
        }

        const {
          data: { user },
        } = await withCloudReadTimeout(supabase.auth.getUser());

        if (!generationIsCurrent()) {
          return;
        }

        if (!user) {
          activeCloudUserIdRef.current = null;
          setCloudUserId(null);
          setCloudEmail(null);
          setCloudStatus("ready");
          setCloudSnapshot(null);
          setMigrationSources(emptyMigrationSources);
          setMigrationOperation(null);
          setPendingSync(false);
          setData(guestData);
          return;
        }

        const userScope = userStorageScope(user.id);
        sessionUserId = user.id;
        sessionEmail = user.email ?? null;
        userCache = localDataStore.load(userScope);
        const storedMigrationOperation = getMigrationOperation(user.id);
        const localMigrationCandidate = getLocalMigrationCandidate(
          localMigrationSources,
          storedMigrationOperation?.source,
        );
        const hadPendingSync = await hasPendingCloudWork(user.id);
        activeCloudUserIdRef.current = user.id;
        setCloudUserId(user.id);
        setCloudEmail(user.email ?? null);
        setMigrationSources(localMigrationSources);
        setMigrationOperation(storedMigrationOperation);

        const cloudData = await withCloudReadTimeout(
          loadCloudData(supabase, user.id),
        );

        if (
          !isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            user.id,
          )
        ) {
          return;
        }

        const hasPendingNow = await hasPendingCloudWork(user.id);
        setCloudStatus("ready");
        setCloudSnapshot(cloudData);
        setPendingSync(hasPendingNow);

        if (hasPendingNow) {
          const visibleData = await materializeUserPendingState(cloudData, user.id);
          localDataStore.save(userScope, visibleData);
          setData(visibleData);
        } else {
          localDataStore.save(userScope, cloudData);
          setData(cloudData);
        }

        if (
          navigator.onLine &&
          (hadPendingSync || hasPendingNow) &&
          localMigrationCandidate === null &&
          storedMigrationOperation === null
        ) {
          void synchronizeAfterCloudRead(supabase, user.id);
        }
      } catch {
        if (!generationIsCurrent()) {
          return;
        }

        const fallbackBaseData =
          userCache ??
          (sessionUserId
            ? localDataStore.load(userStorageScope(sessionUserId))
            : guestData);
        const fallbackData = sessionUserId
          ? await materializeUserPendingState(fallbackBaseData, sessionUserId)
          : fallbackBaseData;

        activeCloudUserIdRef.current = sessionUserId;
        setCloudUserId(sessionUserId);
        setCloudEmail(sessionEmail);
        setCloudStatus("unavailable");
        setCloudSnapshot(null);
        setMigrationSources(
          sessionUserId ? localMigrationSources : emptyMigrationSources,
        );
        setMigrationOperation(
          sessionUserId ? getMigrationOperation(sessionUserId) : null,
        );
        setPendingSync(
          sessionUserId ? await hasPendingCloudWork(sessionUserId) : false,
        );
        setData(fallbackData);
        setError(
          sessionUserId
            ? "Compte connecté. La synchronisation cloud est retardée ; un nouvel essai va démarrer automatiquement."
            : "Connexion cloud indisponible. Le carnet reste local pour le moment.",
        );
      }
    };

    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      cancelled = true;
      if (cloudGenerationRef.current === generation) {
        cloudGenerationRef.current += 1;
      }
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!cloudUserId) {
      return;
    }

    const syncOnOnline = async () => {
      const supabase = getSupabaseBrowserClient();
      const localMigrationCandidate = getLocalMigrationCandidate(
        migrationSources,
        migrationOperation?.source,
      );

      if (
        !supabase ||
        isMigrationDecisionRequired(
          cloudStatus,
          localMigrationCandidate,
          migrationOperation,
        ) ||
        (cloudStatus === "ready" && !(await hasPendingCloudWork(cloudUserId)))
      ) {
        return;
      }

      if (cloudRecoveryInFlightRef.current) {
        return;
      }

      cloudRecoveryInFlightRef.current = true;
      const generation = cloudGenerationRef.current + 1;
      cloudGenerationRef.current = generation;
      activeCloudUserIdRef.current = cloudUserId;

      try {
        const {
          data: { user },
        } = await withCloudReadTimeout(supabase.auth.getUser());

        if (!user || user.id !== cloudUserId) {
          return;
        }

        const cloudData = await withCloudReadTimeout(
          loadCloudData(supabase, cloudUserId),
        );

        if (
          !isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            cloudUserId,
          )
        ) {
          return;
        }

        const currentOperation = getMigrationOperation(cloudUserId);
        const currentCandidate = getLocalMigrationCandidate(
          migrationSources,
          currentOperation?.source,
        );
        setCloudStatus("ready");
        setError(null);
        setCloudSnapshot(cloudData);
        setMigrationOperation(currentOperation);
        setPendingSync(await hasPendingCloudWork(cloudUserId));

        const visibleCloudData = await materializeUserPendingState(
          cloudData,
          cloudUserId,
        );
        localDataStore.save(userStorageScope(cloudUserId), visibleCloudData);
        setData(visibleCloudData);

        if (currentCandidate || currentOperation) {
          return;
        }

        if (await hasPendingCloudWork(cloudUserId)) {
          while (true) {
            const reconciled = await reconcilePendingAfterCloudLoad(
              supabase,
              cloudUserId,
              () => localEditGenerationRef.current,
            );

            if (
              !isCurrentCloudAttempt(
                cloudGenerationRef.current,
                generation,
                activeCloudUserIdRef.current,
                cloudUserId,
              )
            ) {
              return;
            }

            if (
              reconciled.localEditGeneration !== localEditGenerationRef.current ||
              (await hasPendingCloudWork(cloudUserId))
            ) {
              continue;
            }

            localDataStore.save(userStorageScope(cloudUserId), reconciled.data);
            setCloudSnapshot(reconciled.data);
            setData(reconciled.data);
            setPendingSync(false);
            setNotice("Données en attente synchronisées.");
            return;
          }
        }

        localDataStore.save(userStorageScope(cloudUserId), cloudData);
        setData(cloudData);
        if (cloudStatus === "unavailable") {
          setNotice("Synchronisation cloud rétablie.");
        }
      } catch {
        if (
          isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            cloudUserId,
          )
        ) {
          const visibleData = await materializeUserPendingState(
            localDataStore.load(userStorageScope(cloudUserId)),
            cloudUserId,
          );
          setCloudStatus("unavailable");
          setCloudSnapshot(null);
          setData(visibleData);
          setPendingSync(await hasPendingCloudWork(cloudUserId));
        }
      } finally {
        cloudRecoveryInFlightRef.current = false;
      }
    };

    const retryWhenVisible = () => {
      if (
        cloudStatus === "unavailable" &&
        document.visibilityState === "visible"
      ) {
        void syncOnOnline();
      }
    };

    const recoveryTimer =
      cloudStatus === "unavailable" && navigator.onLine
        ? window.setTimeout(() => {
            void syncOnOnline();
          }, CLOUD_RECOVERY_DELAY_MS)
        : null;

    window.addEventListener("online", syncOnOnline);
    window.addEventListener("focus", retryWhenVisible);
    document.addEventListener("visibilitychange", retryWhenVisible);

    return () => {
      window.removeEventListener("online", syncOnOnline);
      window.removeEventListener("focus", retryWhenVisible);
      document.removeEventListener("visibilitychange", retryWhenVisible);
      if (recoveryTimer !== null) {
        window.clearTimeout(recoveryTimer);
      }
    };
  }, [cloudStatus, cloudUserId, migrationOperation, migrationSources]);

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [notice, error]);

  useEffect(() => {
    document.documentElement.dataset.pcTheme = data?.profile?.darkMode
      ? "dark"
      : "light";
  }, [data?.profile?.darkMode]);

  const persistData = async (
    normalized: AppData,
    nonMealMutations: NonMealMutationDraft[],
    mealMutations: MealMutation[] = [],
  ): Promise<boolean> => {
    if (migrationDecisionRequired) {
      return false;
    }

    const supabase = getSupabaseBrowserClient();
    const scope = cloudUserId ? userStorageScope(cloudUserId) : guestStorageScope;

    localDataStore.save(scope, normalized);
    localEditGenerationRef.current += 1;

    if (
      cloudUserId &&
      (mealMutations.length > 0 || nonMealMutations.length > 0)
    ) {
      try {
        await queueCloudMutations(
          cloudUserId,
          nonMealMutations,
          mealMutations,
        );
        setPendingSync(true);
      } catch {
        setError(
          "La modification reste affichée, mais elle n’a pas pu être sécurisée sur cet appareil. Réessaie avant de fermer l’application.",
        );
        return false;
      }
    }

    if (!cloudUserId || !supabase) {
      return true;
    }

    if (!(await hasPendingCloudWork(cloudUserId))) {
      return true;
    }

    if (
      !navigator.onLine ||
      !canAttemptAutomaticCloudWrite(cloudStatus, migrationDecisionRequired)
    ) {
      return true;
    }

    const generation = cloudGenerationRef.current;
    const userId = cloudUserId;

    try {
      await processPendingCloudWork(supabase, userId);

      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setPendingSync(await hasPendingCloudWork(userId));
      }
      return true;
    } catch {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setPendingSync(true);
        setNotice("Données en attente de synchronisation.");
      }
      return true;
    }
  };

  const saveData = (
    next: AppData,
    message: string | undefined,
    nonMealMutations: NonMealMutationDraft[] = [],
    mealMutations: MealMutation[] = [],
  ) => {
    if (migrationDecisionRequired) {
      return;
    }

    const normalized = normalizeData(next);
    setData(normalized);
    setError(null);
    void persistData(normalized, nonMealMutations, mealMutations).then(
      (secured) => {
        if (message && secured) setNotice(message);
      },
    );
  };

  const completeMigrationDecision = async (
    resolvedCloudData: AppData,
    source: keyof LocalMigrationSources,
    message: string,
    reconcileNormalPending = true,
    completedOperationId?: string,
  ) => {
    if (!cloudUserId) {
      return;
    }

    const generation = cloudGenerationRef.current;

    if (
      !isCurrentCloudAttempt(
        cloudGenerationRef.current,
        generation,
        activeCloudUserIdRef.current,
        cloudUserId,
      )
    ) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Connexion cloud indisponible. Les données restent sur cet appareil.");
      return;
    }

    if (
      completedOperationId &&
      !(await completeMigrationOperation(cloudUserId, completedOperationId))
    ) {
      throw new Error("L’opération de migration n’a pas pu être finalisée.");
    }

    if (source === "guest") {
      localDataStore.reset(guestStorageScope);
    } else {
      localDataStore.clearLegacyQuarantine();
      clearLegacyPendingSyncQuarantine();
      await clearRecoverableLegacySnapshots(cloudUserId);
    }
    const remainingSources: LocalMigrationSources = {
      ...migrationSources,
      [source]: null,
    };
    const nextCandidate = getLocalMigrationCandidate(remainingSources);

    setMigrationSources(remainingSources);
    setMigrationOperation(null);
    setCloudStatus("ready");
    setCloudSnapshot(resolvedCloudData);

    const hasNormalPending = await hasPendingCloudWork(cloudUserId);
    if (hasNormalPending) {
      const visibleData = await materializeUserPendingState(
        resolvedCloudData,
        cloudUserId,
      );
      localDataStore.save(userStorageScope(cloudUserId), visibleData);
      setData(visibleData);
      setPendingSync(true);
    } else {
      localDataStore.save(userStorageScope(cloudUserId), resolvedCloudData);
      setData(resolvedCloudData);
      setPendingSync(false);
    }

    if (nextCandidate || !reconcileNormalPending || !hasNormalPending) {
      setNotice(message);
      return;
    }

    try {
      while (true) {
        const reconciled = await reconcilePendingAfterCloudLoad(
          supabase,
          cloudUserId,
          () => localEditGenerationRef.current,
        );

        if (
          !isCurrentCloudAttempt(
            cloudGenerationRef.current,
            generation,
            activeCloudUserIdRef.current,
            cloudUserId,
          )
        ) {
          return;
        }

        if (
          reconciled.localEditGeneration !== localEditGenerationRef.current ||
          (await hasPendingCloudWork(cloudUserId))
        ) {
          continue;
        }

        localDataStore.save(userStorageScope(cloudUserId), reconciled.data);
        setCloudSnapshot(reconciled.data);
        setData(reconciled.data);
        setPendingSync(false);
        setNotice(message);
        return;
      }
    } catch {
      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          cloudUserId,
        )
      ) {
        return;
      }

      setCloudStatus("unavailable");
      setCloudSnapshot(null);
      const visibleData = await materializeUserPendingState(
        localDataStore.load(userStorageScope(cloudUserId)),
        cloudUserId,
      );
      setData(visibleData);
      setPendingSync(true);
      setError(
        `${message} La synchronisation des autres données reprendra après le prochain chargement cloud.`,
      );
    }
  };

  const attachLocalDataToAccount = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !cloudUserId || (!migrationCandidate && !migrationOperation)) {
      return;
    }

    const generation = cloudGenerationRef.current;
    const userId = cloudUserId;
    setMigrationBusy(true);
    setError(null);

    try {
      let operation = migrationOperation;

      if (!operation) {
        if (!migrationCandidate) {
          return;
        }

        operation = await prepareMigrationOperation(
          supabase,
          userId,
          migrationCandidate.source,
          migrationCandidate.data,
        );
      }

      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        return;
      }

      setMigrationOperation(operation);
      const merged = await executeMigrationOperation(supabase, operation);

      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        return;
      }

      await completeMigrationDecision(
        merged,
        operation.source,
        "Données associées au compte.",
        true,
        operation.operationId,
      );
    } catch {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setMigrationOperation(getMigrationOperation(userId));
        setError(
          "Association interrompue. Les données sont conservées et la même opération peut être terminée.",
        );
      }
    } finally {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setMigrationBusy(false);
      }
    }
  };

  const startFromCloudData = async () => {
    const supabase = getSupabaseBrowserClient();
    const source = migrationCandidate?.source ?? migrationOperation?.source;

    if (!supabase || !cloudUserId || !source) {
      return;
    }

    if (isMigrationOperationStarted(migrationOperation)) {
      return;
    }

    const generation = cloudGenerationRef.current;
    const userId = cloudUserId;
    setMigrationBusy(true);
    setError(null);

    try {
      let decisionOperation = migrationOperation;
      if (!decisionOperation && migrationCandidate) {
        decisionOperation = await prepareMigrationOperation(
          supabase,
          userId,
          migrationCandidate.source,
          migrationCandidate.data,
        );
        setMigrationOperation(decisionOperation);
      }

      const cloudData = await keepOnlyCloudData(supabase, userId);

      if (
        !isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        return;
      }

      if (decisionOperation) {
        const discarded = await discardPreparedMigrationOperation(
          userId,
          decisionOperation.operationId,
          decisionOperation.revision,
        );
        if (!discarded) {
          throw new Error("La décision de migration a déjà été prise ailleurs.");
        }
      }

      await completeMigrationDecision(
        cloudData,
        source,
        "Données de l’appareil ignorées. Le compte reste intact.",
        false,
      );
    } catch {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setError(
          "Le compte ne peut pas être chargé. Les données de cet appareil sont conservées.",
        );
      }
    } finally {
      if (
        isCurrentCloudAttempt(
          cloudGenerationRef.current,
          generation,
          activeCloudUserIdRef.current,
          userId,
        )
      ) {
        setMigrationBusy(false);
      }
    }
  };

  const exportMigrationData = () => {
    const exportData =
      migrationCandidate?.data ?? migrationOperation?.sourceData ?? null;

    if (!exportData) {
      return;
    }

    exportJson(exportData, `projet-centenaire-local-${currentDate}.json`);
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    cloudGenerationRef.current += 1;
    activeCloudUserIdRef.current = null;
    if (cloudUserId && data) {
      localDataStore.save(userStorageScope(cloudUserId), data);
    }
    await supabase?.auth.signOut();
    clearLocalEntryMode();
    const guestData = localDataStore.load(guestStorageScope);
    setCloudUserId(null);
    setCloudEmail(null);
    setCloudStatus("ready");
    setCloudSnapshot(null);
    setMigrationSources(emptyMigrationSources);
    setMigrationOperation(null);
    setPendingSync(false);
    setData(guestData);
    window.location.assign("/login");
  };

  const resetProfileData = async () => {
    if (cloudUserId) {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setError("Connexion cloud indisponible.");
        return;
      }

      cloudGenerationRef.current += 1;
      activeCloudUserIdRef.current = cloudUserId;
      setConnectedResetStatus("running");

      try {
        const cloudData = await resetConnectedLocalData(supabase, cloudUserId);
        localEditGenerationRef.current += 1;
        setCloudStatus("ready");
        setCloudSnapshot(cloudData);
        setMigrationOperation(null);
        setData(cloudData);
        setPendingSync(false);
        setNotice("Données locales réinitialisées.");
        setConnectedResetStatus("idle");
      } catch {
        setData(createEmptyData());
        setCloudStatus("unavailable");
        setCloudSnapshot(null);
        setPendingSync(false);
        setConnectedResetStatus("reload-required");
      }
      return;
    }

    const reset = localDataStore.reset(guestStorageScope);
    setData(reset);
    setMigrationSources((current) => ({
      ...current,
      guest: null,
    }));
    setPendingSync(false);
    setNotice("Carnet local réinitialisé.");
  };

  return {
    attachLocalDataToAccount,
    cloudEmail,
    cloudSnapshot,
    cloudUserId,
    connectedResetStatus,
    data,
    error,
    exportMigrationData,
    migrationBusy,
    migrationCandidate,
    migrationDecisionRequired,
    migrationOperation,
    notice,
    pendingSync,
    resetProfileData,
    saveData,
    setError,
    signOut,
    startFromCloudData,
  };
}
