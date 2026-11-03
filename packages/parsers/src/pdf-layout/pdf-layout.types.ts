/** Text that sits together on a line, from where it starts to where it ends. */
export type PdfSegment = {
  readonly text: string;
  readonly left: number;
  readonly right: number;
};

/** A line of a page: its segments left to right, at one baseline. */
export type PdfLine = {
  /** The page it's on, from 0. */
  readonly page: number;
  /** Its baseline, from the page's top. */
  readonly y: number;
  /** The height of its tallest text. */
  readonly height: number;
  readonly segments: readonly PdfSegment[];
};

/** How a format's table reads: its columns and, if it wraps cells, its anchor. */
export type PdfTableLayout = {
  /** The column names, as the header prints them, left to right. */
  readonly columns: readonly string[];
  /**
   * The column every row fills, such as its date. Given only for a format
   * that wraps a cell over two lines: a line without it continues the row
   * above.
   */
  readonly anchor?: string;
};
