// Reads the real files in fixtures/private/ and its folders, which git
// ignores, for the private tests: the spreadsheets of Phase 2.8 and the PDFs
// of Phase 9.1, and the credit card statements of Stage 12, in folders of
// their own. Plain JavaScript, so the package's TypeScript stays free of
// Node APIs; private-exports.d.mts gives it a type.
import { readdir, readFile } from "node:fs/promises";
import { basename, join, sep } from "node:path";

const PRIVATE_DIR = join(import.meta.dirname, "private");
// Files as the bank delivers them; hidden files such as .DS_Store aren't.
const EXPORT_FILE = /^[^.].*\.xlsx$/i;
const PDF_FILE = /^[^.].*\.pdf$/i;
// The card statements' folders (Stage 12): Bancolombia's and Nu's.
const CARD_FOLDERS = ["tarjeta", "tarjeta-nu"];

// Paths relative to the private folder, its folders included.
const filePaths = async () => {
  try {
    return await readdir(PRIVATE_DIR, { recursive: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const folderOf = (path) => path.split(sep)[0];

// The savings account's files, or a card folder's. Only the bytes leave this
// module: a file name can carry an account number.
const readPrivateFiles = async (pattern, folder) => {
  const paths = (await filePaths()).filter(
    (path) =>
      pattern.test(basename(path)) &&
      (folder === undefined
        ? !CARD_FOLDERS.includes(folderOf(path))
        : folderOf(path) === folder),
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

export const readPrivateCardExports = () =>
  readPrivateFiles(EXPORT_FILE, "tarjeta");
