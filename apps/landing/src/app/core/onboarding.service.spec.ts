import { describe, expect, it } from 'vitest';
import { describeError } from './onboarding.service';

describe('onboarding save/submit errors', () => {
  it('shows the platform\'s actual reasons for a refused save, not just the headline', () => {
    const e = {
      status: 400,
      error: {
        message: 'Validation failed',
        title: 'One or more validation errors occurred.',
        error: { ConfigJson: ['Revenue operations version is not supported (this server reads version 1).', '“(missing)” is not a revenue operation StallTrack recognises.'] },
      },
    };
    const text = describeError(e);
    expect(text).toMatch(/^Validation failed: /);
    expect(text).toMatch(/version is not supported/);
    expect(text).toMatch(/not a revenue operation/);
  });

  it('keeps the existing wording for the other failures', () => {
    expect(describeError({ status: 404 })).toBe('This onboarding link is invalid or has expired.');
    expect(describeError({ status: 0 })).toMatch(/Cannot reach the server/);
    expect(describeError({ status: 429 })).toMatch(/Too many requests/);
    expect(describeError({ status: 500, error: { message: 'Boom' } })).toBe('Boom');
    expect(describeError({ status: 500, error: { error: {} } })).toBe('Something went wrong. Please try again.');
  });
});
