import type {
  FeedbackBodySignal,
  FeedbackCompletion,
  FeedbackDifficulty,
  GeneratedWorkoutSession,
  SportLocalData,
  WorkoutFeedback,
  WorkoutStatus,
} from "@/lib/sport/types";

function feedbackId(sessionId: string, createdAt: string): string {
  return `sport-feedback-${sessionId}-${createdAt}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function replaceSession(
  sessions: GeneratedWorkoutSession[],
  session: GeneratedWorkoutSession,
): GeneratedWorkoutSession[] {
  return [
    session,
    ...sessions.filter((item) => item.id !== session.id),
  ].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function saveProposedSession(
  data: SportLocalData,
  session: GeneratedWorkoutSession,
): SportLocalData {
  return {
    ...data,
    sessions: replaceSession(data.sessions, session),
  };
}

export function updateSessionStatus(
  data: SportLocalData,
  sessionId: string,
  status: WorkoutStatus,
  performedDurationSeconds: number | null = null,
): SportLocalData {
  return {
    ...data,
    sessions: data.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status,
            performedDurationSeconds:
              performedDurationSeconds ?? session.performedDurationSeconds,
          }
        : session,
    ),
  };
}

export function createWorkoutFeedback(args: {
  userId: string;
  sessionId: string;
  difficulty: FeedbackDifficulty;
  completion: FeedbackCompletion;
  bodySignal: FeedbackBodySignal;
  affectedZone?: WorkoutFeedback["affectedZone"];
  comment?: string | null;
  createdAt: string;
}): WorkoutFeedback {
  return {
    id: feedbackId(args.sessionId, args.createdAt),
    userId: args.userId,
    sessionId: args.sessionId,
    difficulty: args.difficulty,
    completion: args.completion,
    bodySignal: args.bodySignal,
    affectedZone: args.affectedZone ?? null,
    comment: args.comment?.trim() || null,
    createdAt: args.createdAt,
  };
}

export function addWorkoutFeedback(
  data: SportLocalData,
  feedback: WorkoutFeedback,
): SportLocalData {
  return {
    ...data,
    feedback: [
      feedback,
      ...data.feedback.filter((item) => item.id !== feedback.id),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export function latestSession(
  data: SportLocalData,
): GeneratedWorkoutSession | null {
  return data.sessions[0] ?? null;
}
