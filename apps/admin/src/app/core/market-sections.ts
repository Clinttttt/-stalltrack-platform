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

/**
 * A section that is NOT one of the three the platform keys on: a market's own area, named by the office, kept in the
 * facility's section registry (Facility.CustomSectionNames) rather than against a MarketSection. Deliberately not a
 * member of MarketSectionKind, so nothing that reads a collection area can be handed one by accident.
 */
export const CUSTOM_AREA = 'CustomArea' as const;
export type CustomArea = typeof CUSTOM_AREA;

/** What an onboarding form may say a section is: one of the three areas, or the market's own. */
export type SectionKind = MarketSectionKind | CustomArea;

export function isCustomArea(kind: SectionKind | undefined): boolean {
  return kind === CUSTOM_AREA;
}

/** In sheet order. A market keeps at most one section per area. */
export const MARKET_SECTION_KINDS: ReadonlyArray<MarketSectionKind> = ['VegetableArea', 'FishSection', 'MeatSection'];

/** How each area is described to an operator. Never shown to an LGU in place of its own label. */
export const MARKET_SECTION_LABEL: Record<MarketSectionKind, string> = {
  VegetableArea: 'Vegetable area',
  FishSection: 'Fish section',
  MeatSection: 'Meat section',
};

export function marketSectionLabelOf(kind: SectionKind | undefined): string {
  if (!kind) return '';
  return isCustomArea(kind) ? "the market's own area" : MARKET_SECTION_LABEL[kind as MarketSectionKind];
}

/**
 * Fills in the area for sections saved before onboarding asked an LGU to declare one, taking them in the
 * order the LGU entered them. Applied once when a draft is loaded, so the assumed areas are on screen for
 * the operator to see before anything is committed — and so a legacy draft still seeds the fish area's
 * per-kilo weighing fee instead of silently losing it. Sections that carry a declared area are untouched.
 *
 * A section declared as the market's OWN area is left alone and takes none of the three slots: it is a declaration, not
 * an absent one.
 */
export function withDeclaredAreas<T extends { kind?: SectionKind }>(sections: ReadonlyArray<T>): T[] {
  const taken = new Set<MarketSectionKind>(
    sections
      .map((s) => s?.kind)
      .filter((k): k is MarketSectionKind => Boolean(k) && !isCustomArea(k) && MARKET_SECTION_KINDS.includes(k as MarketSectionKind)),
  );
  return sections.map((s) => {
    if (s?.kind && (isCustomArea(s.kind) || MARKET_SECTION_KINDS.includes(s.kind as MarketSectionKind))) return s;
    const kind = MARKET_SECTION_KINDS.find((k) => !taken.has(k)) ?? 'VegetableArea';
    taken.add(kind);
    return { ...s, kind };
  });
}

/** True when a draft predates the question, so the areas above are assumed rather than declared. */
export function hasUndeclaredAreas(sections: ReadonlyArray<{ kind?: SectionKind }>): boolean {
  return sections.some((s) => !s?.kind);
}
