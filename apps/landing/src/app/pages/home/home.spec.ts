import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  function render(): HTMLElement {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('has exactly one h1 and one main landmark', () => {
    const el = render();
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelectorAll('main')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toContain('Municipal enterprise collections, organized.');
  });

  it('sends every assessment call to action into the municipality selector', () => {
    const el = render();
    const ctas = Array.from(el.querySelectorAll('a')).filter((a) => a.textContent?.trim() === 'Request an assessment');
    expect(ctas.length).toBeGreaterThanOrEqual(3); // header, hero, closing band
    for (const a of ctas) expect(a.getAttribute('href')).toBe('/municipalities');
  });

  it('never links to a section that is not on the page', () => {
    const el = render();
    const anchors = Array.from(el.querySelectorAll('a[href^="#"], a[href^="/#"]'))
      .map((a) => (a.getAttribute('href') ?? '').replace('/', ''))
      .filter((h) => h.length > 1 && h !== '#main');
    expect(anchors.length).toBeGreaterThan(0);
    for (const h of anchors) expect(el.querySelector(h), h).not.toBeNull();
  });

  it('carries no invented figures, sample data or endorsements', () => {
    const text = render().textContent ?? '';
    expect(text).not.toMatch(/₱|\d+\s?%/);
    expect(text).not.toMatch(/\bSample\b|testimonial/i);
  });

  it('describes activation as reviewed, not automatic', () => {
    expect(render().textContent).toContain('does not create an account or activate anything on its own');
  });
});
