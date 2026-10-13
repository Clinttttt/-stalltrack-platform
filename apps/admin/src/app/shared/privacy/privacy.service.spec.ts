import { PrivacyService, REVEAL_IDLE_MS } from './privacy.service';

describe('PrivacyService: sensitive details are a per-request, in-memory, time-limited reveal', () => {
  let privacy: PrivacyService;

  beforeEach(() => {
    vi.useFakeTimers();
    privacy = new PrivacyService();
  });
  afterEach(() => vi.useRealTimers());

  it('starts hidden for every request', () => {
    expect(privacy.privacyMode()).toBe(false);
    expect(privacy.isRevealed('a')).toBe(false);
    expect(privacy.revealedId()).toBeNull();
  });

  it('reveals ONE request at a time: showing another hides the first', () => {
    privacy.reveal('a');
    expect(privacy.isRevealed('a')).toBe(true);
    expect(privacy.isRevealed('b')).toBe(false);

    privacy.reveal('b');
    expect(privacy.isRevealed('a')).toBe(false);
    expect(privacy.isRevealed('b')).toBe(true);
  });

  it('never reveals without a request id', () => {
    privacy.reveal('a');
    expect(privacy.isRevealed(null)).toBe(false);
    expect(privacy.isRevealed(undefined)).toBe(false);
    expect(privacy.isRevealed('')).toBe(false);
  });

  it('hides again on request, and on its own after the idle period', () => {
    privacy.reveal('a');
    privacy.hide();
    expect(privacy.isRevealed('a')).toBe(false);

    privacy.reveal('a');
    vi.advanceTimersByTime(REVEAL_IDLE_MS - 1000);
    expect(privacy.isRevealed('a')).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(privacy.isRevealed('a')).toBe(false);
  });

  it('keeps details up while the reviewer is active, then times out from the last activity', () => {
    privacy.reveal('a');
    vi.advanceTimersByTime(REVEAL_IDLE_MS - 1000);
    privacy.touch();
    vi.advanceTimersByTime(REVEAL_IDLE_MS - 1000);
    expect(privacy.isRevealed('a')).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(privacy.isRevealed('a')).toBe(false);
  });

  it('activity does nothing while nothing is revealed (no timer is started)', () => {
    privacy.touch();
    privacy.reveal('a');
    privacy.hide();
    vi.advanceTimersByTime(REVEAL_IDLE_MS * 2);
    expect(privacy.isRevealed('a')).toBe(false);
  });

  it('Privacy mode hides what was showing and refuses to reveal until it is switched off', () => {
    privacy.reveal('a');
    privacy.setPrivacyMode(true);
    expect(privacy.isRevealed('a')).toBe(false);

    privacy.reveal('a');
    expect(privacy.isRevealed('a')).toBe(false);

    privacy.setPrivacyMode(false);
    expect(privacy.isRevealed('a')).toBe(false); // switching it off does not bring anything back
    privacy.reveal('a');
    expect(privacy.isRevealed('a')).toBe(true);
  });

  it('keeps nothing in browser storage', () => {
    const before = [localStorage.length, sessionStorage.length];
    privacy.reveal('a');
    privacy.setPrivacyMode(true);
    expect([localStorage.length, sessionStorage.length]).toEqual(before);
  });
});
