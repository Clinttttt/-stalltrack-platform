// ─────────────────────────────────────────────────────────────────────────────
// Revenue operations an LGU DECLARES while onboarding — the operator-side reader.
//
// A declaration is the office's initial intent, kept in the saved onboarding document (`operations`). It is not
// configuration and not posting authority: activation sends none of it to the backend, enables no service, registers no
// source and files no rate. The Head completes each operation in the portal afterwards.
//
// Codes are the platform's own stable identities. The optional `localDisplayName` is presentation only and is NEVER read
// to decide what an operation is. KEEP THIS CATALOG IN STEP with the landing app's copy
// (apps/landing/.../onboarding-operations.ts) and the server's OnboardingOperationDeclarations.SupportedCodes.
// ─────────────────────────────────────────────────────────────────────────────

export type OperationGroup = 'market' | 'space' | 'utility' | 'other';

export interface OperationCatalogEntry {
  /** Stable server code. */
  code: string;
  /** Neutral wording — never a single LGU's local programme name. */
  label: string;
  group: OperationGroup;
}

export const OPERATION_CATALOG: readonly OperationCatalogEntry[] = [
  { code: 'FISH_MEAT_VENDOR_FEE', label: 'Fish / Meat Vendor Fee', group: 'market' },
  { code: 'WEIGHT_AND_MEASURE', label: 'Weight & Measure', group: 'market' },
  { code: 'MARKET_FEES', label: 'Market Fees', group: 'market' },
  { code: 'KANMANGGAY_SPACE_RENTAL', label: 'Municipal Space Rental', group: 'space' },
  { code: 'FIESTA_ARAW_LOT_RENTAL', label: 'Event / Temporary Lot Rental', group: 'space' },
  { code: 'VEGETABLE_FRUIT_SPACE_RENTAL', label: 'Vegetable / Fruit Space Rental', group: 'space' },
  { code: 'ECF', label: 'Electricity Consumption Fees', group: 'utility' },
  { code: 'WCF', label: 'Water Consumption Fees', group: 'utility' },
  { code: 'LANDING_BERTHING', label: 'Landing / Berthing', group: 'other' },
  { code: 'TRANSPORTATION', label: 'Transportation / Parking', group: 'other' },
  { code: 'TRANSFER_LARGE_CATTLE', label: 'Transfer Large Cattle', group: 'other' },
];

export const OPERATION_GROUP_LABEL: Record<OperationGroup, string> = {
  market: 'Market collections',
  space: 'Space and rental collections',
  utility: 'Utility collections',
  other: 'Other enterprise operations',
};

export const MAX_LOCAL_NAME_LENGTH = 80;
export const OPERATIONS_VERSION = 1;

export interface OperationDeclaration {
  operationCode: string;
  selected: boolean;
  localDisplayName?: string;
}

export interface ParsedOperations {
  items: OperationDeclaration[];
  /** Plain-language reasons a saved block could not be read; empty when it is absent or sound. */
  problems: string[];
}

/** One row of the operator's review: what the office declared, in the platform's wording and in its own. */
export interface DeclaredOperationRow {
  code: string;
  label: string;
  group: OperationGroup;
  localName: string | null;
}

/**
 * Reads the `operations` block of a saved workspace. An absent block (every draft saved before declarations existed) is
 * simply "nothing declared". Anything unreadable is reported, never guessed at and never turned into a selection.
 */
export function parseOperations(raw: unknown): ParsedOperations {
  if (raw == null) return { items: [], problems: [] };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { items: [], problems: ['The declared revenue operations are not in a readable form.'] };
  }
  const block = raw as { version?: unknown; items?: unknown };
  const problems: string[] = [];
  if (block.version != null && (typeof block.version !== 'number' || block.version < 1 || block.version > OPERATIONS_VERSION)) {
    problems.push(`The declared revenue operations use an unsupported version (${String(block.version)}).`);
    return { items: [], problems };
  }
  if (block.items == null) return { items: [], problems };
  if (!Array.isArray(block.items)) {
    return { items: [], problems: ['The declared revenue operations list is not in a readable form.'] };
  }

  const known = new Set(OPERATION_CATALOG.map((o) => o.code));
  const seen = new Set<string>();
  const items: OperationDeclaration[] = [];
  for (const entry of block.items as unknown[]) {
    const e = (entry ?? {}) as { operationCode?: unknown; selected?: unknown; localDisplayName?: unknown };
    const code = typeof e.operationCode === 'string' ? e.operationCode : '';
    if (!known.has(code)) {
      problems.push(`“${code || '(missing)'}” is not a revenue operation StallTrack recognises.`);
      continue;
    }
    if (seen.has(code)) {
      problems.push(`${code} was declared more than once.`);
      continue;
    }
    seen.add(code);
    if (typeof e.selected !== 'boolean') {
      problems.push(`${code}: it is not stated whether this operation is selected.`);
      continue;
    }
    const name = typeof e.localDisplayName === 'string' ? e.localDisplayName.trim() : '';
    if (name.length > MAX_LOCAL_NAME_LENGTH) {
      problems.push(`${code}: the local display name is longer than ${MAX_LOCAL_NAME_LENGTH} characters.`);
      continue;
    }
    items.push({ operationCode: code, selected: e.selected, ...(name ? { localDisplayName: name } : {}) });
  }
  return { items, problems };
}

/** The operations the office selected, in catalog order, ready to show the operator. */
export function declaredRows(items: readonly OperationDeclaration[] | undefined): DeclaredOperationRow[] {
  const selected = new Map((items ?? []).filter((i) => i.selected).map((i) => [i.operationCode, i]));
  return OPERATION_CATALOG.filter((o) => selected.has(o.code)).map((o) => ({
    code: o.code,
    label: o.label,
    group: o.group,
    localName: selected.get(o.code)?.localDisplayName ?? null,
  }));
}
