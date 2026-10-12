import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OnboardingWorkspace } from './onboarding-workspace';
import { isEditableOperationsBlock } from './onboarding-operations';

/**
 * A draft saved by a NEWER workspace must survive being opened and saved by this one. A whole operations block this version
 * cannot safely edit (newer version, other shape) is kept byte-for-byte and never downgraded; block-level fields it does not
 * know are written back; and only an explicit, confirmed discard removes anything.
 */
describe('OnboardingWorkspace — operations saved by a newer version', () => {
  function workspace(configJson: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [OnboardingWorkspace] });
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    fixture.componentRef.setInput('configJson', configJson);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const saved = (ws: OnboardingWorkspace) => {
    let json = '';
    const sub = ws.saveDraft.subscribe((j) => (json = j));
    ws.saveProgress();
    sub.unsubscribe();
    return JSON.parse(json);
  };

  const base = {
    facilities: [],
    administrator: { name: 'Ana', position: 'Head', email: 'ana@x.ph' },
    branding: { officeName: 'EEMO' },
  };

  const newer = {
    version: 2,
    items: [{ code: 'WCF', state: 'on', schedule: { every: 'month' } }],
    policy: { mode: 'strict' },
  };

  it('recognises which blocks it can safely edit', () => {
    expect(isEditableOperationsBlock(undefined)).toBe(true);
    expect(isEditableOperationsBlock(null)).toBe(true);
    expect(isEditableOperationsBlock({ version: 1, items: [] })).toBe(true);
    expect(isEditableOperationsBlock({ items: [] })).toBe(true); // versionless
    expect(isEditableOperationsBlock({ version: 2, items: [] })).toBe(false);
    expect(isEditableOperationsBlock({ version: '1', items: [] })).toBe(false);
    expect(isEditableOperationsBlock({ version: 0 })).toBe(false);
    expect(isEditableOperationsBlock({ version: 1, items: {} })).toBe(false);
    expect(isEditableOperationsBlock([])).toBe(false);
    expect(isEditableOperationsBlock('x')).toBe(false);
  });

  it('keeps an unsupported-version block verbatim through a save, a reload and another save — never downgraded', () => {
    const ws = workspace(JSON.stringify({ ...base, operations: newer }));

    expect(ws.lockedOperations()).toEqual(newer);
    expect(ws.lockedOperationsVersion()).toBe('2');
    ws.setAdmin('name', 'Ana Cruz'); // editing another section
    const first = saved(ws);
    expect(first.administrator.name).toBe('Ana Cruz');
    expect(first.operations).toEqual(newer);

    const again = saved(workspace(JSON.stringify(first)));
    expect(again.operations).toEqual(newer);
    expect(again.operations.version).toBe(2);
  });

  it('does not let the selector change a locked block', () => {
    const ws = workspace(JSON.stringify({ ...base, operations: newer }));
    ws.toggleOperation('ECF'); // even if called, the locked block is what is written
    expect(saved(ws).operations).toEqual(newer);
  });

  it('keeps a block of an unexpected shape verbatim', () => {
    for (const odd of ['text', 7, [1, 2], { version: 1, items: 'nope' }]) {
      const ws = workspace(JSON.stringify({ ...base, operations: odd }));
      expect(saved(ws).operations).toEqual(odd);
    }
  });

  it('writes back block-level fields it does not know on a supported version', () => {
    const block = { version: 1, items: [{ operationCode: 'ECF', selected: true }], reviewedBy: 'coordinator', extra: { a: 1 } };
    const ws = workspace(JSON.stringify({ ...base, operations: block }));

    expect(ws.lockedOperations()).toBeNull();
    ws.toggleOperation('WCF');
    const out = saved(ws).operations;
    expect(out.reviewedBy).toBe('coordinator');
    expect(out.extra).toEqual({ a: 1 });
    expect(out.version).toBe(1);
    expect(out.items.map((i: { operationCode: string }) => i.operationCode)).toEqual(['ECF', 'WCF']);
  });

  it('still loads a versionless block and a draft with no block at all', () => {
    const versionless = workspace(JSON.stringify({ ...base, operations: { items: [{ operationCode: 'ECF', selected: true }] } }));
    expect(versionless.isOperationSelected('ECF')).toBe(true);
    expect(saved(versionless).operations.version).toBe(1);

    const none = workspace(JSON.stringify(base));
    expect(none.lockedOperations()).toBeNull();
    expect(saved(none).operations).toEqual({ version: 1, items: [] });
  });

  it('discards only after an explicit confirmation, and the first step changes nothing', () => {
    const ws = workspace(JSON.stringify({ ...base, operations: newer }));

    ws.askDiscardOperations();
    expect(ws.confirmingDiscard()).toBe(true);
    expect(saved(ws).operations).toEqual(newer); // asking is not discarding

    ws.cancelDiscardOperations();
    expect(ws.confirmingDiscard()).toBe(false);
    expect(saved(ws).operations).toEqual(newer);

    ws.askDiscardOperations();
    ws.discardPreservedOperations();
    expect(ws.lockedOperations()).toBeNull();
    expect(saved(ws).operations).toEqual({ version: 1, items: [] });
  });

  it('says unrecognised entries are kept, not deleted, and that saving may be refused — without promising they will be sent', () => {
    workspace('{}');
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    fixture.componentRef.setInput(
      'configJson',
      JSON.stringify({ ...base, operations: { version: 1, items: [{ operationCode: 'FUTURE_FEE', selected: true }] } }),
    );
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/FUTURE_FEE/);
    expect(text).toMatch(/not deleted/);
    expect(text).toMatch(/may be refused/);
    expect(text).not.toMatch(/sent with your submission/);
    expect(text).toMatch(/Discard these saved entries/);
  });

  it('explains plainly that saving or submitting may be refused', () => {
    const ws = workspace(JSON.stringify({ ...base, operations: newer }));
    const fixture = TestBed.createComponent(OnboardingWorkspace);
    fixture.componentRef.setInput('configJson', JSON.stringify({ ...base, operations: newer }));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(ws).toBeTruthy();
    expect(text).toMatch(/newer version of this workspace/);
    expect(text).toMatch(/may be refused/);
    expect(text).toMatch(/nothing is changed or downgraded/);
  });
});
