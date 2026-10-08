import { z } from "zod";
import { isLocalDate } from "./date.helpers";
import type { LocalDate, Period } from "./date.types";

export const localDateSchema = z.custom<LocalDate>(isLocalDate, {
  message: "Expected an existing calendar date as YYYY-MM-DD",
});

export const periodSchema = z
  .object({ from: localDateSchema, to: localDateSchema })
  .refine(({ from, to }) => from <= to, {
    message: "The period ends before it starts",
    path: ["to"],
  }) satisfies z.ZodType<Period>;
