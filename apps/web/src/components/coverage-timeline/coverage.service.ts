import "server-only";
import { DEFAULT_TIME_ZONE, localDateFromInstant } from "@xtrakto/core";
import {
  countUserFiles,
  findUserId,
  listAccountCoverage,
  listAccounts,
  type UserContext,
  type UserFiles,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { coverageViews } from "./coverage-timeline.helpers";
import type { CoverageView } from "./coverage-timeline.types";

const NO_FILES: UserFiles = [];

// The user's accounts with months, through today's month in Bogotá.
const readCoverage = async (ctx: UserContext): Promise<CoverageView[]> =>
  coverageViews(
    await listAccountCoverage(ctx),
    await listAccounts(ctx),
    localDateFromInstant(new Date(), DEFAULT_TIME_ZONE),
  );

// Reads in the signed-in user's context; nothing before their first file,
// and reading never creates their row.
const asUser = <T>(
  clerkUserId: string,
  nothing: T,
  read: (ctx: UserContext) => Promise<T>,
): Promise<T> =>
  withSanitizedErrors("COVERAGE_NOT_READ", async () => {
    const db = getDb();
    const userId = await findUserId(db, clerkUserId);
    return userId ? withUserContext(db, userId, read) : nothing;
  });

/**
 * Each of the signed-in user's accounts with movements, as its coverage
 * timeline shows it (10.2a): the months it has and those it misses.
 */
export const getCoverage = (
  clerkUserId: string,
): Promise<readonly CoverageView[]> => asUser(clerkUserId, [], readCoverage);

/**
 * What the profile's "Tus datos" shows (10.2a): the files the signed-in user
 * keeps, of each kind, and each account's coverage.
 */
export const getYourData = (
  clerkUserId: string,
): Promise<{
  readonly files: UserFiles;
  readonly coverage: readonly CoverageView[];
}> =>
  asUser(clerkUserId, { files: NO_FILES, coverage: [] }, async (ctx) => ({
    files: await countUserFiles(ctx),
    coverage: await readCoverage(ctx),
  }));
