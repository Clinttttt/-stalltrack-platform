import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Municipality } from '../../core/municipality.model';
import { AssessmentService } from '../../core/assessment.service';

/**
 * Faithful Angular port of the React <RequestAssessmentModal>.
 *
 * Public-stage assessment request. Collects who is asking and how to reach them, and nothing else: the requesting office is
 * stated as the municipality's own address, the facilities it covers are stated rather than ticked, and the LGU's authorization
 * status is not asked at all - an office's own endorsement is its credentials, not this platform's business.
 *
 * Official documents and the Mayor's endorsement / signatures are collected later in the secure onboarding workspace, never on
 * this public page (data-privacy + authenticity).
 *
 * Posts to the API. Every field left on the form is a native input, so the browser validates them before submit runs.
 */
@Component({
  selector: 'app-request-assessment-modal',
  standalone: true,
  // No AssessmentSelect any more: the office is stated rather than chosen, and the facilities are stated rather than ticked,
  // so nothing on this form is a custom select.
  templateUrl: './request-assessment-modal.html',
})
export class RequestAssessmentModal {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assessments = inject(AssessmentService);
  private readonly router = inject(Router);

  readonly municipality = input<Municipality | null>(null);
  /** Mirrors the React `onClose` prop. */
  readonly close = output<void>();

  readonly fieldClass =
    'mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-3 font-normal text-navy outline-none transition placeholder:text-muted/70 focus:border-gold focus:ring-2 focus:ring-gold/20';

  readonly confirmationUrl = signal('');
  readonly submitting = signal(false);
  readonly submitError = signal('');

  readonly municipalityName = computed(() => this.municipality()?.name ?? '');

  /**
   * The requesting office, stated as the municipality's own address.
   *
   * The requesting office IS the LGU, so a list of office names it may not use was asking it to classify itself. Set out in
   * the order a government letterhead does: municipality, province, region, island group, country.
   *
   * NO POSTAL CODE, deliberately. It is per-municipality data this registry does not hold, and a wrong code on an official
   * request is worse than an absent one. Add it to the registry per municipality and it can be included here.
   */
  readonly requestingOfficeAddress = computed(() => {
    const name = this.municipalityName().trim();
    if (!name) return 'Municipality, Province of Surigao del Sur, Caraga Region (Region XIII), Mindanao, Philippines';

    return `Municipality of ${name}, Province of Surigao del Sur, Caraga Region (Region XIII), Mindanao, Philippines`;
  });

  readonly subject = computed(() => `StallTrack — ${this.municipality()?.name ?? 'LGU'} Assessment Request`);
  readonly heading = computed(() =>
    this.municipality()?.name ? `Request assessment — ${this.municipality()?.name}` : 'Request LGU Assessment',
  );

  constructor() {
    afterNextRender(() => {
      this.confirmationUrl.set(
        `${window.location.origin}/assessment-received?lgu=${encodeURIComponent(this.municipality()?.name ?? '')}`,
      );

      const previousOverflow = document.body.style.overflow;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.close.emit();
      };
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);

      this.destroyRef.onDestroy(() => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', onKeyDown);
      });
    });
  }

  // Every remaining field is a native input — focal person, position, email, contact, the consent checkbox — so the browser
  // has already validated them by the time this runs. The office is stated rather than chosen, and the facilities are stated
  // rather than ticked, so there is nothing left here to check by hand.
  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.submitting()) return;
    this.submitError.set('');
    this.submitting.set(true);

    const form = event.target as HTMLFormElement;
    const fd = new FormData(form);
    const value = (name: string) => ((fd.get(name) as string) ?? '').trim();

    const result = await this.assessments.submit({
      municipality: this.municipalityName().trim(),
      province: 'Surigao del Sur',
      requestingOffice: this.requestingOfficeAddress(),
      focalPerson: value('Focal person'),
      position: value('Position'),
      officialEmail: value('Official email'),
      contactNumber: value('Contact number'),
      // Not asked at assessment any more, and empty means exactly that rather than "none": the facilities are named,
      // priced and given a collection model at onboarding, where the answer is actually used.
      facilitiesManaged: '',
      approxVendors: null,
      authorizationStatus: null,
      acknowledged: fd.get('Authorization acknowledgement') === 'Confirmed',
      notes: value('Notes') || null,
    });

    this.submitting.set(false);

    if (result.ok) {
      this.close.emit();
      this.router.navigateByUrl(
        `/assessment-received?lgu=${encodeURIComponent(this.municipalityName())}`,
      );
    } else {
      this.submitError.set(result.error);
    }
  }
}
