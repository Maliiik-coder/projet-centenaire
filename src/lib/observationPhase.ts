export const INITIAL_OBSERVATION_DAYS = 7;

export const INITIAL_OBSERVATION_MEAL_MESSAGE =
  "Cette note rejoint ton carnet. Continue simplement à observer tes habitudes ; Haru regardera ce qui se répète à la fin de la semaine.";

export function isInitialObservationDay(dayNumber: number): boolean {
  return (
    Number.isInteger(dayNumber) &&
    dayNumber >= 1 &&
    dayNumber <= INITIAL_OBSERVATION_DAYS
  );
}
