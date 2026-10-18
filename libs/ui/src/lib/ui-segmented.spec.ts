import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UiSegment, UiSegmented } from './ui-segmented';

const VIEWS: UiSegment[] = [
  { value: 'pending', label: 'Pending', count: 3 },
  { value: 'onboarding', label: 'Onboarding', count: 1 },
  { value: 'declined', label: 'Declined', count: 0 },
];

@Component({
  standalone: true,
  imports: [UiSegmented],
  template: `<ui-segmented [options]="views" [(value)]="view" ariaLabel="Show" [queryParam]="param" />`,
})
class Host {
  views = VIEWS;
  view = signal('pending');
  param = '';
}

describe('UiSegmented: one view at a time', () => {
  async function render(param = '', url = '') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    const router = TestBed.inject(Router);
    if (url) await router.navigateByUrl(url);
    const f = TestBed.createComponent(Host);
    f.componentInstance.param = param;
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const tabs = () => Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    return { f, router, tabs };
  }

  it('is a labelled tablist with the selected tab marked and the others out of the Tab order', async () => {
    const { f, tabs } = await render();
    const list = (f.nativeElement as HTMLElement).querySelector('[role="tablist"]')!;
    expect(list.getAttribute('aria-label')).toBe('Show');
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('shows counts as quiet numerals, including a zero', async () => {
    const { tabs } = await render();
    expect(tabs().map((t) => t.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['Pending 3', 'Onboarding 1', 'Declined 0']);
  });

  it('switches on click and writes the value back to the parent', async () => {
    const { f, tabs } = await render();
    tabs()[1].click();
    f.detectChanges();
    expect(f.componentInstance.view()).toBe('onboarding');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('moves with the arrow keys (wrapping), Home and End', async () => {
    const { f, tabs } = await render();
    const press = (key: string, i: number) => tabs()[i].dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    press('ArrowRight', 0); f.detectChanges();
    expect(f.componentInstance.view()).toBe('onboarding');
    press('End', 1); f.detectChanges();
    expect(f.componentInstance.view()).toBe('declined');
    press('ArrowRight', 2); f.detectChanges();
    expect(f.componentInstance.view()).toBe('pending'); // wraps
    press('ArrowLeft', 0); f.detectChanges();
    expect(f.componentInstance.view()).toBe('declined');
    press('Home', 2); f.detectChanges();
    expect(f.componentInstance.view()).toBe('pending');
  });

  it('ignores keys it does not own', async () => {
    const { f, tabs } = await render();
    const e = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    tabs()[0].dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(f.componentInstance.view()).toBe('pending');
  });

  it('keeps the selection in the URL when a query parameter is named, and reads it back on load', async () => {
    const { f, router, tabs } = await render('view');
    tabs()[2].click();
    f.detectChanges();
    await f.whenStable();
    expect(router.url).toContain('view=declined');

    const loaded = await render('view', '/anywhere?view=onboarding');
    expect(loaded.f.componentInstance.view()).toBe('onboarding');
  });

  it('ignores a URL value that is not one of its options', async () => {
    const { f } = await render('view', '/x?view=nonsense');
    expect(f.componentInstance.view()).toBe('pending');
  });

  it('leaves the URL alone when no query parameter is named', async () => {
    const { f, router, tabs } = await render('');
    tabs()[1].click();
    f.detectChanges();
    await f.whenStable();
    expect(router.url).not.toContain('view=');
  });
});
