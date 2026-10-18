import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiHero, UiHeroFigure } from './ui-hero';
import { UiInstrumentChip } from './ui-instrument-chip';

@Component({
  standalone: true,
  imports: [UiHero, UiHeroFigure, UiInstrumentChip],
  template: `
    <ui-hero eyebrow="Operations · ECF" title="Electricity Consumption Fees" icon="zap" [compact]="compact">
      <ng-container meta>October 2026 · <ui-instrument-chip instrument="OR" /> Official Receipt</ng-container>
      <ui-hero-figure value="₱0.00" label="Assessed" note="Approved amounts" />
      <ui-hero-figure value="₱1,200.50" label="Net settled" />
    </ui-hero>
  `,
})
class Host {
  compact = false;
}

@Component({ standalone: true, imports: [UiHero], template: `<ui-hero title="Validation" />` })
class Bare {}

describe('UiHero: the page hero', () => {
  function render() {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    return f;
  }
  const el = (f: { nativeElement: unknown }) => f.nativeElement as HTMLElement;

  it('is the page title: exactly one h1, with the eyebrow above it', () => {
    const root = el(render());
    expect(root.querySelectorAll('h1').length).toBe(1);
    expect(root.querySelector('h1')!.textContent).toContain('Electricity Consumption Fees');
    expect(root.textContent).toContain('Operations · ECF');
  });

  it('sits on the civic panel with white text, never navy', () => {
    const band = el(render()).querySelector('section')!;
    expect(band.className).toContain('bg-civic-panel');
    expect(band.className).toContain('text-white');
    expect(band.className).not.toMatch(/navy|gradient/);
  });

  it('carries the instrument chip in its meta line and the figures with label and note', () => {
    const root = el(render());
    expect(root.querySelector('ui-instrument-chip')!.textContent).toContain('OR');
    const figures = Array.from(root.querySelectorAll('ui-hero-figure'));
    expect(figures.length).toBe(2);
    expect(figures[0].textContent).toContain('₱0.00');
    expect(figures[0].textContent).toContain('Assessed');
    expect(figures[0].textContent).toContain('Approved amounts');
    expect(figures[1].textContent).not.toContain('Approved amounts'); // a note is optional
  });

  it('draws the icon tile only when asked, and hides it from screen readers', () => {
    const tile = el(render()).querySelector('section [aria-hidden="true"]');
    expect(tile?.querySelector('svg')).toBeTruthy();

    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Bare);
    f.detectChanges();
    expect(el(f).querySelector('svg')).toBeNull();
    expect(el(f).querySelector('h1')!.textContent).toBe('Validation');
  });

  it('has no empty meta line or figure row when it is given none', () => {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Bare);
    f.detectChanges();
    const meta = el(f).querySelector('p.empty\\:hidden')!;
    expect(meta.children.length).toBe(0);
    expect((meta.textContent ?? '').trim()).toBe('');
  });

  it('tightens its padding when compact', () => {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Host);
    f.componentInstance.compact = true;
    f.detectChanges();
    expect(el(f).querySelector('section')!.className).toContain('py-3.5');
  });
});
