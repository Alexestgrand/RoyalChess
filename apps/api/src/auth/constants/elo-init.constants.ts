import { TimeControl } from "@prisma/client";

/** Contrôles de temps pour lesquels on initialise un rating Glicko-2 à l'inscription / OAuth. */
export const INITIAL_ELO_TIME_CONTROLS: readonly TimeControl[] = [
  TimeControl.BULLET,
  TimeControl.BLITZ,
  TimeControl.RAPID,
  TimeControl.CLASSICAL,
  TimeControl.CORRESPONDENCE,
];
