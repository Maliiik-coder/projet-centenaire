"use client";

import { useMemo, useState } from "react";
import { calculateWeeklyAnalysis } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";
import { isInitialObservationDay } from "@/lib/observationPhase";
import { isLocalEntryModeSelected } from "@/lib/entryMode";
import { HaruAppShell, type AppTabId } from "@/components/centenaire/HaruAppShell";
import { LaunchScreen } from "@/components/centenaire/LaunchScreen";
import { TodayScreen } from "@/components/centenaire/TodayScreen";
import { JournalScreen } from "@/features/journal/JournalScreen";
import type { JournalViewMode } from "@/features/journal/journalModel";
import { MealTunnelScreen } from "@/features/meal/MealTunnelScreen";
import { useMealJournalController } from "@/features/meal/useMealJournalController";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { useProfileController } from "@/features/profile/useProfileController";
import { BehaviorProfileEditor } from "@/features/onboarding/BehaviorProfileEditor";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import {
  onboardingNameStep,
  onboardingWelcomeStep,
} from "@/features/onboarding/onboardingModel";
import { useOnboardingCompletion } from "@/features/onboarding/useOnboardingCompletion";
import { SmokingPanel } from "@/features/tracking/SmokingPanel";
import { useDailyTrackingController } from "@/features/tracking/useDailyTrackingController";
import {
  ConnectedResetScreen,
  LoadingScreen,
  MigrationDecisionScreen,
} from "@/features/startup/StartupScreens";
import { useAppEntryFlow } from "@/features/startup/useAppEntryFlow";
import { useCurrentDate } from "@/features/startup/useCurrentDate";
import { useAppDataSession } from "@/features/session/useAppDataSession";
import {
  buildTodayViewModel,
  formatKg,
  mealDetailLine,
  mealTagLabels,
  smokingEntryLine,
} from "@/features/today/todayViewModel";
import { isMigrationOperationStarted } from "@/services/localMigrationService";
import type { ISODate } from "@/lib/types";

const today = todayISO();

export function ProjetCentenaireApp() {
  const currentDate = useCurrentDate();
  const {
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
  } = useAppDataSession(currentDate);
  const {
    addMealToJournal,
    clearMealLongPress,
    closeMealActionMenu,
    closeMealPanel,
    deleteMealFromJournal,
    editingMealId,
    mealActionMenuId,
    mealDraft,
    mealOpen,
    openMealActionMenu,
    openMealEditor,
    openMealPanel,
    setMealDraft,
    startMealLongPress,
  } = useMealJournalController({
    cloudUserId,
    currentDate,
    data,
    saveData,
    setError,
  });
  const {
    behaviorEditorOpen,
    changeProfileEditorOpen,
    closeBehaviorEditor,
    importProfileData,
    openBehaviorEditor,
    profileDraft,
    profileEditorOpen,
    saveBehaviorAssessment,
    saveProfileChanges,
    setProfileDraft,
    updateProfilePreferences,
  } = useProfileController({
    cloudUserId,
    data,
    saveData,
    setError,
  });
  const {
    addSmokingEntry,
    addWeight,
    closeSmokingPanel,
    openSmokingPanel,
    smokingOpen,
  } = useDailyTrackingController({
    currentDate,
    data,
    saveData,
    setError,
  });
  const completeOnboarding = useOnboardingCompletion({ data, saveData });
  const [activeTab, setActiveTab] = useState<AppTabId>("today");
  const {
    appResumeRequested,
    launchAcknowledged,
    launchStage,
    onboardingEntryRequested,
    onboardingPreview,
    start: startApplication,
  } = useAppEntryFlow({
    cloudUserId,
    data,
    onResumeTab: setActiveTab,
  });
  const [journalView, setJournalView] = useState<JournalViewMode>("days");
  const [journalDate, setJournalDate] = useState<ISODate>(() => todayISO());
  const [journalWeekDate, setJournalWeekDate] = useState<ISODate>(() =>
    todayISO(),
  );

  const analysis = useMemo(
    () => (data ? calculateWeeklyAnalysis(data, currentDate) : null),
    [data, currentDate],
  );

  if (!onboardingEntryRequested && !appResumeRequested && !launchAcknowledged) {
    return (
      <LaunchScreen
        dataReady={Boolean(data)}
        stage={launchStage}
        onStart={startApplication}
      />
    );
  }

  if (connectedResetStatus !== "idle") {
    return (
      <ConnectedResetScreen
        failed={connectedResetStatus === "reload-required"}
      />
    );
  }

  if (!data || !analysis) {
    return <LoadingScreen />;
  }

  if (migrationDecisionRequired) {
    if ((!migrationCandidate && !migrationOperation) || !cloudUserId) {
      return <LoadingScreen />;
    }

    return (
      <MigrationDecisionScreen
        busy={migrationBusy}
        cloudEmail={cloudEmail}
        cloudHasProfile={Boolean(cloudSnapshot?.profile)}
        error={error}
        localHasProfile={Boolean(
          migrationCandidate?.data.profile ??
            migrationOperation?.sourceData.profile,
        )}
        onAttach={() => void attachLocalDataToAccount()}
        onExport={exportMigrationData}
        onKeepCloud={() => void startFromCloudData()}
        operationStarted={isMigrationOperationStarted(migrationOperation)}
      />
    );
  }

  const profile = data.profile;

  if (!profile || onboardingPreview) {
    return (
      <OnboardingFlow
        error={error}
        initialStep={
          onboardingEntryRequested ||
          cloudUserId ||
          isLocalEntryModeSelected()
            ? onboardingNameStep
            : onboardingWelcomeStep
        }
        preview={onboardingPreview}
        startDate={today}
        onComplete={completeOnboarding}
        onError={setError}
        onExit={() => {
          window.location.assign(
            onboardingPreview ? "/?onboarding-preview=1" : "/",
          );
        }}
      />
    );
  }

  if (behaviorEditorOpen) {
    return (
      <BehaviorProfileEditor
        initialAssessment={profile.initialBehaviorAssessment}
        onCancel={closeBehaviorEditor}
        onSave={saveBehaviorAssessment}
      />
    );
  }

  const todayViewModel = buildTodayViewModel(data, currentDate, analysis);
  if (!todayViewModel) {
    return <LoadingScreen />;
  }
  const {
    activePriorityText,
    dayNumber,
    latestKnownWeight,
    showMissionBlock,
    smokingEnabled,
    smokingSummary,
    todayMeals,
    todaySmokingEntries,
    todayWeights,
  } = todayViewModel;
  const renderToday = () => (
    <TodayScreen
      currentDate={currentDate}
      dayNumber={dayNumber}
      formatKg={formatKg}
      formatMealDetail={mealDetailLine}
      formatMealTags={mealTagLabels}
      formatSmokingEntry={smokingEntryLine}
      latestWeight={latestKnownWeight}
      mealActionMenuId={mealActionMenuId}
      repereText={activePriorityText}
      showRepere={showMissionBlock}
      smokingEnabled={smokingEnabled}
      smokingSummary={smokingSummary}
      todayMeals={todayMeals}
      todaySmokingEntries={todaySmokingEntries}
      todayWeights={todayWeights}
      weightFallbackKg={profile.startWeightKg}
      onCloseMealActionMenu={closeMealActionMenu}
      onDeleteMeal={deleteMealFromJournal}
      onEditMeal={openMealEditor}
      onLongPressMealCancel={clearMealLongPress}
      onLongPressMealStart={startMealLongPress}
      onOpenMeal={openMealPanel}
      onOpenMealActionMenu={openMealActionMenu}
      onOpenSmoking={openSmokingPanel}
      onSubmitWeight={addWeight}
    />
  );

  const renderJournal = () => (
    <JournalScreen
      currentDate={currentDate}
      data={data}
      date={journalDate}
      formatKg={formatKg}
      formatSmokingEntry={smokingEntryLine}
      pendingSync={pendingSync}
      profile={profile}
      smokingEnabled={smokingEnabled}
      view={journalView}
      weekDate={journalWeekDate}
      onDateChange={setJournalDate}
      onDeleteMeal={deleteMealFromJournal}
      onEditMeal={openMealEditor}
      onViewChange={setJournalView}
      onWeekDateChange={setJournalWeekDate}
    />
  );

  const renderProfile = () => (
    <ProfileScreen
      cloudEmail={cloudEmail}
      cloudUserId={cloudUserId}
      currentDate={currentDate}
      data={data}
      editorOpen={profileEditorOpen}
      formatKg={formatKg}
      profile={profile}
      profileDraft={profileDraft ?? profile}
      onChangeDraft={setProfileDraft}
      onChangeEditorOpen={changeProfileEditorOpen}
      onImportFile={importProfileData}
      onOpenBehaviorEditor={openBehaviorEditor}
      onPreferencesChange={updateProfilePreferences}
      onResetData={resetProfileData}
      onSaveProfile={saveProfileChanges}
      onSignOut={signOut}
      onValidationError={setError}
    />
  );

  const content = {
    today: renderToday,
    journal: renderJournal,
    profile: renderProfile,
  }[activeTab]();

  return (
    <HaruAppShell
      activeTab={activeTab}
      error={error}
      notice={notice}
      pendingSync={pendingSync}
      onTabChange={setActiveTab}
      overlays={
        <>
          {smokingOpen ? (
            <SmokingPanel
              onClose={closeSmokingPanel}
              onSubmit={addSmokingEntry}
            />
          ) : null}

          {mealOpen ? (
            <MealTunnelScreen
              draft={mealDraft}
              initialObservationActive={isInitialObservationDay(dayNumber)}
              submitLabel={editingMealId ? "Mettre à jour" : "Ajouter au carnet"}
              onAdd={addMealToJournal}
              onChange={setMealDraft}
              onClose={closeMealPanel}
              onError={setError}
            />
          ) : null}
        </>
      }
    >
      {content}
    </HaruAppShell>
  );
}
