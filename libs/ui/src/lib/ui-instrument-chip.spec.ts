import { TestBed } from '@angular/core/testing';
import { UiInstrumentChip } from './ui-instrument-chip';

describe('UiInstrumentChip: OR / CT', () => {
  function render(instrument: 'OR' | 'CT', extra: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(UiInstrumentChip);
    f.componentRef.setInput('instrument', instrument);
    for (const [k, v] of Object.entries(extra)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('shows the code, and says the full name to a screen reader', () => {
    const or = render('OR');
    expect(or.querySelector('[aria-hidden="true"]')!.textContent!.trim()).toBe('OR');
    expect(or.querySelector('.sr-only')!.textContent).toBe('Official Receipt');
    expect(render('CT').querySelector('.sr-only')!.textContent).toBe('Cash Ticket');
  });

  it('tints OR with gold and leaves CT neutral', () => {
    expect(render('OR').querySelector('span')!.className).toContain('#c8a84b');
    expect(render('CT').querySelector('span')!.className).not.toContain('#c8a84b');
    expect(render('CT').querySelector('span')!.className).toContain('bg-white');
  });

  it('shows the name beside the code only when asked', () => {
    expect(render('OR').textContent).not.toContain('Official Receipt ');
    expect(render('OR', { showName: true }).textContent).toContain('Official Receipt');
  });

  it('reads a business context before the name', () => {
    expect(render('CT', { context: 'Whole payment' }).querySelector('.sr-only')!.textContent).toBe('Whole payment: Cash Ticket');
  });
});
