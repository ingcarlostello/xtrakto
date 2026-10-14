import { assertMigrated, testDatabase } from "@xtrakto/db/testing";

// The database tests here run after @xtrakto/db's, which rebuild the test
// database (apps/web/turbo.json): never rebuild it while they could be running.
export const setup = async (): Promise<void> => {
  if (testDatabase) await assertMigrated(testDatabase.ownerUrl);
};
