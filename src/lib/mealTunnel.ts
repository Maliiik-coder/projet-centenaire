export const mealTunnelStepIds = [
  "kind",
  "text",
  "quantity",
  "hunger",
  "after",
  "stop",
  "tags",
  "finding",
] as const;

export const MEAL_TUNNEL_STEPS = mealTunnelStepIds.length;
export const MEAL_TEXT_STEP = mealTunnelStepIds.indexOf("text");
export const MEAL_TAGS_STEP = mealTunnelStepIds.indexOf("tags");
export const MEAL_FINDING_STEP = mealTunnelStepIds.indexOf("finding");
export const MEAL_LAST_STEP = MEAL_TUNNEL_STEPS - 1;
