import { TestBed } from '@angular/core/testing';
import { UiInfoTip } from './ui-info-tip';

describe('UiInfoTip: the hover-info icon', () => {
  function render() {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(UiInfoTip);
    f.componentRef.setInput('text', 'These become the municipality’s operation list.');
    f.componentRef.setInput('label', 'About declared operations');
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    return {
      f,
      root,
      button: () => root.querySelector('button') as HTMLButtonElement,
      tip: () => root.querySelector('[role="tooltip"]'),
      settle: () => f.detectChanges(),
    };
  }

  it('is closed by default and has an accessible name', () => {
    const t = render();
    expect(t.tip()).toBeNull();
    expect(t.button().getAttribute('aria-label')).toBe('About declared operations');
    expect(t.button().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on hover and closes when the pointer leaves', () => {
    const t = render();
    t.root.dispatchEvent(new Event('mouseenter')); t.settle();
    expect(t.tip()!.textContent).toContain('operation list');
    t.root.dispatchEvent(new Event('mouseleave')); t.settle();
    expect(t.tip()).toBeNull();
  });

  it('opens on keyboard focus and closes on blur, and the button points at the tip', () => {
    const t = render();
    t.button().dispatchEvent(new Event('focus')); t.settle();
    expect(t.tip()).not.toBeNull();
    expect(t.button().getAttribute('aria-describedby')).toBe(t.tip()!.id);
    t.button().dispatchEvent(new Event('blur')); t.settle();
    expect(t.tip()).toBeNull();
    expect(t.button().getAttribute('aria-describedby')).toBeNull();
  });

  it('a tap pins it open and a second tap closes it (touch has no hover)', () => {
    const t = render();
    t.button().click(); t.settle();
    expect(t.tip()).not.toBeNull();
    expect(t.button().getAttribute('aria-expanded')).toBe('true');
    t.button().click(); t.settle();
    expect(t.tip()).toBeNull();
  });

  it('closes on Esc, wherever focus is', () => {
    const t = render();
    t.button().click(); t.settle();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); t.settle();
    expect(t.tip()).toBeNull();
  });

  it('closes on a tap outside it, but not on a tap inside', () => {
    const t = render();
    document.body.appendChild(t.root);
    t.button().click(); t.settle();
    t.button().dispatchEvent(new Event('pointerdown', { bubbles: true })); t.settle();
    expect(t.tip()).not.toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); t.settle();
    expect(t.tip()).toBeNull();
    t.root.remove();
  });

  it('never gets in the way of the page: it does not take pointer events itself', () => {
    const t = render();
    t.button().click(); t.settle();
    expect(t.tip()!.className).toContain('pointer-events-none');
  });
});
