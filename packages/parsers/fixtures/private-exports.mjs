// Reads the real files in fixtures/private/ and its folders, which git
// ignores, for the private tests: the spreadsheets of Phase 2.8 and the PDFs
// of Phase 9.1. Plain JavaScript, so the package's TypeScript stays free of
// Node APIs; private-exports.d.mts gives it a type.
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const PRIVATE_DIR = join(import.meta.dirname, "private");
// Files as the bank delivers them; hidden files such as .DS_Store aren't.
const EXPORT_FILE = /^[^.].*\.xlsx$/i;
const PDF_FILE = /^[^.].*\.pdf$/i;

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
const readPrivateFiles = async (pattern) => {
  const paths = (await filePaths()).filter((path) =>
    pattern.test(basename(path)),
  );
  return Promise.all(
    paths
      .sort()
      .map(
        async (path) => new Uint8Array(await readFile(join(PRIVATE_DIR, path))),
      ),
  );
};

export const readPrivateExports = () => readPrivateFiles(EXPORT_FILE);

export const readPrivatePdfs = () => readPrivateFiles(PDF_FILE);
