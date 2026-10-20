import "server-only";
import {
  DEFAULT_TIME_ZONE,
  type LocalDate,
  localDateFromInstant,
} from "@xtrakto/core";

/** Today in Bogotá, which the calendar marks, whatever the server's time zone. */
export const todayInBogota = (): LocalDate =>
  localDateFromInstant(new Date(), DEFAULT_TIME_ZONE);
