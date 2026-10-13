import { TestBed } from '@angular/core/testing';
import { Sensitive } from './sensitive';

describe('Sensitive: a hidden value is never in the page', () => {
  function render(value: string, revealed: boolean): HTMLElement {
    const fixture = TestBed.createComponent(Sensitive);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('revealed', revealed);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the value when revealed', () => {
    expect(render('₱1,250.00', true).textContent).toContain('₱1,250.00');
  });

  it('replaces it with a same-width placeholder when hidden, carrying none of its characters', () => {
    const el = render('₱1,250.00', false);
    expect(el.textContent).not.toContain('1,250');
    expect(el.textContent).not.toContain('₱');
    expect(el.innerHTML).not.toContain('1,250');
    expect(el.textContent?.trim()).toMatch(/^•{4,10}$/);
  });

  it('is announced as hidden, not read out', () => {
    const el = render('treasury@lgu.gov.ph', false);
    const masked = el.querySelector('[aria-label]');
    expect(masked?.getAttribute('aria-label')).toMatch(/hidden/i);
    expect(el.innerHTML).not.toContain('treasury');
  });

  it('keeps the placeholder within a sensible width for very short and very long values', () => {
    expect(render('5', false).textContent?.trim().length).toBe(4);
    expect(render('x'.repeat(80), false).textContent?.trim().length).toBe(10);
  });
});
