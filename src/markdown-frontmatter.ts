export interface BlankResult {
  text: string;
  endLine: number;
}

export const FRONTMATTER_LANGUAGE_IDS = ['markdown', 'mdx', 'mdc', 'rmd', 'quarto'] as const;

const FRONTMATTER_LANGUAGE_SET = new Set<string>(FRONTMATTER_LANGUAGE_IDS);

export function isFrontMatterLanguage(languageId: string): boolean {
  return FRONTMATTER_LANGUAGE_SET.has(languageId);
}

const OPENING_DELIMITER = /^\uFEFF?---[^\S\n]*$/;
const CLOSING_DELIMITER = /^(---|\.\.\.)[^\S\n]*$/;

/**
 * Finds the line index of the closing front matter delimiter (`---` or `...`).
 * Returns null if the file does not start with `---` or has no closing delimiter.
 */
function findClosingDelimiterLine(lines: readonly string[]): number | null {
  if (!lines[0] || !OPENING_DELIMITER.test(lines[0])) return null;
  for (let i = 1; i < lines.length; i++) {
    if (CLOSING_DELIMITER.test(lines[i])) return i;
  }
  return null;
}

/**
 * Replaces the closing delimiter and all subsequent markdown content with empty
 * lines, preserving the total line count. The YAML front matter (including the
 * opening `---`) stays at its original line positions so positions sent to / from
 * the language server require zero adjustment.
 *
 * Returns null when the document has no YAML front matter.
 */
export function blankMarkdownBody(text: string): BlankResult | null {
  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const closingLine = findClosingDelimiterLine(lines);
  if (closingLine === null) return null;

  const kept = lines.slice(0, closingLine);
  const blanked = new Array<string>(lines.length - closingLine).fill('');
  return {
    text: kept.concat(blanked).join(lineEnding),
    endLine: closingLine - 1,
  };
}

/**
 * Tracks which open markdown documents have YAML front matter and where the
 * front matter ends. Keyed by document URI string.
 */
export class FrontMatterTracker {
  private readonly tracked = new Map<string, { endLine: number }>();

  get(uri: string): { endLine: number } | undefined {
    return this.tracked.get(uri);
  }

  set(uri: string, endLine: number): void {
    this.tracked.set(uri, { endLine });
  }

  delete(uri: string): boolean {
    return this.tracked.delete(uri);
  }

  has(uri: string): boolean {
    return this.tracked.has(uri);
  }
}
