import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiSelect } from './ui-select';

@Component({
  standalone: true,
  imports: [UiSelect],
  template: `<ui-select [options]="options" [(value)]="value" caption="Month" ariaLabel="Month" placeholder="Pick a month" />`,
})
class Host {
  options = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
  ];
  value = signal('');
}

describe('UiSelect: the house dropdown', () => {
  function render(initial = '') {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(Host);
    f.componentInstance.value.set(initial);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    return {
      f,
      root,
      trigger: () => root.querySelector('button[role="combobox"]') as HTMLButtonElement,
      menu: () => root.querySelector('[role="listbox"]'),
      options: () => Array.from(root.querySelectorAll<HTMLElement>('[role="option"]')),
      key: (key: string) => {
        const e = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
        (root.querySelector('button[role="combobox"]') as HTMLButtonElement).dispatchEvent(e);
        f.detectChanges();
        return e;
      },
    };
  }

  it('is a labelled combobox that shows the caption and the placeholder until something is chosen', () => {
    const s = render();
    expect(s.trigger().getAttribute('aria-label')).toBe('Month');
    expect(s.trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(s.trigger().getAttribute('aria-expanded')).toBe('false');
    expect(s.root.textContent).toContain('Month');
    expect(s.root.textContent).toContain('Pick a month');
    expect(s.menu()).toBeNull();
  });

  it('shows the label of the current value, not its code', () => {
    expect(render('3').root.textContent).toContain('March');
  });

  it('opens on click as a listbox with the current value checked, and animates in', () => {
    const s = render('2');
    s.trigger().click(); s.f.detectChanges();
    expect(s.menu()).not.toBeNull();
    expect(s.menu()!.className).toContain('animate-ui-pop');
    expect(s.trigger().getAttribute('aria-expanded')).toBe('true');
    expect(s.options().map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false', 'false']);
    expect(s.options()[1].querySelector('svg')).toBeTruthy(); // the check
    expect(s.options()[0].querySelector('svg')).toBeNull();
  });

  it('chooses by click, writes the value back and closes', () => {
    const s = render();
    s.trigger().click(); s.f.detectChanges();
    s.options()[3].click(); s.f.detectChanges();
    expect(s.f.componentInstance.value()).toBe('4');
    expect(s.menu()).toBeNull();
    expect(s.root.textContent).toContain('April');
  });

  it('opens with the arrow keys, moves the active option, and chooses with Enter', () => {
    const s = render('1');
    s.key('ArrowDown'); // opens, active = current value
    expect(s.menu()).not.toBeNull();
    s.key('ArrowDown');
    s.key('ArrowDown');
    expect(s.trigger().getAttribute('aria-activedescendant')).toBe(s.options()[2].id);
    s.key('Enter');
    expect(s.f.componentInstance.value()).toBe('3');
    expect(s.menu()).toBeNull();
  });

  it('stops at the ends, and Home / End jump', () => {
    const s = render('1');
    s.key('ArrowUp');
    s.key('ArrowUp');
    expect(s.trigger().getAttribute('aria-activedescendant')).toBe(s.options()[0].id);
    s.key('End');
    expect(s.trigger().getAttribute('aria-activedescendant')).toBe(s.options()[4].id);
    s.key('Home');
    expect(s.trigger().getAttribute('aria-activedescendant')).toBe(s.options()[0].id);
  });

  it('closes on Esc without changing the value, and keeps focus on the trigger', () => {
    const s = render('2');
    document.body.appendChild(s.root);
    s.trigger().click(); s.f.detectChanges();
    s.key('ArrowDown');
    s.key('Escape');
    expect(s.menu()).toBeNull();
    expect(s.f.componentInstance.value()).toBe('2');
    expect(document.activeElement).toBe(s.trigger());
    s.root.remove();
  });

  it('jumps to an option by typing its first letters', () => {
    const s = render();
    s.key('m'); // May / March: first match is March
    expect(s.menu()).not.toBeNull();
    expect(s.trigger().getAttribute('aria-activedescendant')).toBe(s.options()[2].id);
    s.key('a'); s.key('y'); // "may"
    expect(s.trigger().getAttribute('aria-activedescendant')).toBe(s.options()[4].id);
  });

  it('closes on a tap outside, not inside', () => {
    const s = render();
    document.body.appendChild(s.root);
    s.trigger().click(); s.f.detectChanges();
    s.trigger().dispatchEvent(new Event('pointerdown', { bubbles: true })); s.f.detectChanges();
    expect(s.menu()).not.toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); s.f.detectChanges();
    expect(s.menu()).toBeNull();
    s.root.remove();
  });

  it('scrolls the active option into view when it opens and as the arrows move', async () => {
    const seen: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) { seen.push(this.textContent!.trim()); };
    try {
      const s = render('5');
      s.trigger().click(); s.f.detectChanges();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      expect(seen).toContain('May');
      s.key('ArrowUp');
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      expect(seen).toContain('April');
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('takes plain strings as options too', () => {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(UiSelect);
    f.componentRef.setInput('options', ['Alpha', 'Beta']);
    f.componentRef.setInput('value', 'Beta');
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Beta');
  });
});
