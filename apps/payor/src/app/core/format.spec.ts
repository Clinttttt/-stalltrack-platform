import { peso, officeDate, officeMonth, officeDayShort } from './format';

// ─────────────────────────────────────────────────────────────────────────────
// How the office writes a figure and a date.
//
// A payor reconciles what this screen says against a paper receipt from a collector. So a peso figure always carries two
// decimals and its sign, and a billing period reads as a month rather than as a database key. There is one of each
// function for the whole app, because the same amount formatted two ways on two screens is an amount nobody can check.
// ─────────────────────────────────────────────────────────────────────────────

describe('peso', () => {
  it('always states two decimals, so a figure cannot be misread as a rounder one', () => {
    expect(peso(60)).toBe('₱60.00');
    expect(peso(60.5)).toBe('₱60.50');
    expect(peso(0)).toBe('₱0.00');
  });

  it('separates thousands, because a month of a big stall runs to them', () => {
    expect(peso(1800)).toBe('₱1,800.00');
    expect(peso(12345.67)).toBe('₱12,345.67');
  });

  it('writes a credit as a negative rather than hiding the sign', () => {
    expect(peso(-60)).toBe('₱-60.00');
  });
});

describe('officeMonth', () => {
  it('writes a billing period as a month', () => {
    expect(officeMonth('2026-08')).toBe('August 2026');
    expect(officeMonth('2026-01')).toBe('January 2026');
    expect(officeMonth('2025-12')).toBe('December 2025');
  });

  it('hands back anything that is not a period untouched, rather than guessing', () => {
    // A guess here would put a wrong month against a real balance.
    expect(officeMonth('')).toBe('');
    expect(officeMonth('2026')).toBe('2026');
    expect(officeMonth('August')).toBe('August');
    expect(officeMonth('2026-8')).toBe('2026-8');
  });
});

describe('officeDate', () => {
  it('writes an ISO day as the office writes it', () => {
    expect(officeDate('2026-08-26')).toBe('Aug 26, 2026');
  });

  it('reads a day as that day in local time, not the day before', () => {
    // The API sends a bare date. Parsed as UTC it would land on the 25th for anyone east of Greenwich, which is every
    // user of this platform. This is the reason for the midnight suffix in the implementation.
    expect(officeDate('2026-08-26')).toContain('26');
    expect(officeDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('hands back something unreadable rather than showing an invalid date', () => {
    expect(officeDate('not a date')).toBe('not a date');
  });
});

describe('officeDayShort', () => {
  it('names the weekday, for a list of days under a month already stated', () => {
    // 2026-08-26 is a Wednesday.
    expect(officeDayShort('2026-08-26')).toBe('Wed, Aug 26');
  });

  it('holds the same local-day rule', () => {
    expect(officeDayShort('2026-08-01')).toContain('Aug 1');
  });

  it('hands back something unreadable untouched', () => {
    expect(officeDayShort('')).toBe('');
  });
});
