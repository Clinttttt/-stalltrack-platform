import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UiBreadcrumb } from './ui-breadcrumb';
import { UiEmptyState } from './ui-empty-state';
import { UiSkeleton } from './ui-skeleton';

describe('UiSkeleton', () => {
  function render(inputs: Record<string, unknown>) {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(UiSkeleton);
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('announces Loading once, politely, instead of bare text', () => {
    const el = render({ variant: 'table' });
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.querySelector('.sr-only')!.textContent).toBe('Loading');
    expect(el.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('draws the number of rows asked for', () => {
    expect(render({ variant: 'table', rows: 5 }).querySelectorAll('.border-b.last\\:border-b-0').length).toBe(5);
    expect(render({ variant: 'list', rows: 3 }).querySelectorAll('.rounded-lg.border').length).toBe(3);
    expect(render({ variant: 'cards', rows: 6 }).querySelectorAll('.rounded-xl.border').length).toBe(6);
    expect(render({ variant: 'lines', rows: 4 }).querySelectorAll('span.h-3').length).toBe(4);
  });

  it('shimmers, and stops shimmering for people who ask for less motion', () => {
    const block = render({ variant: 'bar' }).querySelector('span[aria-hidden="true"]')!;
    expect(block.className).toContain('animate-ui-shimmer');
    expect(block.className).toContain('motion-reduce:animate-none');
  });

  it('has a hero shape that matches the real hero band', () => {
    const el = render({ variant: 'hero' });
    expect(el.querySelector('div')!.className).toContain('bg-civic-panel');
    expect(el.querySelector('div')!.className).toContain('rounded-xl');
  });
});

@Component({
  standalone: true,
  imports: [UiBreadcrumb],
  template: `<ui-breadcrumb [items]="items" />`,
})
class CrumbHost {
  items = [{ label: 'Onboarding', link: '/onboarding' }, { label: 'Validation', link: '/validation' }, { label: 'Madrid' }];
}

describe('UiBreadcrumb', () => {
  it('links the trail, marks the last item as the current page, and is not itself a link', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const f = TestBed.createComponent(CrumbHost);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('nav')!.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(['/onboarding', '/validation']);
    const current = root.querySelector('[aria-current="page"]')!;
    expect(current.textContent).toBe('Madrid');
    expect(current.tagName).toBe('SPAN');
    expect(root.querySelectorAll('li').length).toBe(3);
  });
});

@Component({
  standalone: true,
  imports: [UiEmptyState],
  template: `<ui-empty-state icon="inbox" text="No requests in this view."><button type="button">Refresh</button></ui-empty-state>`,
})
class EmptyHost {}

describe('UiEmptyState', () => {
  it('is one icon, one line and one projected action', () => {
    TestBed.resetTestingModule();
    const f = TestBed.createComponent(EmptyHost);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('svg')).toBeTruthy();
    expect(root.textContent).toContain('No requests in this view.');
    expect(root.querySelector('button')!.textContent).toBe('Refresh');
    expect(root.querySelectorAll('p').length).toBe(1);
  });
});
