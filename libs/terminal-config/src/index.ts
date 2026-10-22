/**
 * The three stable Income From Terminal collection sources, separate from per-trip TRM rates.
 * A checked section is a declaration, NOT an instrument or collector authorization.
 */
export const TERMINAL_CODES = ['ComfortRoom', 'PullPulVansCargoVans', 'Tricycad'] as const;
export type TerminalCode = (typeof TERMINAL_CODES)[number];
export type TerminalChoice = { section: TerminalCode; isEnabled: boolean; localDisplayName: string };
export const TERMINAL_LABELS: Record<TerminalCode, string> = {
  ComfortRoom: 'Comfort Room',
  PullPulVansCargoVans: 'Pull Pul Vans, Cargo Vans',
  Tricycad: 'Tricycad',
};
export const defaultTerminalChoices = (): TerminalChoice[] =>
  TERMINAL_CODES.map((section) => ({ section, isEnabled: true, localDisplayName: '' }));
export function terminalNameProblem(choices: readonly TerminalChoice[]): string | null {
  const labels = choices.map((x) => (x.localDisplayName.trim() || TERMINAL_LABELS[x.section]).toLowerCase());
  if (choices.some((x) => x.localDisplayName.trim().length > 80 || /[\x00-\x1f\x7f]/.test(x.localDisplayName)))
    return 'Use a section name of 80 characters or fewer, without control characters.';
  if (new Set(labels).size !== labels.length) return 'Terminal section names must be unique.';
  return null;
}
export function readTerminalSections(raw: unknown): { choices: TerminalChoice[]; present: boolean; unreadable: boolean } {
  if (raw === undefined) return { choices: defaultTerminalChoices(), present: false, unreadable: false };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { choices: defaultTerminalChoices(), present: true, unreadable: true };
  const block = raw as { version?: unknown; items?: unknown };
  if (block.version !== 1 || !Array.isArray(block.items) || block.items.length !== 3)
    return { choices: defaultTerminalChoices(), present: true, unreadable: true };
  const items: TerminalChoice[] = [];
  for (const item of block.items) {
    if (!item || typeof item !== 'object') return { choices: defaultTerminalChoices(), present: true, unreadable: true };
    const row = item as Record<string, unknown>;
    if (!TERMINAL_CODES.includes(row['section'] as TerminalCode) || typeof row['isEnabled'] !== 'boolean' ||
        (row['localDisplayName'] !== undefined && row['localDisplayName'] !== null && typeof row['localDisplayName'] !== 'string'))
      return { choices: defaultTerminalChoices(), present: true, unreadable: true };
    items.push({ section: row['section'] as TerminalCode, isEnabled: row['isEnabled'] as boolean,
      localDisplayName: (row['localDisplayName'] as string | undefined) ?? '' });
  }
  if (new Set(items.map((x) => x.section)).size !== 3 || terminalNameProblem(items))
    return { choices: defaultTerminalChoices(), present: true, unreadable: true };
  return { choices: TERMINAL_CODES.map((section) => items.find((x) => x.section === section)!), present: true, unreadable: false };
}
export function writeTerminalSections(choices: readonly TerminalChoice[]) {
  if (choices.length !== 3 || terminalNameProblem(choices)) throw new Error('Invalid Terminal section choices');
  return { version: 1 as const, items: choices.map((x) => ({
    section: x.section, isEnabled: x.isEnabled, localDisplayName: x.localDisplayName.trim() || null,
  })) };
}
