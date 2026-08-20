// ─────────────────────────────────────────────────────────────────────────────
// The collection areas a public-market daily sheet is organised into.
//
// These values are the backend's MarketSection names verbatim, and they are the ONLY thing the platform
// keys a market section on. A section's name is the LGU's own label for that area, in its own language
// ("Gulayan", "Isda", "Karne") — the platform never reads meaning out of that wording. An LGU declares the
// area for each of its sections during onboarding; this module holds that shared vocabulary so the mapper
// and the operator's review always speak of it the same way.
//
// Mirrors the same three values in the landing app's onboarding workspace.
// ─────────────────────────────────────────────────────────────────────────────

export type MarketSectionKind = 'VegetableArea' | 'FishSection' | 'MeatSection';

/** In sheet order. A market keeps at most one section per area. */
export const MARKET_SECTION_KINDS: ReadonlyArray<MarketSectionKind> = ['VegetableArea', 'FishSection', 'MeatSection'];

/** How each area is described to an operator. Never shown to an LGU in place of its own label. */
export const MARKET_SECTION_LABEL: Record<MarketSectionKind, string> = {
  VegetableArea: 'Vegetable area',
  FishSection: 'Fish section',
  MeatSection: 'Meat section',
};

export function marketSectionLabelOf(kind: MarketSectionKind | undefined): string {
  return kind ? MARKET_SECTION_LABEL[kind] : '';
}

/**
 * Fills in the area for sections saved before onboarding asked an LGU to declare one, taking them in the
 * order the LGU entered them. Applied once when a draft is loaded, so the assumed areas are on screen for
 * the operator to see before anything is committed — and so a legacy draft still seeds the fish area's
 * per-kilo weighing fee instead of silently losing it. Sections that carry a declared area are untouched.
 */
export function withDeclaredAreas<T extends { kind?: MarketSectionKind }>(sections: ReadonlyArray<T>): T[] {
  const taken = new Set<MarketSectionKind>(
    sections.map((s) => s?.kind).filter((k): k is MarketSectionKind => Boolean(k)),
  );
  return sections.map((s) => {
    if (s?.kind && MARKET_SECTION_KINDS.includes(s.kind)) return s;
    const kind = MARKET_SECTION_KINDS.find((k) => !taken.has(k)) ?? 'VegetableArea';
    taken.add(kind);
    return { ...s, kind };
  });
}

/** True when a draft predates the question, so the areas above are assumed rather than declared. */
export function hasUndeclaredAreas(sections: ReadonlyArray<{ kind?: MarketSectionKind }>): boolean {
  return sections.some((s) => !s?.kind);
}
