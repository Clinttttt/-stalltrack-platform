import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OnboardingWorkspace } from './onboarding-workspace';

/**
 * The workspace shows the three sections an office completes before it can submit, as one stepper, from the SAME completion
 * flags the submit rule has always used. Nothing here is a new rule: the tests pin that the display cannot disagree with it.
 */
describe('OnboardingWorkspace — progress and submission', () => {
  function render() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [OnboardingWorkspace] });
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    fixture.detectChanges();
    return fixture;
  }
  const root = (f: { nativeElement: unknown }) => f.nativeElement as HTMLElement;
  const text = (f: { nativeElement: unknown }) => (root(f).textContent ?? '').replace(/\s+/g, ' ');

  it('starts with nothing ready and names the three real sections in page order', () => {
    const f = render();
    const ws = f.componentInstance;

    expect(ws.doneCount()).toBe(0);
    expect(ws.steps().map((s) => s.label)).toEqual(['Head account', 'Branding & receipts', 'Facilities & operations']);
    expect(ws.steps().every((s) => !s.done)).toBe(true);
    expect(text(f)).toContain('0 of 3 sections ready');
  });

  it('marks a section ready from the same flag the submit rule reads, and no other', () => {
    const f = render();
    const ws = f.componentInstance;

    ws.setAdmin('name', 'Ana Cruz');
    ws.setAdmin('email', 'ana@example.test');
    f.detectChanges();

    expect(ws.steps().map((s) => s.done)).toEqual([ws.adminDone(), ws.brandingDone(), ws.facilitiesDone()]);
    expect(ws.steps().map((s) => s.done)).toEqual([true, false, false]);
    expect(ws.doneCount()).toBe(1);
    expect(text(f)).toContain('1 of 3 sections ready');
    expect(ws.missing().map((s) => s.label)).toEqual(['Branding & receipts', 'Facilities & operations']);
  });

  it('says exactly what is still needed, and keeps Submit unavailable until everything is', () => {
    const f = render();
    const submit = Array.from(root(f).querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Submit for validation') as HTMLButtonElement;

    expect(submit.disabled).toBe(true);
    const summary = text(f);
    expect(summary).toContain('Still needed before you can submit');
    for (const label of ['Head account', 'Branding & receipts', 'Facilities & operations']) expect(summary).toContain(label);
  });

  it('refuses to emit a submission while any section is incomplete, even if the handler is called directly', () => {
    const f = render();
    let submitted = 0;
    f.componentInstance.submitDraft.subscribe(() => submitted++);

    f.componentInstance.submit();

    expect(submitted).toBe(0);
  });

  it('keeps the draft intact: saving serialises exactly what was entered', () => {
    const f = render();
    let saved = '';
    f.componentInstance.saveDraft.subscribe((json: string) => (saved = json));
    f.componentInstance.setAdmin('name', 'Ana Cruz');
    f.componentInstance.setBranding('officeName', 'Madrid Economic Enterprise Office');

    f.componentInstance.saveProgress();

    expect(JSON.parse(saved)).toMatchObject({
      administrator: { name: 'Ana Cruz' },
      branding: { officeName: 'Madrid Economic Enterprise Office' },
    });
  });

  it('says what happens after activation once, not under every card', () => {
    const t = text(render());
    expect(t.match(/set up in the Head Portal after activation/g)?.length).toBe(1);
    expect(t).not.toContain('Vendors & daily collections come later');
    expect(t).not.toContain("Your office's own name for this collection");
    expect(t).not.toContain('Your office’s own name for this collection');
  });

  it('keeps each operation selectable by its stable code', () => {
    const f = render();
    const boxes = Array.from(root(f).querySelectorAll('input[type="checkbox"][data-operation]')) as HTMLInputElement[];
    const codes = boxes.map((b) => b.getAttribute('data-operation'));

    expect(codes).toContain('ECF');
    expect(codes).toContain('FISH_MEAT_VENDOR_FEE');
    expect(codes.length).toBe(new Set(codes).size);
  });
});
