import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AssessmentService } from '../../core/assessment.service';
import { OPERATION_CATALOG } from '../onboarding-workspace/onboarding-operations';
import { ASSESSMENT_SCOPE, RequestAssessmentModal } from './request-assessment-modal';

describe('Assessment scope: what an assessment may cover', () => {
  it('is drawn from the platform operation catalog, each operation named once and none invented', () => {
    const covered = ASSESSMENT_SCOPE.flatMap((g) => g.codes);
    const catalog = OPERATION_CATALOG.map((o) => o.code);

    expect(new Set(covered).size).toBe(covered.length); // never listed twice
    for (const code of covered) expect(catalog).toContain(code); // never a name the platform does not have
    expect([...covered].sort()).toEqual([...catalog].sort()); // and nothing the catalog offers is left out
  });

  it('is four short groups, not a long checklist', () => {
    expect(ASSESSMENT_SCOPE.map((g) => g.title)).toEqual([
      'Markets & vendors',
      'Spaces & rentals',
      'Utilities & services',
      'Facilities & transport',
    ]);
  });

  it('uses the catalog wording, so a renamed operation cannot leave this list behind', () => {
    const text = ASSESSMENT_SCOPE.map((g) => g.items).join(' · ');
    for (const o of OPERATION_CATALOG) expect(text).toContain(o.label);
  });
});

describe('RequestAssessmentModal', () => {
  function render() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RequestAssessmentModal],
      providers: [provideRouter([]), provideHttpClient()],
    });
    const fixture = TestBed.createComponent(RequestAssessmentModal);
    fixture.componentRef.setInput('municipality', { code: 'madrid', name: 'Madrid', status: 'Active', active: true, href: '', image: '' });
    fixture.detectChanges();
    return fixture;
  }
  const el = (f: { nativeElement: unknown }) => f.nativeElement as HTMLElement;

  it('names the municipality and states the requesting office', () => {
    const text = el(render()).textContent ?? '';
    expect(text).toContain('Request assessment — Madrid');
    expect(text).toContain('Municipality of Madrid, Province of Surigao del Sur');
  });

  it('keeps every required field and both declarations, with their wording intact', () => {
    const root = el(render());
    for (const name of ['Focal person', 'Position', 'Official email', 'Contact number']) {
      expect(root.querySelector(`[name="${name}"]`)?.hasAttribute('required'), name).toBe(true);
    }
    expect(root.querySelector('[name="Authorization acknowledgement"]')?.hasAttribute('required')).toBe(true);
    expect(root.querySelector('[name="Data privacy consent"]')?.hasAttribute('required')).toBe(true);
    expect(root.querySelector('[name="Notes"]')?.hasAttribute('required')).toBe(false);

    const text = (root.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('I confirm this request is made on behalf of the LGU, and that formal authorization and signed documents will be provided during the secure onboarding step.');
    expect(text).toContain('I consent to StallTrack processing these details to respond to this request, in accordance with the Data Privacy Act of 2012 (RA 10173) and the Privacy Policy.');
  });

  it('says plainly that a request activates nothing', () => {
    const text = (el(render()).textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('a request activates nothing');
    expect(text).not.toMatch(/guarantee|automatic(ally)? activat|instantly/i);
  });

  it('has one close control (no redundant Cancel) and one primary action', () => {
    const buttons = Array.from(el(render()).querySelectorAll('button')).map((b) => b.getAttribute('aria-label') || b.textContent?.trim());
    expect(buttons).toContain('Close assessment request form');
    expect(buttons).toContain('Submit Assessment Request');
    expect(buttons).not.toContain('Cancel');
  });

  it('closes on the close button', () => {
    const f = render();
    let closed = 0;
    f.componentInstance.close.subscribe(() => closed++);
    (el(f).querySelector('[aria-label="Close assessment request form"]') as HTMLButtonElement).click();
    expect(closed).toBe(1);
  });

  it('submits the form values to the assessment API and shows the server refusal when it refuses', async () => {
    const f = render();
    const submit = vi.spyOn(TestBed.inject(AssessmentService), 'submit').mockResolvedValue({ ok: false, error: 'Too many requests. Please wait a moment and try again.' });
    const root = el(f);
    const set = (name: string, value: string) => ((root.querySelector(`[name="${name}"]`) as HTMLInputElement).value = value);
    set('Focal person', 'Ana Cruz'); set('Position', 'Administrator'); set('Official email', 'ana@example.test'); set('Contact number', '0917 123 4567');
    (root.querySelector('[name="Authorization acknowledgement"]') as HTMLInputElement).checked = true;
    (root.querySelector('[name="Data privacy consent"]') as HTMLInputElement).checked = true;

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(submit).toHaveBeenCalled());
    f.detectChanges();

    const payload = submit.mock.calls[0][0];
    expect(payload).toMatchObject({ municipality: 'Madrid', focalPerson: 'Ana Cruz', officialEmail: 'ana@example.test', acknowledged: true });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Too many requests');
  });
});
