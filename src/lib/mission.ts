import type { FrictionChoice, Priority } from "@/lib/types";

export function hasUsefulMission(
  priority: Priority,
  initialFriction: FrictionChoice,
): boolean {
  return priority.id !== "insufficient-data" || initialFriction !== "unknown";
}

export function shouldShowActiveMission({
  showActiveMission,
  priority,
  initialFriction,
}: {
  showActiveMission: boolean;
  priority: Priority;
  initialFriction: FrictionChoice;
}): boolean {
  return showActiveMission && hasUsefulMission(priority, initialFriction);
}
