import type { OwnedSportResource } from "@/lib/sport/types";

export function canAccessSportResource(
  actorUserId: string,
  resource: OwnedSportResource,
): boolean {
  return actorUserId.length > 0 && resource.userId === actorUserId;
}

export function assertCanAccessSportResource(
  actorUserId: string,
  resource: OwnedSportResource,
): void {
  if (!canAccessSportResource(actorUserId, resource)) {
    throw new Error("Acces refuse a une ressource Sport d'un autre utilisateur.");
  }
}

export function filterOwnedSportResources<T extends OwnedSportResource>(
  actorUserId: string,
  resources: T[],
): T[] {
  return resources.filter((resource) =>
    canAccessSportResource(actorUserId, resource),
  );
}

export function assertSportMutationBelongsToUser(
  actorUserId: string,
  payload: OwnedSportResource,
): void {
  assertCanAccessSportResource(actorUserId, payload);
}
