// ─────────────────────────────────────────────────────────────────────────────
// Revenue operations an LGU may DECLARE while onboarding.
//
// A declaration is initial intent only, saved inside the onboarding document as `operations`. It enables nothing: no service
// is switched on, no Collector is assigned, no source is registered and no rate is filed. The Head completes each operation
// in the portal after activation.
//
// `operationCode` is the platform's stable identity. `localDisplayName` is the office's own wording for it - presentation
// only, never read to decide what the operation is. KEEP THIS CATALOG IN STEP with the admin console's copy
// (apps/admin/.../onboarding-operations.ts) and the server's OnboardingOperationDeclarations.SupportedCodes.
//
// Operations a FACILITY already owns (stall fees, commercial space rental, slaughterhouse, terminal, weekly market) are not
// listed: they follow from the facility the office adds, and offering them twice would be two answers to one question.
// ─────────────────────────────────────────────────────────────────────────────

export type OperationGroup = 'market' | 'space' | 'utility' | 'other';

export interface OperationCatalogEntry {
  code: string;
  /** Neutral wording — never a single LGU's local programme name. */
  label: string;
  group: OperationGroup;
  /** One short line on what the operation collects, to help an office recognise its own. */
  hint: string;
}

export const OPERATION_CATALOG: readonly OperationCatalogEntry[] = [
  { code: 'FISH_MEAT_VENDOR_FEE', label: 'Fish / Meat Vendor Fee', group: 'market', hint: 'A fee from registered fish and meat vendors.' },
  { code: 'WEIGHT_AND_MEASURE', label: 'Weight & Measure', group: 'market', hint: 'Inspection and calibration of scales and measures.' },
  { code: 'MARKET_FEES', label: 'Market Fees', group: 'market', hint: 'Miscellaneous approved market fees.' },
  { code: 'KANMANGGAY_SPACE_RENTAL', label: 'Municipal Space Rental', group: 'space', hint: 'Rental of a municipal space held by a registered occupant.' },
  { code: 'FIESTA_ARAW_LOT_RENTAL', label: 'Event / Temporary Lot Rental', group: 'space', hint: 'Lots rented for a fiesta, anniversary or similar event.' },
  { code: 'VEGETABLE_FRUIT_SPACE_RENTAL', label: 'Vegetable / Fruit Space Rental', group: 'space', hint: 'Space rented to vegetable and fruit sellers.' },
  { code: 'ECF', label: 'Electricity Consumption Fees', group: 'utility', hint: 'Electricity billed to occupants from meter readings.' },
  { code: 'WCF', label: 'Water Consumption Fees', group: 'utility', hint: 'Water billed to occupants from meter readings.' },
  { code: 'LANDING_BERTHING', label: 'Landing / Berthing', group: 'other', hint: 'Landing and berthing fees.' },
  { code: 'TRANSPORTATION', label: 'Transportation / Parking', group: 'other', hint: 'Parking and vehicle fees by vehicle class.' },
  { code: 'TRANSFER_LARGE_CATTLE', label: 'Transfer Large Cattle', group: 'other', hint: 'Fees for transferring large cattle.' },
];

export const OPERATION_GROUPS: ReadonlyArray<{ key: OperationGroup; label: string }> = [
  { key: 'market', label: 'Market collections' },
  { key: 'space', label: 'Space and rental collections' },
  { key: 'utility', label: 'Utility collections' },
  { key: 'other', label: 'Other enterprise operations' },
];

export const OPERATIONS_VERSION = 1;
export const MAX_LOCAL_NAME_LENGTH = 80;

export interface OperationState {
  selected: boolean;
  localDisplayName: string;
}

export type OperationStates = Readonly<Record<string, OperationState>>;

export interface OperationItem {
  operationCode: string;
  selected: boolean;
  localDisplayName?: string;
}

const KNOWN = new Set(OPERATION_CATALOG.map((o) => o.code));

/**
 * Reads a saved `operations` block. A draft saved before declarations existed has none and yields no selections. A code this
 * workspace does not know is dropped and reported (the server refuses unknown codes on save, so carrying one would make the
 * whole draft unsaveable); everything readable is kept.
 */
export function readOperations(raw: unknown): { states: Record<string, OperationState>; dropped: string[] } {
  const states: Record<string, OperationState> = {};
  const dropped: string[] = [];
  const items = (raw as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) return { states, dropped };

  for (const entry of items) {
    const e = (entry ?? {}) as { operationCode?: unknown; selected?: unknown; localDisplayName?: unknown };
    const code = typeof e.operationCode === 'string' ? e.operationCode : '';
    if (!KNOWN.has(code)) {
      dropped.push(code || '(unnamed)');
      continue;
    }
    states[code] = {
      selected: e.selected === true,
      localDisplayName: typeof e.localDisplayName === 'string' ? e.localDisplayName.slice(0, MAX_LOCAL_NAME_LENGTH) : '',
    };
  }
  return { states, dropped };
}

/** The saved form: only operations the office selected or named, in catalog order, stable code first. */
export function writeOperations(states: OperationStates): { version: number; items: OperationItem[] } {
  const items: OperationItem[] = [];
  for (const o of OPERATION_CATALOG) {
    const s = states[o.code];
    if (!s) continue;
    const name = s.localDisplayName.trim();
    if (!s.selected && !name) continue;
    items.push({ operationCode: o.code, selected: s.selected, ...(name ? { localDisplayName: name } : {}) });
  }
  return { version: OPERATIONS_VERSION, items };
}

/**
 * Why a selected operation's local name cannot be accepted, or '' when it can. A name may be left empty (the neutral name is
 * used). It must not read as a different operation or repeat another operation's name, because the office would then be unable
 * to tell two collections apart on its own screens.
 */
export function localNameProblem(code: string, states: OperationStates): string {
  const s = states[code];
  const name = (s?.localDisplayName ?? '').trim();
  if (!s?.selected || !name) return '';
  if (name.length > MAX_LOCAL_NAME_LENGTH) return `Keep it to ${MAX_LOCAL_NAME_LENGTH} characters or fewer.`;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) return 'Use plain text only.';
  const key = name.toLowerCase();
  for (const o of OPERATION_CATALOG) {
    if (o.code === code) continue;
    if (o.label.toLowerCase() === key) return `That is the standard name of another operation (${o.label}).`;
    const other = states[o.code];
    if (other?.selected && other.localDisplayName.trim().toLowerCase() === key) return `Another operation already uses that name.`;
  }
  return '';
}
