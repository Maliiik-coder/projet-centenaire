export function isCurrentCloudAttempt(
  activeGeneration: number,
  attemptGeneration: number,
  activeUserId: string | null,
  attemptUserId: string,
): boolean {
  return (
    activeGeneration === attemptGeneration && activeUserId === attemptUserId
  );
}
