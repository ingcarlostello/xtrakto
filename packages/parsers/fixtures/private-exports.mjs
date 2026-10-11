// Reads the real exports in fixtures/private/ and its folders, which git
// ignores, for the private tests of Phase 2.8. Plain JavaScript, so the
// package's TypeScript stays free of Node APIs; private-exports.d.mts gives
// it a type.
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const PRIVATE_DIR = join(import.meta.dirname, "private");
// Spreadsheets as the bank delivers them; hidden files such as .DS_Store aren't.
const EXPORT_FILE = /^[^.].*\.xlsx$/i;

// Paths relative to the private folder, its folders included.
const filePaths = async () => {
  try {
    return await readdir(PRIVATE_DIR, { recursive: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

// Only the bytes leave this module: a file name can carry an account number.
export const readPrivateExports = async () => {
  const paths = (await filePaths()).filter((path) =>
    EXPORT_FILE.test(basename(path)),
  );
  return Promise.all(
    paths
      .sort()
      .map(
        async (path) => new Uint8Array(await readFile(join(PRIVATE_DIR, path))),
      ),
  );
};
