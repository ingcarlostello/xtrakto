// Files chosen outside the upload screen, on their way to it: the welcome's
// last step leaves them here and the upload screen takes them when it opens
// (5.8). Only the browser's memory holds them, as it holds the screen's own
// files, so a reload forgets them. Event handlers and effects use it, never a
// render: on the server it stays empty.
let handedFiles: readonly File[] = [];

/** Leaves files for the upload screen, in place of any left before. */
export const handFilesToUpload = (files: readonly File[]): void => {
  handedFiles = files;
};

/** The files left for the upload screen; taking them empties the store. */
export const takeHandedFiles = (): readonly File[] => {
  const files = handedFiles;
  handedFiles = [];
  return files;
};
