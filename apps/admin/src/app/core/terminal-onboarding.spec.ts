import { describe, expect, it } from 'vitest';
import { parseWorkspaceConfig, toReviewConfig } from './onboarding-config';

describe('Terminal declarations in operator review', () => {
  const draft = {
    facilities: [],
    terminalSections: {
      version: 1,
      items: [
        { section: 'ComfortRoom', isEnabled: false, localDisplayName: null },
        { section: 'PullPulVansCargoVans', isEnabled: true, localDisplayName: 'Van terminal' },
        { section: 'Tricycad', isEnabled: true, localDisplayName: null },
      ],
    },
  };
  it('preserves the explicit disabled section and canonical identity for activation', () => {
    const review = toReviewConfig(parseWorkspaceConfig(JSON.stringify(draft)));
    expect(review.terminalSectionsUnreadable).toBe(false);
    expect(review.terminalSections).toEqual([
      { section: 'ComfortRoom', isEnabled: false, localDisplayName: '' },
      { section: 'PullPulVansCargoVans', isEnabled: true, localDisplayName: 'Van terminal' },
      { section: 'Tricycad', isEnabled: true, localDisplayName: '' },
    ]);
  });
  it('refuses to guess when a newer terminal configuration is unknown', () => {
    const review = toReviewConfig(parseWorkspaceConfig(JSON.stringify({
      ...draft, terminalSections: { version: 100, items: [] },
    })));
    expect(review.terminalSectionsUnreadable).toBe(true);
    expect(review.terminalSections).toBeUndefined();
  });
});
